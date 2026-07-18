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
async def http_error_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    if exc.status_code == 404:
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
                "Marina View Residence",
                "Dubai Marina, UAE",
                1_250_000,
                "Four-bedroom waterfront residence with a private terrace and building concierge.",
                None,
                4,
                3.5,
                260,
                ListingStatus.ACTIVE.value,
                TourType.MODEL_3D.value,
                "https://example.com/tours/marina-view",
                created_at,
            ),
            (
                2,
                "Coastal Family Villa",
                "Malibu, California, USA",
                2_400_000,
                "Five-bedroom coastal home with outdoor living space and a short walk to the beach.",
                None,
                5,
                4.0,
                310,
                ListingStatus.ACTIVE.value,
                TourType.VIDEO_3D.value,
                "https://example.com/tours/coastal-villa",
                created_at,
            ),
            (
                3,
                "Alpine Chalet",
                "Aspen, Colorado, USA",
                1_850_000,
                "Three-bedroom chalet near local ski access, with a fireplace and mountain views.",
                None,
                3,
                2.5,
                195,
                ListingStatus.PENDING.value,
                TourType.PHOTO_360.value,
                "https://example.com/tours/alpine-chalet",
                created_at,
            ),
            (
                4,
                "Harbour Apartment",
                "Monte Carlo, Monaco",
                3_200_000,
                "Two-bedroom harbour-facing apartment with concierge access and a covered balcony.",
                None,
                2,
                2.0,
                145,
                ListingStatus.ACTIVE.value,
                TourType.MODEL_3D.value,
                "https://example.com/tours/harbour-apartment",
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
    }


def alter_table_add_tour_columns():
    """Add tour columns to existing databases created before the schema change."""
    connection = get_connection()
    columns = [row[1] for row in connection.execute("PRAGMA table_info(listings)").fetchall()]
    if "tour_type" not in columns:
        connection.execute(
            "ALTER TABLE listings ADD COLUMN tour_type TEXT NOT NULL DEFAULT 'NONE' "
            "CHECK (tour_type IN ('NONE', 'PHOTO_360', 'MODEL_3D', 'VIDEO_3D'))"
        )
    if "tour_url" not in columns:
        connection.execute("ALTER TABLE listings ADD COLUMN tour_url TEXT")
    connection.commit()
    connection.close()


initialize_database()
alter_table_add_tour_columns()
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
async def landing_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
async def health_check() -> dict[str, str]:
    try:
        with db_session() as connection:
            connection.execute("SELECT 1 FROM listings LIMIT 1")
        return {"status": "ok"}
    except sqlite3.Error as exc:
        logger.error("health_check_failed: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable") from exc


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
