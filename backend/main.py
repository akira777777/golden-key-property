"""Property-listing API.

This service is an informational catalogue and inquiry intake only. It does
not accept funds, custody assets, promise returns, process withdrawals, or
perform identity verification.
"""

import hashlib
import html
import hmac
import json
import logging
import math
import os
import re
import sqlite3
from urllib.parse import urlencode
from collections.abc import Generator
from contextlib import contextmanager
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from typing import Any

import httpx
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.resolve()))

from database import (
    all_areas_with_stats,
    all_public_listings,
    area_with_listings,
    bootstrap_admin_users,
    consume_rate_limit,
    create_inquiry as persist_inquiry,
    database_ready,
    initialize_database as initialize_durable_database,
    list_catalogue,
    listing_by_id,
    listing_by_slug,
    public_media_for_listing,
    serialize_listing as serialize_durable_listing,
    similar_listings,
)
from admin import router as admin_router
from integrations import deliver_inquiry

logger = logging.getLogger("golden_key")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)


app = FastAPI(
    title="Golden Key Property Listings API",
    version="1.0.0",
    description=(
        "Informational real-estate listings and viewing inquiries. "
        "No payments, investment products, or financial returns are offered."
    ),
    docs_url=None,
    redoc_url=None,
)

configured_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins or [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


# ---------------------------------------------------------------------------
#  Durable privacy-preserving inquiry rate limiter.
# ---------------------------------------------------------------------------
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX", "5"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
ADMIN_LOGIN_RATE_LIMIT_MAX = int(os.getenv("ADMIN_LOGIN_RATE_LIMIT_MAX", "8"))
ADMIN_LOGIN_RATE_LIMIT_WINDOW = int(os.getenv("ADMIN_LOGIN_RATE_LIMIT_WINDOW", "900"))
_configured_rate_limit_secret = os.getenv("RATE_LIMIT_SECRET", "").strip() or os.getenv("SESSION_SECRET", "").strip()
RATE_LIMIT_SECRET = _configured_rate_limit_secret or "local-development-rate-limit-secret"

if os.getenv("SENTRY_DSN", "").strip():
    import sentry_sdk

    sentry_sdk.init(
        dsn=os.environ["SENTRY_DSN"],
        environment=os.getenv("ENVIRONMENT", "development"),
        send_default_pii=False,
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.05")),
    )


def _is_rate_limited(
    client_ip: str,
    *,
    route: str = "/api/inquiries",
    maximum: int = RATE_LIMIT_MAX_REQUESTS,
    window_seconds: int = RATE_LIMIT_WINDOW_SECONDS,
) -> bool:
    """Consume the request budget without persisting the raw client address."""
    client_hash = hmac.new(RATE_LIMIT_SECRET.encode("utf-8"), client_ip.encode("utf-8"), hashlib.sha256).hexdigest()
    return consume_rate_limit(
        client_hash=client_hash,
        route=route,
        maximum=maximum,
        window_seconds=window_seconds,
    )


def apply_security_headers(response: Any) -> Any:
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' data: https://challenges.cloudflare.com; "
        "script-src 'self' https://unpkg.com https://challenges.cloudflare.com; "
        "style-src 'self'; "
        "font-src 'self'; "
        "connect-src 'self' https://challenges.cloudflare.com; "
        "frame-src https://challenges.cloudflare.com; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none'"
    )
    response.headers["Permissions-Policy"] = "camera=(), geolocation=(), microphone=()"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response


@app.middleware("http")
async def add_security_headers(request: Request, call_next: Any) -> Any:
    limited_routes = {
        "/api/inquiries": (RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS),
        "/admin/login": (ADMIN_LOGIN_RATE_LIMIT_MAX, ADMIN_LOGIN_RATE_LIMIT_WINDOW),
    }
    if request.method == "POST" and request.url.path in limited_routes:
        client_ip = request.client.host if request.client else "unknown"
        maximum, window_seconds = limited_routes[request.url.path]
        if _is_rate_limited(client_ip, route=request.url.path, maximum=maximum, window_seconds=window_seconds):
            client_hash = hmac.new(RATE_LIMIT_SECRET.encode("utf-8"), client_ip.encode("utf-8"), hashlib.sha256).hexdigest()
            logger.warning("rate_limit_exceeded client_hash=%s path=%s", client_hash[:12], request.url.path)
            message = "Too many requests. Please try again later."
            return apply_security_headers(
                error_response(
                    429,
                    "RATE_LIMITED",
                    message,
                )
            )

    response = await call_next(request)
    return apply_security_headers(response)


DB_PATH = Path(os.getenv("PROPERTY_LISTINGS_DB_PATH", "property_listings.db"))
STATIC_DIR = Path(__file__).parent / "static"
TEMPLATES_DIR = Path(__file__).parent / "templates"
SITE_URL = os.getenv("SITE_URL", "http://127.0.0.1:8000").rstrip("/")
templates = Jinja2Templates(directory=TEMPLATES_DIR)
templates.env.filters["currency"] = lambda value: f"${float(value):,.0f}" if value is not None else "—"
templates.env.filters["number"] = lambda value: f"{float(value):,.0f}" if value is not None else "—"
templates.env.filters["urlencode"] = lambda value: urlencode({"district": value}).split("=", 1)[1]
LEGAL_NOTICE = (
    "Listing information is illustrative and subject to agent and owner verification. "
    "It is not an offer, investment advice, or a binding contract."
)


def _validate_production_environment() -> None:
    if os.getenv("NOW_REGION") == "dev1":
        return
    if os.getenv("ENVIRONMENT", "").lower() != "production" and not os.getenv("VERCEL"):
        return
    missing: list[str] = []
    if len(_configured_rate_limit_secret) < 32:
        missing.append("RATE_LIMIT_SECRET (or SESSION_SECRET) with at least 32 characters")
    if not SITE_URL.startswith("https://"):
        missing.append("SITE_URL using https://")
    if not os.getenv("ADMIN_EMAIL", "").strip() or not os.getenv("ADMIN_PASSWORD_HASH", "").strip():
        missing.append("ADMIN_EMAIL and ADMIN_PASSWORD_HASH")
    turnstile_site = os.getenv("TURNSTILE_SITE_KEY", "").strip()
    turnstile_secret = os.getenv("TURNSTILE_SECRET_KEY", "").strip()
    if not turnstile_site or not turnstile_secret:
        missing.append("TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY")
    crm_url = os.getenv("CRM_WEBHOOK_URL", "").strip()
    email_delivery = os.getenv("SMTP_URL", "").strip() and os.getenv("LEAD_FALLBACK_EMAIL", "").strip()
    if not crm_url and not email_delivery:
        missing.append("CRM_WEBHOOK_URL or SMTP_URL plus LEAD_FALLBACK_EMAIL")
    if crm_url and not os.getenv("CRM_WEBHOOK_SECRET", "").strip():
        missing.append("CRM_WEBHOOK_SECRET")
    if missing:
        raise RuntimeError("Production configuration is incomplete: " + "; ".join(missing))


class ListingStatus(StrEnum):
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"
    SOLD = "SOLD"


class TourType(StrEnum):
    NONE = "NONE"
    PHOTO_360 = "PHOTO_360"
    MODEL_3D = "MODEL_3D"
    VIDEO_3D = "VIDEO_3D"


class InquiryCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)

    property_id: int = Field(alias="propertyId", ge=1)
    full_name: str = Field(alias="fullName", min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)
    message: str = Field(min_length=10, max_length=2_000)
    purpose: str = Field(default="PERSONAL_USE", pattern="^(PERSONAL_USE|INVESTMENT|RELOCATION|OTHER)$")
    budget_usd: float | None = Field(default=None, alias="budgetUsd", ge=0)
    preferred_channel: str = Field(default="EMAIL", alias="preferredChannel", pattern="^(EMAIL|PHONE|WHATSAPP|TELEGRAM)$")
    consent_to_contact: bool = Field(alias="consentToContact")
    consent_privacy: bool = Field(alias="consentPrivacy")
    consent_marketing: bool = Field(default=False, alias="consentMarketing")
    website: str = Field(default="", max_length=120)
    turnstile_token: str | None = Field(default=None, alias="turnstileToken", max_length=2_048)
    locale: str = Field(default="en", pattern="^(ru|en|de|es)$")

    @field_validator("full_name", "message", mode="before")
    @classmethod
    def sanitize_text(cls, value: str) -> str:
        """Strip HTML/script tags to prevent stored XSS."""
        if not isinstance(value, str):
            return value
        cleaned = re.sub(r"<(script|style)\b[^>]*>.*?</\1>", "", value, flags=re.IGNORECASE | re.DOTALL)
        cleaned = re.sub(r"<[^>]*>", "", cleaned)
        return html.unescape(cleaned).strip()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not re.fullmatch(r"[0-9+(). -]{7,32}", value):
            raise ValueError("Phone must contain only standard phone characters.")
        return value

    @field_validator("consent_to_contact", "consent_privacy")
    @classmethod
    def require_contact_consent(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Required consent is missing.")
        return value


async def _verify_turnstile(token: str | None, remote_ip: str | None) -> bool:
    """Verify Cloudflare Turnstile only when production credentials are configured."""
    secret = os.getenv("TURNSTILE_SECRET_KEY", "").strip()
    if not secret:
        return True
    if not token:
        return False
    try:
        async with httpx.AsyncClient(timeout=6) as client:
            response = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={"secret": secret, "response": token, "remoteip": remote_ip or ""},
            )
            response.raise_for_status()
            result = response.json()
    except (httpx.HTTPError, ValueError):
        logger.warning("turnstile_verification status=ERROR")
        return False
    return result.get("success") is True


def error_response(status_code: int, code: str, message: str, details: Any = None) -> JSONResponse:
    error: dict[str, Any] = {"code": code, "message": message}
    if details:
        error["details"] = details
    return JSONResponse(status_code=status_code, content={"error": error})


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    fields = []
    for issue in exc.errors():
        location = ".".join(str(part) for part in issue["loc"] if part != "body")
        fields.append({"field": location or "request", "message": issue["msg"]})
    return error_response(422, "VALIDATION_ERROR", "Invalid request data.", fields)


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(request: Request, exc: StarletteHTTPException) -> Any:
    if exc.status_code == 404:
        path = request.url.path
        # Serve the branded 404 page for SPA/document paths, JSON for API/static.
        if not (path.startswith("/api/") or path.startswith("/static/")):
            not_found_page = STATIC_DIR / "404.html"
            if not_found_page.exists():
                return apply_security_headers(
                    FileResponse(not_found_page, status_code=404)
                )
        return error_response(404, "NOT_FOUND", "The requested resource was not found.")
    if exc.status_code == 405:
        return error_response(405, "METHOD_NOT_ALLOWED", "The HTTP method is not allowed for this resource.")
    if exc.status_code == 422:
        return error_response(422, "VALIDATION_ERROR", str(exc.detail))
    return error_response(exc.status_code, "REQUEST_ERROR", str(exc.detail))


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> Any:
    logger.error("unhandled_error path=%s error_type=%s", request.url.path, type(exc).__name__)
    if not request.url.path.startswith(("/api/", "/static/")):
        internal_error_page = STATIC_DIR / "500.html"
        if internal_error_page.exists():
            return apply_security_headers(FileResponse(internal_error_page, status_code=500))
    return apply_security_headers(error_response(500, "INTERNAL_ERROR", "An unexpected error occurred."))


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def db_session() -> Generator[sqlite3.Connection, None, None]:
    """Yield a DB connection and guarantee it is closed on exit."""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def initialize_database() -> None:
    """Create the legal catalogue schema without deleting any existing data."""
    connection = get_connection()
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS listings (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            location TEXT NOT NULL,
            asking_price_usd REAL NOT NULL CHECK (asking_price_usd > 0),
            description TEXT NOT NULL,
            image_url TEXT,
            bedrooms INTEGER CHECK (bedrooms >= 0),
            bathrooms REAL CHECK (bathrooms >= 0),
            area_sq_m REAL CHECK (area_sq_m > 0),
            listing_status TEXT NOT NULL CHECK (listing_status IN ('ACTIVE', 'PENDING', 'SOLD')),
            tour_type TEXT NOT NULL DEFAULT 'NONE' CHECK (tour_type IN ('NONE', 'PHOTO_360', 'MODEL_3D', 'VIDEO_3D')),
            tour_url TEXT,
            images TEXT DEFAULT '[]',
            latitude REAL,
            longitude REAL,
            year_built INTEGER CHECK (year_built > 1800 AND year_built < 2100),
            parking INTEGER CHECK (parking >= 0),
            features TEXT DEFAULT '[]',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS inquiries (
            id INTEGER PRIMARY KEY,
            property_id INTEGER NOT NULL REFERENCES listings(id),
            full_name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            message TEXT NOT NULL,
            consent_to_contact INTEGER NOT NULL CHECK (consent_to_contact IN (0, 1)),
            created_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'CONTACTED', 'CLOSED'))
        );
        """
    )

    listing_count = connection.execute("SELECT COUNT(*) FROM listings").fetchone()[0]
    if listing_count == 0:
        created_at = datetime.now(UTC).isoformat(timespec="seconds")
        listings = [
            (
                1,
                "Burj Khalifa Penthouse",
                "Downtown Dubai, UAE",
                4_800_000,
                "Three-bedroom penthouse on a high floor of the Burj Khalifa Residence with skyline and fountain views, full-height glazing, and dedicated concierge service.",
                None,
                3,
                3.5,
                240,
                ListingStatus.ACTIVE.value,
                TourType.MODEL_3D.value,
                "/static/models/burj-penthouse.glb",
                created_at,
            ),
            (
                2,
                "Frond Villa, Palm Jumeirah",
                "Palm Jumeirah, UAE",
                12_500_000,
                "Six-bedroom signature villa on a Palm Jumeirah frond with a private beach, infinity pool, and deep-water berth.",
                None,
                6,
                7.0,
                920,
                ListingStatus.ACTIVE.value,
                TourType.MODEL_3D.value,
                "/static/models/palm-villa.glb",
                created_at,
            ),
            (
                3,
                "Marina Tower Residence",
                "Dubai Marina, UAE",
                1_250_000,
                "Four-bedroom waterfront residence with a private terrace and a full-service building concierge.",
                None,
                4,
                3.5,
                260,
                ListingStatus.ACTIVE.value,
                TourType.MODEL_3D.value,
                "/static/models/marina-tower.glb",
                created_at,
            ),
            (
                4,
                "Dubai Hills Estate Townhouse",
                "Dubai Hills Estate, UAE",
                2_100_000,
                "Four-bedroom townhouse in a gated community with a private garden, covered parking, and direct access to the championship golf course.",
                None,
                4,
                4.5,
                305,
                ListingStatus.ACTIVE.value,
                TourType.MODEL_3D.value,
                "/static/models/coastal-villa.glb",
                created_at,
            ),
            (
                5,
                "DIFC Gate Duplex",
                "DIFC, UAE",
                3_400_000,
                "Three-bedroom duplex in the DIFC Gate Village with a private lift, double-height living room, and views over the financial district skyline.",
                None,
                3,
                3.0,
                215,
                ListingStatus.ACTIVE.value,
                TourType.MODEL_3D.value,
                "/static/models/harbour-penthouse.glb",
                created_at,
            ),
            (
                6,
                "Jumeirah Bay Island Beachfront Villa",
                "Jumeirah Bay Island, UAE",
                18_000_000,
                "Seven-bedroom beachfront villa on a private island peninsula with a 30-metre pool, private jetty, and direct access to the Gulf.",
                None,
                7,
                8.0,
                1_240,
                ListingStatus.PENDING.value,
                TourType.MODEL_3D.value,
                "/static/models/palm-villa.glb",
                created_at,
            ),
        ]
        connection.executemany(
            """
            INSERT INTO listings (
                id, title, location, asking_price_usd, description, image_url,
                bedrooms, bathrooms, area_sq_m, listing_status, tour_type, tour_url, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            listings,
        )
    connection.commit()
    connection.close()


def _safe_json_list(value: Any) -> list:
    """Parse a JSON string column into a list, returning [] on any error."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (ValueError, TypeError):
        return []


def serialize_listing(row: sqlite3.Row) -> dict[str, Any]:
    images = _safe_json_list(row["images"] if "images" in row.keys() else None)
    image_url = row["image_url"] or (images[0] if images else None)
    return {
        "id": row["id"],
        "title": row["title"],
        "location": row["location"],
        "askingPriceUsd": row["asking_price_usd"],
        "description": row["description"],
        "imageUrl": image_url,
        "bedrooms": row["bedrooms"],
        "bathrooms": row["bathrooms"],
        "areaSqM": row["area_sq_m"],
        "listingStatus": row["listing_status"],
        "tourType": row["tour_type"],
        "tourUrl": row["tour_url"],
        "images": images,
        "latitude": row["latitude"] if "latitude" in row.keys() else None,
        "longitude": row["longitude"] if "longitude" in row.keys() else None,
        "yearBuilt": row["year_built"] if "year_built" in row.keys() else None,
        "parking": row["parking"] if "parking" in row.keys() else None,
        "features": _safe_json_list(row["features"] if "features" in row.keys() else None),
    }


def alter_table_add_tour_columns():
    """Add tour and visual columns to existing databases created before the schema change."""
    import json as _json

    connection = get_connection()
    columns = [row[1] for row in connection.execute("PRAGMA table_info(listings)").fetchall()]

    def _add_if_missing(col: str, ddl: str) -> None:
        if col not in columns:
            connection.execute(ddl)

    _add_if_missing("tour_type",
        "ALTER TABLE listings ADD COLUMN tour_type TEXT NOT NULL DEFAULT 'NONE' "
        "CHECK (tour_type IN ('NONE', 'PHOTO_360', 'MODEL_3D', 'VIDEO_3D'))")
    _add_if_missing("tour_url",
        "ALTER TABLE listings ADD COLUMN tour_url TEXT")
    _add_if_missing("images",
        "ALTER TABLE listings ADD COLUMN images TEXT DEFAULT '[]'")
    _add_if_missing("latitude",
        "ALTER TABLE listings ADD COLUMN latitude REAL")
    _add_if_missing("longitude",
        "ALTER TABLE listings ADD COLUMN longitude REAL")
    _add_if_missing("year_built",
        "ALTER TABLE listings ADD COLUMN year_built INTEGER")
    _add_if_missing("parking",
        "ALTER TABLE listings ADD COLUMN parking INTEGER")
    _add_if_missing("features",
        "ALTER TABLE listings ADD COLUMN features TEXT DEFAULT '[]'")

    # Seed images + coordinates for existing listings (idempotent — only if images is '[]').
    seed = {
        1: {
            "images": _json.dumps([
                "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80",
                "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=1200&q=80",
                "https://images.unsplash.com/photo-1546412414-e1885259563a?w=1200&q=80",
                "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=1200&q=80",
            ]),
            "latitude": 25.1972, "longitude": 55.2744,
            "year_built": 2018, "parking": 2,
            "features": _json.dumps(["Fountain View", "Skyline View", "Concierge", "Gym", "Valet"]),
        },
        2: {
            "images": _json.dumps([
                "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80",
                "https://images.unsplash.com/photo-1600596542815-ffad4c153859?w=1200&q=80",
                "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80",
                "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&q=80",
                "https://images.unsplash.com/photo-160085154340-be6161a56a0c?w=1200&q=80",
            ]),
            "latitude": 25.1124, "longitude": 55.1390,
            "year_built": 2020, "parking": 4,
            "features": _json.dumps(["Private Beach", "Infinity Pool", "Deep-Water Berth", "Cinema", "Maid Room"]),
        },
        3: {
            "images": _json.dumps([
                "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80",
                "https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=1200&q=80",
                "https://images.unsplash.com/photo-1600566753376-12c8ab7a5a32?w=1200&q=80",
                "https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=1200&q=80",
            ]),
            "latitude": 25.0801, "longitude": 55.1346,
            "year_built": 2021, "parking": 2,
            "features": _json.dumps(["Marina View", "Concierge", "Private Terrace", "Gym", "Smart Home"]),
        },
        4: {
            "images": _json.dumps([
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
                "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=80",
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80",
                "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=1200&q=80",
            ]),
            "latitude": 25.0438, "longitude": 55.2367,
            "year_built": 2022, "parking": 2,
            "features": _json.dumps(["Golf View", "Private Garden", "Gated Community", "Family Room"]),
        },
        5: {
            "images": _json.dumps([
                "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80",
                "https://images.unsplash.com/photo-1600573472591-ee6b6178f73d?w=1200&q=80",
                "https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1200&q=80",
                "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=1200&q=80",
            ]),
            "latitude": 25.2138, "longitude": 55.2802,
            "year_built": 2023, "parking": 2,
            "features": _json.dumps(["Skyline View", "Private Lift", "Double-Height Living", "Concierge"]),
        },
        6: {
            "images": _json.dumps([
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
                "https://images.unsplash.com/photo-1600596542815-ffad4c153859?w=1200&q=80",
                "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=80",
                "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&q=80",
            ]),
            "latitude": 25.2265, "longitude": 55.2340,
            "year_built": 2024, "parking": 6,
            "features": _json.dumps(["Private Beach", "30m Pool", "Private Jetty", "Wine Cellar", "Staff Quarters", "Smart Home"]),
        },
    }
    for lid, data in seed.items():
        existing = connection.execute(
            "SELECT images FROM listings WHERE id = ?", (lid,)
        ).fetchone()
        if existing and (existing[0] in (None, "", "[]")):
            connection.execute(
                """UPDATE listings SET images=?, latitude=?, longitude=?,
                   year_built=?, parking=?, features=?
                   WHERE id=?""",
                (data["images"], data["latitude"], data["longitude"],
                 data["year_built"], data["parking"], data["features"], lid),
            )
    connection.commit()
    connection.close()


_validate_production_environment()
initialize_durable_database()
bootstrap_admin_users()
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.include_router(admin_router)


@app.get("/", include_in_schema=False)
async def landing_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/manifest.webmanifest", include_in_schema=False)
async def web_manifest() -> FileResponse:
    """Serve the PWA web manifest with the correct media type."""
    return FileResponse(
        STATIC_DIR / "manifest.webmanifest",
        media_type="application/manifest+json",
    )


@app.get("/robots.txt", include_in_schema=False)
async def robots_txt() -> Response:
    body = f"User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: {SITE_URL}/sitemap.xml\n"
    return Response(body, media_type="text/plain")


@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml() -> Response:
    static_paths = ["/", "/properties", "/areas", "/why-dubai", "/privacy", "/cookies", "/terms", "/docs"]
    property_paths = [f"/properties/{row._mapping['slug']}" for row in all_public_listings()]
    area_paths = [f"/areas/{area['slug']}" for area in all_areas_with_stats()]
    urls = "".join(f"<url><loc>{SITE_URL}{path}</loc></url>" for path in [*static_paths, *property_paths, *area_paths])
    return Response(
        f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>',
        media_type="application/xml",
    )


def _page_metadata(
    *,
    title: str,
    description: str,
    path: str,
    image: str = "/static/hero-dubai-skyline.png",
    json_ld: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build consistent, absolute and HTML-safe metadata for public pages."""
    canonical = f"{SITE_URL}{path}"
    image_url = image if image.startswith(("http://", "https://")) else f"{SITE_URL}{image}"
    structured_data = None
    if json_ld is not None:
        structured_data = json.dumps(json_ld, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    return {
        "title": title,
        "description": description,
        "canonical": canonical,
        "og_image": image_url,
        "json_ld": structured_data,
    }


def _page_url(page: int, filters: dict[str, Any]) -> str:
    params = {key: value for key, value in filters.items() if value not in (None, "")}
    params["page"] = page
    return f"/properties?{urlencode(params)}"


def _distance_km(latitude: float, longitude: float, target_latitude: float, target_longitude: float) -> float:
    """Calculate an indicative straight-line distance using the haversine formula."""
    earth_radius_km = 6_371
    source_latitude = math.radians(latitude)
    destination_latitude = math.radians(target_latitude)
    delta_latitude = math.radians(target_latitude - latitude)
    delta_longitude = math.radians(target_longitude - longitude)
    haversine = (
        math.sin(delta_latitude / 2) ** 2
        + math.cos(source_latitude) * math.cos(destination_latitude) * math.sin(delta_longitude / 2) ** 2
    )
    return round(earth_radius_km * 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine)), 1)


@app.get("/properties", response_class=HTMLResponse, include_in_schema=False)
async def properties_page(
    request: Request,
    page: int = Query(default=1, ge=1),
    district: str | None = Query(default=None, max_length=120),
    property_type: str | None = Query(default=None, alias="propertyType", pattern="^(APARTMENT|PENTHOUSE|VILLA|TOWNHOUSE|DUPLEX|LOFT)$"),
    bedrooms_min: int | None = Query(default=None, alias="bedroomsMin", ge=0, le=20),
    bathrooms_min: float | None = Query(default=None, alias="bathroomsMin", ge=0, le=30),
    min_price: float | None = Query(default=None, alias="minPrice", ge=0),
    max_price: float | None = Query(default=None, alias="maxPrice", ge=0),
    area_min: float | None = Query(default=None, alias="areaMin", ge=0),
    readiness: str | None = Query(default=None, pattern="^(READY|OFF_PLAN)$"),
    sort_by: str | None = Query(default=None, alias="sortBy", pattern="^(price_asc|price_desc|area_asc|area_desc|newest)$"),
) -> HTMLResponse:
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=422, detail="minPrice cannot exceed maxPrice.")

    page_size = 12
    rows, total_items = list_catalogue(
        page=page,
        page_size=page_size,
        listing_status=ListingStatus.ACTIVE.value,
        district=district,
        property_type=property_type,
        min_price=min_price,
        max_price=max_price,
        bedrooms_min=bedrooms_min,
        bathrooms_min=bathrooms_min,
        area_min=area_min,
        readiness=readiness,
        sort_by=sort_by,
    )
    filters = {
        "district": district or "",
        "propertyType": property_type or "",
        "bedroomsMin": bedrooms_min if bedrooms_min is not None else "",
        "bathroomsMin": bathrooms_min if bathrooms_min is not None else "",
        "minPrice": min_price if min_price is not None else "",
        "maxPrice": max_price if max_price is not None else "",
        "areaMin": area_min if area_min is not None else "",
        "readiness": readiness or "",
        "sortBy": sort_by or "",
    }
    total_pages = max(1, math.ceil(total_items / page_size))
    areas = all_areas_with_stats()
    metadata = _page_metadata(
        title="Dubai properties | Golden Key",
        description="Filter and share a server-rendered catalogue of clearly labelled Dubai demonstration property records.",
        path="/properties",
        json_ld={
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Dubai properties",
            "url": f"{SITE_URL}/properties",
            "isAccessibleForFree": True,
        },
    )
    return templates.TemplateResponse(
        request=request,
        name="catalogue.html",
        context={
            **metadata,
            "properties": [serialize_durable_listing(row) for row in rows],
            "districts": [area["name"] for area in areas],
            "property_types": ["APARTMENT", "PENTHOUSE", "VILLA", "TOWNHOUSE", "DUPLEX", "LOFT"],
            "filters": filters,
            "page": page,
            "total_pages": total_pages,
            "previous_url": _page_url(page - 1, filters) if page > 1 else None,
            "next_url": _page_url(page + 1, filters) if page < total_pages else None,
        },
    )


@app.get("/properties/{slug}", response_class=HTMLResponse, include_in_schema=False)
async def property_page(request: Request, slug: str) -> HTMLResponse:
    row = listing_by_slug(slug)
    if row is None:
        raise HTTPException(status_code=404, detail="Property not found.")
    property_data = serialize_durable_listing(row)
    gallery = public_media_for_listing(property_data["id"])
    similar_rows = similar_listings(property_data["id"]) or []
    latitude = float(property_data["latitude"] or 25.2048)
    longitude = float(property_data["longitude"] or 55.2708)
    distances = [
        {"name": "Dubai International Airport", "km": _distance_km(latitude, longitude, 25.2532, 55.3657)},
        {"name": "Burj Khalifa", "km": _distance_km(latitude, longitude, 25.1972, 55.2744)},
        {"name": "Dubai Marina", "km": _distance_km(latitude, longitude, 25.0805, 55.1403)},
    ]
    path = f"/properties/{property_data['slug']}"
    metadata = _page_metadata(
        title=f"{property_data['title']} | Golden Key",
        description=property_data["description"],
        path=path,
        image=property_data["imageUrl"] or "/static/hero-dubai-skyline.png",
        json_ld={
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            "name": property_data["title"],
            "description": property_data["description"],
            "url": f"{SITE_URL}{path}",
            "image": [f"{SITE_URL}{item['url']}" if item["url"].startswith("/") else item["url"] for item in gallery],
            "offers": {
                "@type": "Offer",
                "price": property_data["askingPriceUsd"],
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock" if property_data["listingStatus"] == "ACTIVE" else "https://schema.org/LimitedAvailability",
                "description": "Demonstration data; not a live offer.",
            },
            "address": {"@type": "PostalAddress", "addressLocality": property_data["district"], "addressRegion": "Dubai", "addressCountry": "AE"},
            "floorSize": {"@type": "QuantitativeValue", "value": property_data["areaSqM"], "unitCode": "MTK"},
            "numberOfBedrooms": property_data["bedrooms"],
            "numberOfBathroomsTotal": property_data["bathrooms"],
        },
    )
    return templates.TemplateResponse(
        request=request,
        name="property.html",
        context={
            **metadata,
            "og_type": "article",
            "property": property_data,
            "gallery": gallery,
            "price_per_sqm": property_data["askingPriceUsd"] / property_data["areaSqM"],
            "distances": distances,
            "similar": [serialize_durable_listing(item) for item in similar_rows],
        },
    )


@app.get("/areas", response_class=HTMLResponse, include_in_schema=False)
async def areas_page(request: Request) -> HTMLResponse:
    area_rows = all_areas_with_stats()
    metadata = _page_metadata(
        title="Dubai areas | Golden Key",
        description="Explore six server-rendered Dubai area profiles linked to clearly labelled demonstration property records.",
        path="/areas",
        json_ld={
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Dubai areas",
            "url": f"{SITE_URL}/areas",
        },
    )
    return templates.TemplateResponse(request=request, name="areas.html", context={**metadata, "areas": area_rows})


@app.get("/areas/{slug}", response_class=HTMLResponse, include_in_schema=False)
async def area_page(request: Request, slug: str) -> HTMLResponse:
    result = area_with_listings(slug)
    if result is None:
        raise HTTPException(status_code=404, detail="Area not found.")
    area, property_rows = result
    properties = [serialize_durable_listing(row) for row in property_rows]
    prices = [item["askingPriceUsd"] for item in properties]
    metadata = _page_metadata(
        title=f"{area['name']} properties | Golden Key",
        description=area["summary"],
        path=f"/areas/{area['slug']}",
        json_ld={
            "@context": "https://schema.org",
            "@type": "Place",
            "name": area["name"],
            "description": area["summary"],
            "url": f"{SITE_URL}/areas/{area['slug']}",
        },
    )
    return templates.TemplateResponse(
        request=request,
        name="area.html",
        context={
            **metadata,
            "area": area,
            "properties": properties,
            "min_price": min(prices) if prices else None,
            "max_price": max(prices) if prices else None,
        },
    )


def _content_page_context(path: str) -> dict[str, str]:
    company_name = html.escape(os.getenv("COMPANY_LEGAL_NAME", "Legal entity name pending verification"))
    rera_number = html.escape(os.getenv("RERA_NUMBER", "RERA registration pending verification"))
    contact_email = html.escape(os.getenv("CONTACT_EMAIL", "Contact email pending configuration"))
    pages = {
        "/why-dubai": {
            "title": "Why consider Dubai property | Golden Key",
            "description": "A neutral overview of the Golden Key property search and verification process.",
            "eyebrow": "A verification-first process",
            "heading": "Why consider Dubai property",
            "intro": "Use current official and professional advice for every legal, tax, financing and ownership decision.",
            "body": "<h2>How the process works</h2><ol><li>Define intended use, budget and preferred areas.</li><li>Verify title, developer, fees, condition, availability and media sources.</li><li>Use qualified legal, financial and property professionals before signing.</li></ol><h2>Frequently asked questions</h2><details><summary>Are catalogue prices live?</summary><p>No. Every current record is demonstrative and clearly labelled.</p></details><details><summary>Does this site provide investment advice?</summary><p>No. It is an informational catalogue and inquiry service.</p></details><details><summary>What should I verify?</summary><p>Availability, ownership, contract terms, regulatory details, costs and the source of every claim.</p></details><h2>Contact</h2><p>Submit the extended inquiry form to request a human follow-up. Contact channels are published only after verification.</p>",
        },
        "/privacy": {
            "title": "Privacy notice | Golden Key",
            "description": "Privacy information for catalogue inquiries.",
            "eyebrow": "Legal",
            "heading": "Privacy notice",
            "intro": "This notice describes the demonstration inquiry flow and must be reviewed by qualified counsel before launch.",
            "body": f"<h2>Controller</h2><p>{company_name}. Contact: {contact_email}.</p><h2>Inquiry data</h2><p>The form collects contact details, property interest, budget, purpose, communication preference and consent records to answer a request. Required contact data is not used for marketing unless separate optional marketing consent is given.</p><h2>Retention and rights</h2><p>Production retention periods, processors, international transfers and rights-request procedures must be configured and legally reviewed before accepting real leads.</p>",
        },
        "/cookies": {
            "title": "Cookie notice | Golden Key",
            "description": "Cookie and local-storage information for Golden Key.",
            "eyebrow": "Legal",
            "heading": "Cookie and storage notice",
            "intro": "The public catalogue uses essential browser storage for interface preferences.",
            "body": "<h2>Essential storage</h2><p>Language, theme, favourites and comparison choices may be kept in local storage on your device. These features do not require advertising cookies.</p><h2>Production integrations</h2><p>Analytics, anti-bot or embedded services must remain disabled until their legal basis, consent behaviour, retention and vendor terms are documented.</p>",
        },
        "/terms": {
            "title": "Terms of use | Golden Key",
            "description": "Terms for the demonstrative Golden Key property catalogue.",
            "eyebrow": "Legal",
            "heading": "Terms of use",
            "intro": "The current catalogue is a demonstrative interface, not a source of live property offers.",
            "body": f"<h2>Operator details</h2><p>{company_name}. {rera_number}.</p><h2>Informational use only</h2><p>Prices, availability, specifications, area descriptions, distances and media must be independently verified. Nothing on this site is investment, legal, tax or financial advice, a binding offer, or a guarantee of return.</p><h2>No transaction processing</h2><p>The service does not accept property payments, custody funds, perform identity verification or process withdrawals.</p>",
        },
    }
    return pages[path]


@app.get("/why-dubai", response_class=HTMLResponse, include_in_schema=False)
@app.get("/privacy", response_class=HTMLResponse, include_in_schema=False)
@app.get("/cookies", response_class=HTMLResponse, include_in_schema=False)
@app.get("/terms", response_class=HTMLResponse, include_in_schema=False)
async def content_page(request: Request) -> HTMLResponse:
    content = _content_page_context(request.url.path)
    metadata = _page_metadata(
        title=content["title"],
        description=content["description"],
        path=request.url.path,
    )
    return templates.TemplateResponse(request=request, name="content.html", context={**metadata, **content})


@app.get("/health")
async def health_check() -> dict[str, str]:
    try:
        database_ready()
        return {"status": "ok"}
    except (SQLAlchemyError, OSError) as exc:
        logger.error("health_check_failed: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable") from exc


@app.get("/healthz", include_in_schema=False)
async def healthz_alias() -> dict[str, str]:
    """Alias of /health for platforms that expect the Kubernetes-style probe path."""
    return await health_check()


@app.get("/api/public-config", include_in_schema=False)
async def public_config() -> dict[str, Any]:
    """Expose only non-secret client integration settings."""
    site_key = os.getenv("TURNSTILE_SITE_KEY", "").strip()
    return {"turnstileSiteKey": site_key or None}


@app.get("/docs", include_in_schema=False)
async def docs_page() -> FileResponse:
    """Serve the in-app documentation page."""
    return FileResponse(STATIC_DIR / "docs" / "index.html")


@app.get("/404", include_in_schema=False)
async def not_found_page() -> FileResponse:
    """Serve the branded 404 page directly (useful for static hosts and SSR fallbacks)."""
    return FileResponse(STATIC_DIR / "404.html", status_code=404)


@app.get("/500", include_in_schema=False)
async def internal_error_page() -> FileResponse:
    """Serve the branded safe-error page for deployment smoke checks."""
    return FileResponse(STATIC_DIR / "500.html", status_code=500)


@app.get("/api/properties")
async def list_properties(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
    location: str | None = Query(default=None, min_length=2, max_length=120),
    min_price: float | None = Query(default=None, alias="minPrice", ge=0),
    max_price: float | None = Query(default=None, alias="maxPrice", ge=0),
    listing_status: ListingStatus = Query(default=ListingStatus.ACTIVE, alias="listingStatus"),
    bedrooms_min: int | None = Query(default=None, alias="bedroomsMin", ge=0, le=20),
    bathrooms_min: float | None = Query(default=None, alias="bathroomsMin", ge=0, le=30),
    area_min: float | None = Query(default=None, alias="areaMin", ge=0),
    area_max: float | None = Query(default=None, alias="areaMax", ge=0),
    district: str | None = Query(default=None, min_length=2, max_length=120),
    property_type: str | None = Query(default=None, alias="propertyType", pattern="^(APARTMENT|PENTHOUSE|VILLA|TOWNHOUSE|DUPLEX|LOFT)$"),
    readiness: str | None = Query(default=None, pattern="^(READY|OFF_PLAN)$"),
    sort_by: str | None = Query(default=None, alias="sortBy", pattern="^(price_asc|price_desc|area_asc|area_desc|newest)$"),
) -> dict[str, Any]:
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=422, detail="minPrice cannot exceed maxPrice.")

    if area_min is not None and area_max is not None and area_min > area_max:
        raise HTTPException(status_code=422, detail="areaMin cannot exceed areaMax.")

    rows, total_items = list_catalogue(
        page=page,
        page_size=page_size,
        listing_status=listing_status.value,
        location=location,
        district=district,
        property_type=property_type,
        min_price=min_price,
        max_price=max_price,
        bedrooms_min=bedrooms_min,
        bathrooms_min=bathrooms_min,
        area_min=area_min,
        area_max=area_max,
        readiness=readiness,
        sort_by=sort_by,
    )

    total_pages = (total_items + page_size - 1) // page_size
    return {
        "data": [serialize_durable_listing(row) for row in rows],
        "pagination": {
            "page": page,
            "pageSize": page_size,
            "totalItems": total_items,
            "totalPages": total_pages,
        },
        "notice": LEGAL_NOTICE,
    }


@app.get("/api/properties/by-slug/{slug}")
async def get_property_by_slug(slug: str) -> dict[str, Any]:
    row = listing_by_slug(slug)
    if row is None:
        raise HTTPException(status_code=404, detail="Property not found.")
    data = serialize_durable_listing(row)
    data["media"] = public_media_for_listing(data["id"])
    return {"data": data, "notice": LEGAL_NOTICE}


@app.get("/api/properties/{property_id}")
async def get_property(property_id: int) -> dict[str, Any]:
    row = listing_by_id(property_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Property not found.")
    data = serialize_durable_listing(row)
    data["media"] = public_media_for_listing(data["id"])
    return {"data": data, "notice": LEGAL_NOTICE}


@app.get("/api/properties/{property_id}/tour")
async def get_property_tour(property_id: int) -> dict[str, Any]:
    """Return 3D / virtual tour metadata for a listing, if available."""
    row = listing_by_id(property_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Property not found.")

    values = row._mapping
    tour_url = values["tour_url"]
    is_local_model = tour_url and tour_url.endswith(".glb")

    return {
        "data": {
            "propertyId": values["id"],
            "title": values["title"],
            "tourType": values["tour_type"],
            "tourUrl": tour_url,
            "isLocalModel": is_local_model,
        },
        "notice": LEGAL_NOTICE,
    }


@app.get("/api/properties/{property_id}/similar")
async def get_similar_properties(property_id: int) -> dict[str, Any]:
    """Return up to 3 listings in a ±30 % price band, excluding the source property."""
    rows = similar_listings(property_id)
    if rows is None:
        raise HTTPException(status_code=404, detail="Property not found.")

    logger.info("similar_properties source_id=%d matches=%d", property_id, len(rows))
    return {"data": [serialize_durable_listing(r) for r in rows], "notice": LEGAL_NOTICE}


@app.post("/api/inquiries", status_code=status.HTTP_201_CREATED)
async def create_inquiry(request: Request, background_tasks: BackgroundTasks, inquiry: InquiryCreate) -> dict[str, Any]:
    if listing_by_id(inquiry.property_id) is None:
        raise HTTPException(status_code=404, detail="Property not found.")

    # Honeypot submissions receive the same public response but are not stored.
    if inquiry.website:
        logger.info("inquiry_discarded reason=honeypot property_id=%d", inquiry.property_id)
        return {"status": "RECEIVED", "inquiryId": None, "message": "Thank you. Your request was received."}

    remote_ip = request.client.host if request.client else None
    if not await _verify_turnstile(inquiry.turnstile_token, remote_ip):
        return error_response(422, "BOT_CHECK_FAILED", "Please complete the anti-bot check and try again.")

    inquiry_id = persist_inquiry(
        {
            "property_id": inquiry.property_id,
            "full_name": inquiry.full_name,
            "email": str(inquiry.email),
            "phone": inquiry.phone,
            "message": inquiry.message,
            "purpose": inquiry.purpose,
            "budget_usd": inquiry.budget_usd,
            "preferred_channel": inquiry.preferred_channel,
            "consent_to_contact": inquiry.consent_to_contact,
            "consent_privacy": inquiry.consent_privacy,
            "consent_marketing": inquiry.consent_marketing,
            "created_at": datetime.now(UTC),
            "status": "RECEIVED",
            "delivery_status": "PENDING",
            "delivery_attempts": 0,
        }
    )

    logger.info(
        "inquiry_created id=%d property_id=%d",
        inquiry_id,
        inquiry.property_id,
    )

    background_tasks.add_task(
        deliver_inquiry,
        inquiry_id,
        {
            "inquiryId": inquiry_id,
            "propertyId": inquiry.property_id,
            "fullName": inquiry.full_name,
            "email": str(inquiry.email),
            "phone": inquiry.phone,
            "message": inquiry.message,
            "purpose": inquiry.purpose,
            "budgetUsd": inquiry.budget_usd,
            "preferredChannel": inquiry.preferred_channel,
            "consentMarketing": inquiry.consent_marketing,
            "locale": inquiry.locale,
        },
    )

    messages = {
        "ru": "Спасибо. Запрос получен, консультант свяжется выбранным способом.",
        "en": "Thank you. Your request was received and a consultant will use your preferred channel.",
        "de": "Vielen Dank. Ihre Anfrage wurde empfangen; wir melden uns über den gewählten Kanal.",
        "es": "Gracias. Recibimos su solicitud y contactaremos por el canal elegido.",
    }
    return {
        "status": "RECEIVED",
        "inquiryId": inquiry_id,
        "message": messages[inquiry.locale],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
