"""Property-listing API.

This service is an informational catalogue and inquiry intake only. It does
not accept funds, custody assets, promise returns, process withdrawals, or
perform identity verification.
"""

import collections
import html
import logging
import os
import re
import sqlite3
import time
from collections.abc import Generator
from contextlib import contextmanager
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from starlette.exceptions import HTTPException as StarletteHTTPException

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
#  Rate limiter — simple in-memory sliding window (per client IP).
# ---------------------------------------------------------------------------
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX", "5"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
_rate_buckets: dict[str, collections.deque[float]] = {}


def _is_rate_limited(client_ip: str) -> bool:
    """Return True if *client_ip* has exceeded the request budget."""
    now = time.monotonic()
    bucket = _rate_buckets.setdefault(client_ip, collections.deque())
    # Evict timestamps outside the window.
    while bucket and bucket[0] <= now - RATE_LIMIT_WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
        return True
    bucket.append(now)
    return False


def apply_security_headers(response: Any) -> Any:
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self'; "
        "script-src 'self'; "
        "style-src 'self'; "
        "font-src 'self'; "
        "connect-src 'self'; "
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
    # Rate-limit POST /api/inquiries.
    if request.method == "POST" and request.url.path == "/api/inquiries":
        client_ip = request.client.host if request.client else "unknown"
        if _is_rate_limited(client_ip):
            logger.warning("rate_limit_exceeded client=%s path=%s", client_ip, request.url.path)
            return apply_security_headers(
                error_response(
                    429,
                    "RATE_LIMITED",
                    "Too many requests. Please try again later.",
                )
            )

    response = await call_next(request)
    return apply_security_headers(response)


DB_PATH = Path(os.getenv("PROPERTY_LISTINGS_DB_PATH", "property_listings.db"))
STATIC_DIR = Path(__file__).parent / "static"
LEGAL_NOTICE = (
    "Listing information is illustrative and subject to agent and owner verification. "
    "It is not an offer, investment advice, or a binding contract."
)


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
    consent_to_contact: bool = Field(alias="consentToContact")

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

    @field_validator("consent_to_contact")
    @classmethod
    def require_contact_consent(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Consent to contact is required.")
        return value


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


import json as _json


def _safe_json_list(value: Any) -> list:
    """Parse a JSON string column into a list, returning [] on any error."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    try:
        parsed = _json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (ValueError, TypeError):
        return []


def serialize_listing(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "location": row["location"],
        "askingPriceUsd": row["asking_price_usd"],
        "description": row["description"],
        "imageUrl": row["image_url"],
        "bedrooms": row["bedrooms"],
        "bathrooms": row["bathrooms"],
        "areaSqM": row["area_sq_m"],
        "listingStatus": row["listing_status"],
        "tourType": row["tour_type"],
        "tourUrl": row["tour_url"],
        "images": _safe_json_list(row["images"] if "images" in row.keys() else None),
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


initialize_database()
alter_table_add_tour_columns()
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


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
async def robots_txt() -> FileResponse:
    """Serve robots.txt as plain text."""
    return FileResponse(STATIC_DIR / "robots.txt", media_type="text/plain")


@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml() -> FileResponse:
    """Serve the sitemap as XML."""
    return FileResponse(STATIC_DIR / "sitemap.xml", media_type="application/xml")


@app.get("/health")
async def health_check() -> dict[str, str]:
    try:
        with db_session() as connection:
            connection.execute("SELECT 1 FROM listings LIMIT 1")
        return {"status": "ok"}
    except sqlite3.Error as exc:
        logger.error("health_check_failed: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable") from exc


@app.get("/healthz", include_in_schema=False)
async def healthz_alias() -> dict[str, str]:
    """Alias of /health for platforms that expect the Kubernetes-style probe path."""
    return await health_check()


@app.get("/docs", include_in_schema=False)
async def docs_page() -> FileResponse:
    """Serve the in-app documentation page."""
    return FileResponse(STATIC_DIR / "docs" / "index.html")


@app.get("/404", include_in_schema=False)
async def not_found_page() -> FileResponse:
    """Serve the branded 404 page directly (useful for static hosts and SSR fallbacks)."""
    return FileResponse(STATIC_DIR / "404.html", status_code=404)


@app.get("/api/properties")
async def list_properties(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
    location: str | None = Query(default=None, min_length=2, max_length=120),
    min_price: float | None = Query(default=None, alias="minPrice", ge=0),
    max_price: float | None = Query(default=None, alias="maxPrice", ge=0),
    listing_status: ListingStatus = Query(default=ListingStatus.ACTIVE, alias="listingStatus"),
) -> dict[str, Any]:
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=422, detail="minPrice cannot exceed maxPrice.")

    clauses = ["listing_status = ?"]
    values: list[Any] = [listing_status.value]
    if location:
        clauses.append("LOWER(location) LIKE ?")
        values.append(f"%{location.lower()}%")
    if min_price is not None:
        clauses.append("asking_price_usd >= ?")
        values.append(min_price)
    if max_price is not None:
        clauses.append("asking_price_usd <= ?")
        values.append(max_price)

    where_clause = " AND ".join(clauses)
    offset = (page - 1) * page_size
    with db_session() as connection:
        total_items = connection.execute(
            f"SELECT COUNT(*) FROM listings WHERE {where_clause}", values
        ).fetchone()[0]
        rows = connection.execute(
            f"""
            SELECT * FROM listings
            WHERE {where_clause}
            ORDER BY created_at DESC, id DESC
            LIMIT ? OFFSET ?
            """,
            [*values, page_size, offset],
        ).fetchall()

    total_pages = (total_items + page_size - 1) // page_size
    return {
        "data": [serialize_listing(row) for row in rows],
        "pagination": {
            "page": page,
            "pageSize": page_size,
            "totalItems": total_items,
            "totalPages": total_pages,
        },
        "notice": LEGAL_NOTICE,
    }


@app.get("/api/properties/{property_id}")
async def get_property(property_id: int) -> dict[str, Any]:
    with db_session() as connection:
        row = connection.execute("SELECT * FROM listings WHERE id = ?", (property_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Property not found.")
    return {"data": serialize_listing(row), "notice": LEGAL_NOTICE}


@app.get("/api/properties/{property_id}/tour")
async def get_property_tour(property_id: int) -> dict[str, Any]:
    """Return 3D / virtual tour metadata for a listing, if available."""
    with db_session() as connection:
        row = connection.execute(
            "SELECT id, title, tour_type, tour_url FROM listings WHERE id = ?", (property_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Property not found.")

    tour_url = row["tour_url"]
    is_local_model = tour_url and tour_url.endswith(".glb")

    return {
        "data": {
            "propertyId": row["id"],
            "title": row["title"],
            "tourType": row["tour_type"],
            "tourUrl": tour_url,
            "isLocalModel": is_local_model,
        },
        "notice": LEGAL_NOTICE,
    }


@app.get("/api/properties/{property_id}/similar")
async def get_similar_properties(property_id: int) -> dict[str, Any]:
    """Return up to 3 listings in a ±30 % price band, excluding the source property."""
    with db_session() as connection:
        source = connection.execute(
            "SELECT asking_price_usd FROM listings WHERE id = ?", (property_id,)
        ).fetchone()
        if source is None:
            raise HTTPException(status_code=404, detail="Property not found.")

        price = source["asking_price_usd"]
        low, high = price * 0.7, price * 1.3
        rows = connection.execute(
            """
            SELECT * FROM listings
            WHERE id != ? AND listing_status = 'ACTIVE'
              AND asking_price_usd BETWEEN ? AND ?
            ORDER BY ABS(asking_price_usd - ?) ASC
            LIMIT 3
            """,
            (property_id, low, high, price),
        ).fetchall()

    logger.info("similar_properties source_id=%d matches=%d", property_id, len(rows))
    return {"data": [serialize_listing(r) for r in rows], "notice": LEGAL_NOTICE}


@app.post("/api/inquiries", status_code=status.HTTP_201_CREATED)
async def create_inquiry(inquiry: InquiryCreate) -> dict[str, Any]:
    with db_session() as connection:
        listing = connection.execute(
            "SELECT id FROM listings WHERE id = ?", (inquiry.property_id,)
        ).fetchone()
        if listing is None:
            raise HTTPException(status_code=404, detail="Property not found.")

        created_at = datetime.now(UTC).isoformat(timespec="seconds")
        cursor = connection.execute(
            """
            INSERT INTO inquiries (
                property_id, full_name, email, phone, message,
                consent_to_contact, created_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'RECEIVED')
            """,
            (
                inquiry.property_id,
                inquiry.full_name,
                str(inquiry.email),
                inquiry.phone,
                inquiry.message,
                int(inquiry.consent_to_contact),
                created_at,
            ),
        )
        connection.commit()

    logger.info(
        "inquiry_created id=%d property_id=%d",
        cursor.lastrowid,
        inquiry.property_id,
    )

    return {
        "status": "RECEIVED",
        "inquiryId": cursor.lastrowid,
        "message": "Thank you. A representative may contact you about this listing.",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
