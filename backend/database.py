"""Durable database boundary for catalogue, leads, admin and media metadata."""

from __future__ import annotations

import json
import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    create_engine,
    func,
    inspect,
    select,
    text,
    update,
)
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.pool import NullPool


def _database_url() -> tuple[str, bool, Path | None]:
    configured = os.getenv("DATABASE_URL", "").strip()
    production = os.getenv("ENVIRONMENT", "").lower() == "production" or bool(os.getenv("VERCEL"))
    if production and not configured:
        raise RuntimeError("DATABASE_URL is required in production; ephemeral SQLite is not supported.")
    if configured:
        if configured.startswith("postgres://"):
            configured = "postgresql+psycopg://" + configured.removeprefix("postgres://")
        elif configured.startswith("postgresql://"):
            configured = "postgresql+psycopg://" + configured.removeprefix("postgresql://")
        return configured, configured.startswith("sqlite"), None

    path = Path(os.getenv("PROPERTY_LISTINGS_DB_PATH", "property_listings.db")).resolve()
    return f"sqlite:///{path.as_posix()}", True, path


DATABASE_URL, IS_SQLITE, SQLITE_PATH = _database_url()
engine: Engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    poolclass=NullPool,
)
metadata = MetaData()

listings = Table(
    "listings",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("slug", String(180), nullable=False, unique=True),
    Column("title", String(240), nullable=False),
    Column("location", String(240), nullable=False),
    Column("district", String(120), nullable=False),
    Column("property_type", String(40), nullable=False),
    Column("asking_price_usd", Float, nullable=False),
    Column("description", Text, nullable=False),
    Column("image_url", Text),
    Column("bedrooms", Integer, nullable=False, default=0),
    Column("bathrooms", Float, nullable=False, default=0),
    Column("area_sq_m", Float, nullable=False),
    Column("listing_status", String(20), nullable=False),
    Column("readiness", String(20), nullable=False, default="READY"),
    Column("handover_label", String(80)),
    Column("tour_type", String(20), nullable=False, default="NONE"),
    Column("tour_url", Text),
    Column("images", Text, nullable=False, default="[]"),
    Column("latitude", Float),
    Column("longitude", Float),
    Column("year_built", Integer),
    Column("parking", Integer),
    Column("features", Text, nullable=False, default="[]"),
    Column("floor_plan_url", Text),
    Column("is_demo", Boolean, nullable=False, default=True),
    Column("published", Boolean, nullable=False, default=True),
    Column("source_label", String(240)),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
    CheckConstraint("asking_price_usd > 0", name="ck_listings_price_positive"),
    CheckConstraint("area_sq_m > 0", name="ck_listings_area_positive"),
)
Index("ix_listings_public_catalog", listings.c.published, listings.c.listing_status, listings.c.district)

media = Table(
    "media",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("listing_id", ForeignKey("listings.id", ondelete="CASCADE"), nullable=False),
    Column("role", String(30), nullable=False),
    Column("url", Text, nullable=False),
    Column("alt_text", String(300), nullable=False),
    Column("sort_order", Integer, nullable=False, default=0),
    Column("source_url", Text),
    Column("rights_basis", String(240), nullable=False),
    Column("rights_verified_at", DateTime(timezone=True)),
    Column("mime_type", String(80)),
    Column("width", Integer),
    Column("height", Integer),
)
Index("ix_media_listing_order", media.c.listing_id, media.c.sort_order)

areas = Table(
    "areas",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("slug", String(120), nullable=False, unique=True),
    Column("name", String(160), nullable=False),
    Column("summary", Text, nullable=False),
    Column("is_demo", Boolean, nullable=False, default=True),
)

inquiries = Table(
    "inquiries",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("property_id", ForeignKey("listings.id"), nullable=False),
    Column("full_name", String(120), nullable=False),
    Column("email", String(320), nullable=False),
    Column("phone", String(32)),
    Column("message", Text, nullable=False),
    Column("purpose", String(40), nullable=False, default="PERSONAL_USE"),
    Column("budget_usd", Float),
    Column("preferred_channel", String(24), nullable=False, default="EMAIL"),
    Column("consent_to_contact", Boolean, nullable=False),
    Column("consent_privacy", Boolean, nullable=False),
    Column("consent_marketing", Boolean, nullable=False, default=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("status", String(24), nullable=False, default="RECEIVED"),
    Column("delivery_status", String(24), nullable=False, default="PENDING"),
    Column("delivery_attempts", Integer, nullable=False, default=0),
    Column("last_delivery_at", DateTime(timezone=True)),
)

rate_limit_events = Table(
    "rate_limit_events",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("client_hash", String(64), nullable=False),
    Column("route", String(120), nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
)
Index("ix_rate_limit_window", rate_limit_events.c.client_hash, rate_limit_events.c.route, rate_limit_events.c.created_at)

admin_users = Table(
    "admin_users",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("email", String(320), nullable=False, unique=True),
    Column("password_hash", Text, nullable=False),
    Column("role", String(20), nullable=False),
    Column("active", Boolean, nullable=False, default=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
)

admin_sessions = Table(
    "admin_sessions",
    metadata,
    Column("id_hash", String(64), primary_key=True),
    Column("user_id", ForeignKey("admin_users.id", ondelete="CASCADE"), nullable=False),
    Column("csrf_hash", String(64), nullable=False),
    Column("expires_at", DateTime(timezone=True), nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
)
Index("ix_admin_sessions_expiry", admin_sessions.c.expires_at)

audit_events = Table(
    "audit_events",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("actor_user_id", ForeignKey("admin_users.id")),
    Column("action", String(120), nullable=False),
    Column("entity_type", String(80), nullable=False),
    Column("entity_id", String(120)),
    Column("details", Text, nullable=False, default="{}"),
    Column("created_at", DateTime(timezone=True), nullable=False),
)


AREA_SEEDS = [
    ("palm-jumeirah", "Palm Jumeirah"),
    ("downtown-dubai", "Downtown Dubai"),
    ("dubai-marina", "Dubai Marina"),
    ("dubai-hills-estate", "Dubai Hills Estate"),
    ("difc", "DIFC"),
    ("jumeirah", "Jumeirah"),
]

# These are explicitly demonstrative records, not claims about live inventory.
DEMO_SPECS = [
    (1, "burj-khalifa-demo-penthouse", "Burj Khalifa Demo Penthouse", "Downtown Dubai", "PENTHOUSE", 4_800_000, 3, 3.5, 240, "ACTIVE", "READY"),
    (2, "palm-frond-demo-villa", "Palm Frond Demo Villa", "Palm Jumeirah", "VILLA", 12_500_000, 6, 7, 920, "ACTIVE", "READY"),
    (3, "marina-tower-demo-residence", "Marina Tower Demo Residence", "Dubai Marina", "APARTMENT", 1_250_000, 4, 3.5, 260, "ACTIVE", "READY"),
    (4, "dubai-hills-demo-townhouse", "Dubai Hills Demo Townhouse", "Dubai Hills Estate", "TOWNHOUSE", 2_100_000, 4, 4.5, 305, "ACTIVE", "READY"),
    (5, "difc-gate-demo-duplex", "DIFC Gate Demo Duplex", "DIFC", "DUPLEX", 3_400_000, 3, 3, 215, "ACTIVE", "READY"),
    (6, "jumeirah-bay-demo-villa", "Jumeirah Bay Island Beachfront Villa", "Jumeirah", "VILLA", 18_000_000, 7, 8, 1240, "PENDING", "READY"),
    (7, "opera-district-demo-residence", "Opera District Demo Residence", "Downtown Dubai", "APARTMENT", 1_900_000, 2, 2.5, 145, "ACTIVE", "READY"),
    (8, "downtown-demo-loft", "Downtown Demo Loft", "Downtown Dubai", "LOFT", 1_150_000, 1, 1.5, 96, "ACTIVE", "READY"),
    (9, "palm-crescent-demo-penthouse", "Palm Crescent Demo Penthouse", "Palm Jumeirah", "PENTHOUSE", 8_600_000, 4, 5, 510, "ACTIVE", "OFF_PLAN"),
    (10, "palm-demo-townhouse", "Palm Demo Townhouse", "Palm Jumeirah", "TOWNHOUSE", 3_800_000, 4, 4, 340, "ACTIVE", "READY"),
    (11, "marina-demo-sky-apartment", "Marina Demo Sky Apartment", "Dubai Marina", "APARTMENT", 1_550_000, 2, 2, 135, "ACTIVE", "READY"),
    (12, "marina-demo-duplex", "Marina Demo Duplex", "Dubai Marina", "DUPLEX", 2_650_000, 3, 3.5, 225, "ACTIVE", "OFF_PLAN"),
    (13, "hills-golf-demo-villa", "Hills Golf Demo Villa", "Dubai Hills Estate", "VILLA", 5_900_000, 5, 6, 560, "ACTIVE", "READY"),
    (14, "hills-park-demo-apartment", "Hills Park Demo Apartment", "Dubai Hills Estate", "APARTMENT", 980_000, 2, 2, 118, "ACTIVE", "OFF_PLAN"),
    (15, "difc-index-demo-apartment", "DIFC Index Demo Apartment", "DIFC", "APARTMENT", 2_450_000, 2, 2.5, 155, "ACTIVE", "READY"),
    (16, "difc-central-demo-penthouse", "DIFC Central Demo Penthouse", "DIFC", "PENTHOUSE", 6_900_000, 4, 5, 410, "ACTIVE", "OFF_PLAN"),
    (17, "jumeirah-demo-townhouse", "Jumeirah Demo Townhouse", "Jumeirah", "TOWNHOUSE", 2_900_000, 4, 4.5, 330, "ACTIVE", "READY"),
    (18, "jumeirah-demo-residence", "Jumeirah Demo Residence", "Jumeirah", "APARTMENT", 1_350_000, 2, 2, 130, "ACTIVE", "READY"),
    (19, "city-walk-demo-duplex", "City Walk Demo Duplex", "Jumeirah", "DUPLEX", 2_250_000, 3, 3, 205, "ACTIVE", "OFF_PLAN"),
    (20, "downtown-demo-sky-villa", "Downtown Demo Sky Villa", "Downtown Dubai", "PENTHOUSE", 7_700_000, 5, 6, 490, "ACTIVE", "OFF_PLAN"),
    (21, "jumeirah-garden-demo-villa", "Jumeirah Garden Demo Villa", "Jumeirah", "VILLA", 4_250_000, 5, 5.5, 455, "ACTIVE", "READY"),
]


def _demo_row(spec: tuple[Any, ...]) -> dict[str, Any]:
    listing_id, slug, title, district, property_type, price, beds, baths, area, status, readiness = spec
    now = datetime.now(UTC)
    gallery = [
        "/static/hero-dubai-skyline.png" if index % 2 == 0 else "/static/hero-coastal-villa.png"
        for index in range(8)
    ]
    return {
        "id": listing_id,
        "slug": slug,
        "title": title,
        "location": "Jumeirah Bay Island, Dubai, UAE" if listing_id == 6 else f"{district}, Dubai, UAE",
        "district": district,
        "property_type": property_type,
        "asking_price_usd": price,
        "description": "Demonstration catalogue record for interface testing; availability, specifications and price are not a live offer.",
        "image_url": gallery[0],
        "bedrooms": beds,
        "bathrooms": baths,
        "area_sq_m": area,
        "listing_status": status,
        "readiness": readiness,
        "handover_label": "Demo data — verify before publishing",
        "tour_type": "MODEL_3D",
        "tour_url": "/static/models/coastal-villa.glb",
        "images": json.dumps(gallery),
        "latitude": 25.2048,
        "longitude": 55.2708,
        "year_built": 2024,
        "parking": max(1, beds // 2),
        "features": json.dumps(["Demo data", "Specifications require verification"]),
        "floor_plan_url": None,
        "is_demo": True,
        "published": True,
        "source_label": "Golden Key demonstrative seed; not live inventory",
        "created_at": now,
        "updated_at": now,
    }


def _upgrade_legacy_sqlite() -> None:
    """Add nullable/defaulted columns needed by the current local schema."""
    if not IS_SQLITE or not SQLITE_PATH or not SQLITE_PATH.exists():
        return
    with engine.begin() as connection:
        existing_tables = set(inspect(connection).get_table_names())
        if "listings" not in existing_tables:
            return
        current = {column["name"] for column in inspect(connection).get_columns("listings")}
        additions = {
            "slug": "VARCHAR(180)",
            "district": "VARCHAR(120)",
            "property_type": "VARCHAR(40)",
            "readiness": "VARCHAR(20) DEFAULT 'READY'",
            "handover_label": "VARCHAR(80)",
            "floor_plan_url": "TEXT",
            "is_demo": "BOOLEAN DEFAULT 1",
            "published": "BOOLEAN DEFAULT 1",
            "source_label": "VARCHAR(240)",
            "updated_at": "DATETIME",
        }
        for name, ddl in additions.items():
            if name not in current:
                connection.execute(text(f"ALTER TABLE listings ADD COLUMN {name} {ddl}"))


def initialize_database() -> None:
    if IS_SQLITE:
        _upgrade_legacy_sqlite()
        metadata.create_all(engine)
        seed_demo_data()


def seed_demo_data() -> None:
    with engine.begin() as connection:
        for slug, name in AREA_SEEDS:
            exists = connection.execute(select(areas.c.id).where(areas.c.slug == slug)).first()
            if not exists:
                connection.execute(
                    areas.insert().values(
                        slug=slug,
                        name=name,
                        summary="Demonstration area profile. Add verified editorial content before production publishing.",
                        is_demo=True,
                    )
                )

        for spec in DEMO_SPECS:
            row = _demo_row(spec)
            existing = connection.execute(select(listings.c.id).where(listings.c.id == row["id"])).first()
            if existing:
                connection.execute(update(listings).where(listings.c.id == row["id"]).values(**{k: v for k, v in row.items() if k != "id"}))
            else:
                connection.execute(listings.insert().values(**row))

        media_count = connection.execute(select(func.count()).select_from(media)).scalar_one()
        if media_count == 0:
            for listing_id, *_ in DEMO_SPECS:
                for order, url in enumerate(json.loads(_demo_row(next(item for item in DEMO_SPECS if item[0] == listing_id))["images"])):
                    connection.execute(
                        media.insert().values(
                            listing_id=listing_id,
                            role="HERO" if order == 0 else "GALLERY",
                            url=url,
                            alt_text="Demonstration Dubai property image; not a photograph of a live listing",
                            sort_order=order,
                            source_url=None,
                            rights_basis="Bundled demonstrative asset",
                            rights_verified_at=datetime.now(UTC),
                            mime_type="image/png",
                        )
                    )


@contextmanager
def session() -> Iterator[Connection]:
    with engine.begin() as connection:
        yield connection


def raw_sqlite_connection() -> sqlite3.Connection:
    if not IS_SQLITE or SQLITE_PATH is None:
        raise RuntimeError("Raw sqlite access is available only for local/test compatibility.")
    connection = sqlite3.connect(SQLITE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def _json_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value or "[]")
        return parsed if isinstance(parsed, list) else []
    except (TypeError, ValueError):
        return []


def serialize_listing(row: Any) -> dict[str, Any]:
    values = dict(row._mapping) if hasattr(row, "_mapping") else dict(row)
    images = _json_list(values.get("images"))
    return {
        "id": values["id"],
        "slug": values["slug"],
        "title": values["title"],
        "location": values["location"],
        "district": values["district"],
        "propertyType": values["property_type"],
        "askingPriceUsd": values["asking_price_usd"],
        "description": values["description"],
        "imageUrl": values.get("image_url") or (images[0] if images else None),
        "bedrooms": values["bedrooms"],
        "bathrooms": values["bathrooms"],
        "areaSqM": values["area_sq_m"],
        "listingStatus": values["listing_status"],
        "readiness": values["readiness"],
        "handoverLabel": values.get("handover_label"),
        "tourType": values.get("tour_type") or "NONE",
        "tourUrl": values.get("tour_url"),
        "images": images,
        "latitude": values.get("latitude"),
        "longitude": values.get("longitude"),
        "yearBuilt": values.get("year_built"),
        "parking": values.get("parking"),
        "features": _json_list(values.get("features")),
        "floorPlanUrl": values.get("floor_plan_url"),
        "isDemo": bool(values.get("is_demo")),
        "published": bool(values.get("published")),
        "sourceLabel": values.get("source_label"),
    }


def list_catalogue(
    *,
    page: int,
    page_size: int,
    listing_status: str,
    location: str | None = None,
    district: str | None = None,
    property_type: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    bedrooms_min: int | None = None,
    bathrooms_min: float | None = None,
    area_min: float | None = None,
    area_max: float | None = None,
    readiness: str | None = None,
    sort_by: str | None = None,
) -> tuple[list[Any], int]:
    conditions = [listings.c.published.is_(True), listings.c.listing_status == listing_status]
    if location:
        conditions.append(func.lower(listings.c.location).like(f"%{location.lower()}%"))
    if district:
        conditions.append(listings.c.district == district)
    if property_type:
        conditions.append(listings.c.property_type == property_type)
    if min_price is not None:
        conditions.append(listings.c.asking_price_usd >= min_price)
    if max_price is not None:
        conditions.append(listings.c.asking_price_usd <= max_price)
    if bedrooms_min is not None:
        conditions.append(listings.c.bedrooms >= bedrooms_min)
    if bathrooms_min is not None:
        conditions.append(listings.c.bathrooms >= bathrooms_min)
    if area_min is not None:
        conditions.append(listings.c.area_sq_m >= area_min)
    if area_max is not None:
        conditions.append(listings.c.area_sq_m <= area_max)
    if readiness:
        conditions.append(listings.c.readiness == readiness)

    order = listings.c.created_at.desc()
    if sort_by == "price_asc":
        order = listings.c.asking_price_usd.asc()
    elif sort_by == "price_desc":
        order = listings.c.asking_price_usd.desc()
    elif sort_by == "area_asc":
        order = listings.c.area_sq_m.asc()
    elif sort_by == "area_desc":
        order = listings.c.area_sq_m.desc()

    with session() as connection:
        total = connection.execute(select(func.count()).select_from(listings).where(*conditions)).scalar_one()
        rows = connection.execute(
            select(listings).where(*conditions).order_by(order, listings.c.id.desc()).limit(page_size).offset((page - 1) * page_size)
        ).fetchall()
    return rows, int(total)


def listing_by_id(listing_id: int) -> Any | None:
    with session() as connection:
        return connection.execute(select(listings).where(listings.c.id == listing_id, listings.c.published.is_(True))).first()


def listing_by_slug(slug: str) -> Any | None:
    with session() as connection:
        return connection.execute(select(listings).where(listings.c.slug == slug, listings.c.published.is_(True))).first()


def public_media_for_listing(listing_id: int) -> list[dict[str, Any]]:
    with session() as connection:
        rows = connection.execute(
            select(media)
            .where(media.c.listing_id == listing_id)
            .order_by(media.c.sort_order, media.c.id)
        ).fetchall()
    return [
        {
            "url": row._mapping["url"],
            "altText": row._mapping["alt_text"],
            "role": row._mapping["role"],
            "sortOrder": row._mapping["sort_order"],
            "sourceUrl": row._mapping["source_url"],
            "rightsBasis": row._mapping["rights_basis"],
        }
        for row in rows
    ]


def similar_listings(listing_id: int, limit: int = 3) -> list[Any] | None:
    source = listing_by_id(listing_id)
    if source is None:
        return None
    price = source._mapping["asking_price_usd"]
    with session() as connection:
        return connection.execute(
            select(listings)
            .where(
                listings.c.id != listing_id,
                listings.c.published.is_(True),
                listings.c.listing_status == "ACTIVE",
                listings.c.asking_price_usd.between(price * 0.7, price * 1.3),
            )
            .order_by(func.abs(listings.c.asking_price_usd - price))
            .limit(limit)
        ).fetchall()


def create_inquiry(values: dict[str, Any]) -> int:
    with session() as connection:
        result = connection.execute(inquiries.insert().values(**values))
        return int(result.inserted_primary_key[0])


def update_inquiry_delivery(inquiry_id: int, delivery_status: str) -> None:
    """Update operational delivery state without returning or logging lead PII."""
    with session() as connection:
        connection.execute(
            inquiries.update()
            .where(inquiries.c.id == inquiry_id)
            .values(
                delivery_status=delivery_status,
                delivery_attempts=inquiries.c.delivery_attempts + 1,
                last_delivery_at=datetime.now(UTC),
            )
        )


def consume_rate_limit(
    *,
    client_hash: str,
    route: str,
    maximum: int,
    window_seconds: int,
    now: datetime | None = None,
) -> bool:
    """Atomically-enough consume a privacy-preserving durable request budget.

    The stored identifier is an application-keyed digest, never a raw network
    address. Old events are pruned on write so the table remains bounded.
    """
    observed_at = now or datetime.now(UTC)
    cutoff = observed_at - timedelta(seconds=window_seconds)
    with session() as connection:
        connection.execute(rate_limit_events.delete().where(rate_limit_events.c.created_at < cutoff))
        used = connection.execute(
            select(func.count())
            .select_from(rate_limit_events)
            .where(
                rate_limit_events.c.client_hash == client_hash,
                rate_limit_events.c.route == route,
                rate_limit_events.c.created_at >= cutoff,
            )
        ).scalar_one()
        if int(used) >= maximum:
            return True
        connection.execute(
            rate_limit_events.insert().values(
                client_hash=client_hash,
                route=route,
                created_at=observed_at,
            )
        )
    return False


def clear_rate_limits() -> None:
    """Clear limiter events for deterministic local tests and operations."""
    with session() as connection:
        connection.execute(rate_limit_events.delete())


def upsert_admin_user(*, email: str, password_hash: str, role: str) -> int:
    if role not in {"admin", "editor"}:
        raise ValueError("Unsupported admin role.")
    normalized_email = email.strip().lower()
    with session() as connection:
        existing = connection.execute(select(admin_users.c.id).where(admin_users.c.email == normalized_email)).first()
        values = {"email": normalized_email, "password_hash": password_hash, "role": role, "active": True}
        if existing:
            connection.execute(admin_users.update().where(admin_users.c.id == existing[0]).values(**values))
            return int(existing[0])
        result = connection.execute(admin_users.insert().values(**values, created_at=datetime.now(UTC)))
        return int(result.inserted_primary_key[0])


def bootstrap_admin_users() -> None:
    """Idempotently bootstrap optional environment-configured operators."""
    configured = [
        (os.getenv("ADMIN_EMAIL", ""), os.getenv("ADMIN_PASSWORD_HASH", ""), "admin"),
        (os.getenv("EDITOR_EMAIL", ""), os.getenv("EDITOR_PASSWORD_HASH", ""), "editor"),
    ]
    for email, password_hash, role in configured:
        if email.strip() and password_hash.strip():
            upsert_admin_user(email=email, password_hash=password_hash, role=role)


def admin_user_by_email(email: str) -> Any | None:
    with session() as connection:
        return connection.execute(
            select(admin_users).where(admin_users.c.email == email.strip().lower(), admin_users.c.active.is_(True))
        ).first()


def create_admin_session(*, id_hash: str, user_id: int, csrf_hash: str, expires_at: datetime) -> None:
    now = datetime.now(UTC)
    with session() as connection:
        connection.execute(admin_sessions.delete().where(admin_sessions.c.expires_at < now))
        connection.execute(
            admin_sessions.insert().values(
                id_hash=id_hash,
                user_id=user_id,
                csrf_hash=csrf_hash,
                expires_at=expires_at,
                created_at=now,
            )
        )


def admin_session_by_hash(id_hash: str) -> Any | None:
    now = datetime.now(UTC)
    with session() as connection:
        connection.execute(admin_sessions.delete().where(admin_sessions.c.expires_at < now))
        return connection.execute(
            select(
                admin_sessions.c.id_hash,
                admin_sessions.c.csrf_hash,
                admin_sessions.c.expires_at,
                admin_users.c.id.label("user_id"),
                admin_users.c.email,
                admin_users.c.role,
            )
            .select_from(admin_sessions.join(admin_users, admin_sessions.c.user_id == admin_users.c.id))
            .where(admin_sessions.c.id_hash == id_hash, admin_users.c.active.is_(True))
        ).first()


def delete_admin_session(id_hash: str) -> None:
    with session() as connection:
        connection.execute(admin_sessions.delete().where(admin_sessions.c.id_hash == id_hash))


def admin_catalogue_rows() -> list[Any]:
    with session() as connection:
        return connection.execute(select(listings).order_by(listings.c.updated_at.desc(), listings.c.id.desc())).fetchall()


def admin_media_rows(listing_id: int) -> list[Any]:
    with session() as connection:
        return connection.execute(
            select(media).where(media.c.listing_id == listing_id).order_by(media.c.sort_order, media.c.id)
        ).fetchall()


def update_listing_from_admin(listing_id: int, values: dict[str, Any]) -> bool:
    allowed = {
        "title",
        "description",
        "asking_price_usd",
        "listing_status",
        "readiness",
        "published",
        "source_label",
        "floor_plan_url",
    }
    update_values = {key: value for key, value in values.items() if key in allowed}
    update_values["updated_at"] = datetime.now(UTC)
    with session() as connection:
        result = connection.execute(listings.update().where(listings.c.id == listing_id).values(**update_values))
        return bool(result.rowcount)


def update_media_from_admin(media_id: int, values: dict[str, Any]) -> bool:
    allowed = {"alt_text", "sort_order", "source_url", "rights_basis"}
    update_values = {key: value for key, value in values.items() if key in allowed}
    with session() as connection:
        result = connection.execute(media.update().where(media.c.id == media_id).values(**update_values))
        return bool(result.rowcount)


def admin_inquiry_rows() -> list[Any]:
    with session() as connection:
        return connection.execute(select(inquiries).order_by(inquiries.c.created_at.desc(), inquiries.c.id.desc())).fetchall()


def inquiry_by_id(inquiry_id: int) -> Any | None:
    with session() as connection:
        return connection.execute(select(inquiries).where(inquiries.c.id == inquiry_id)).first()


def record_audit_event(
    *,
    actor_user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    with session() as connection:
        connection.execute(
            audit_events.insert().values(
                actor_user_id=actor_user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details=json.dumps(details or {}, separators=(",", ":")),
                created_at=datetime.now(UTC),
            )
        )


def database_ready() -> bool:
    with session() as connection:
        connection.execute(select(listings.c.id).limit(1)).first()
    return True


def all_public_listings() -> list[Any]:
    with session() as connection:
        return connection.execute(
            select(listings)
            .where(listings.c.published.is_(True))
            .order_by(listings.c.district, listings.c.id)
        ).fetchall()


def all_areas_with_stats() -> list[dict[str, Any]]:
    with session() as connection:
        area_rows = connection.execute(select(areas).order_by(areas.c.id)).fetchall()
        result: list[dict[str, Any]] = []
        for area_row in area_rows:
            values = dict(area_row._mapping)
            stats = connection.execute(
                select(
                    func.count(listings.c.id),
                    func.min(listings.c.asking_price_usd),
                    func.max(listings.c.asking_price_usd),
                ).where(
                    listings.c.published.is_(True),
                    listings.c.district == values["name"],
                )
            ).one()
            values.update(count=int(stats[0]), min_price=stats[1], max_price=stats[2])
            result.append(values)
        return result


def area_with_listings(slug: str) -> tuple[dict[str, Any], list[Any]] | None:
    with session() as connection:
        area_row = connection.execute(select(areas).where(areas.c.slug == slug)).first()
        if area_row is None:
            return None
        values = dict(area_row._mapping)
        rows = connection.execute(
            select(listings)
            .where(listings.c.published.is_(True), listings.c.district == values["name"])
            .order_by(listings.c.asking_price_usd)
        ).fetchall()
        return values, rows
