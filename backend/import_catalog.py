"""Validate and idempotently import CMS/CDN catalogue records from JSON.

The importer refuses untraceable media and known random stock-image sources.
It is designed for a release job after Alembic migrations have completed.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import select

from database import listings, media, session

SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
PROPERTY_TYPES = {"APARTMENT", "PENTHOUSE", "VILLA", "TOWNHOUSE", "DUPLEX", "LOFT"}
STATUSES = {"ACTIVE", "PENDING", "SOLD"}
READINESS = {"READY", "OFF_PLAN"}


def _parse_datetime(value: str | None, field: str) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{field} must be an ISO-8601 timestamp.") from exc
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def _validate_media_url(url: str, *, demo: bool) -> None:
    if "unsplash.com" in url.lower():
        raise ValueError("Unsplash URLs are not accepted as listing inventory media.")
    cdn_base = os.getenv("MEDIA_CDN_BASE_URL", "").strip().rstrip("/")
    if url.startswith("/static/") and demo:
        return
    if cdn_base and url.startswith(f"{cdn_base}/"):
        return
    raise ValueError("Media URL must use MEDIA_CDN_BASE_URL; bundled /static assets are demo-only.")


def validate_record(record: dict[str, Any]) -> dict[str, Any]:
    required = ["slug", "title", "district", "propertyType", "priceUsd", "description", "areaSqM", "media"]
    missing = [field for field in required if record.get(field) in (None, "", [])]
    if missing:
        raise ValueError("Missing required fields: " + ", ".join(missing))
    slug = str(record["slug"])
    if not SLUG_PATTERN.fullmatch(slug):
        raise ValueError("slug must be stable lowercase kebab-case.")
    demo = bool(record.get("isDemo", False))
    property_type = str(record.get("propertyType", ""))
    listing_status = str(record.get("listingStatus", "ACTIVE"))
    readiness = str(record.get("readiness", "READY"))
    if property_type not in PROPERTY_TYPES or listing_status not in STATUSES or readiness not in READINESS:
        raise ValueError("Unsupported property type, status or readiness value.")
    if float(record["priceUsd"]) <= 0 or float(record["areaSqM"]) <= 0:
        raise ValueError("priceUsd and areaSqM must be positive.")
    if not demo and not str(record.get("sourceLabel", "")).strip():
        raise ValueError("Non-demo records require sourceLabel.")

    normalized_media: list[dict[str, Any]] = []
    for index, item in enumerate(record["media"]):
        if not isinstance(item, dict):
            raise ValueError(f"media[{index}] must be an object.")
        for field in ("url", "altText", "rightsBasis"):
            if not str(item.get(field, "")).strip():
                raise ValueError(f"media[{index}].{field} is required.")
        _validate_media_url(str(item["url"]), demo=demo)
        verified_at = _parse_datetime(item.get("rightsVerifiedAt"), f"media[{index}].rightsVerifiedAt")
        if not demo and verified_at is None:
            raise ValueError(f"media[{index}] needs rightsVerifiedAt before a real record can publish.")
        normalized_media.append(
            {
                "role": str(item.get("role", "HERO" if index == 0 else "GALLERY")),
                "url": str(item["url"]),
                "alt_text": str(item["altText"]).strip(),
                "sort_order": int(item.get("sortOrder", index)),
                "source_url": str(item.get("sourceUrl") or "").strip() or None,
                "rights_basis": str(item["rightsBasis"]).strip(),
                "rights_verified_at": verified_at,
                "mime_type": str(item.get("mimeType") or "").strip() or None,
                "width": int(item["width"]) if item.get("width") else None,
                "height": int(item["height"]) if item.get("height") else None,
            }
        )
    normalized_media.sort(key=lambda item: item["sort_order"])
    now = datetime.now(UTC)
    return {
        "slug": slug,
        "title": str(record["title"]).strip(),
        "location": str(record.get("location") or f"{record['district']}, Dubai, UAE").strip(),
        "district": str(record["district"]).strip(),
        "property_type": property_type,
        "asking_price_usd": float(record["priceUsd"]),
        "description": str(record["description"]).strip(),
        "image_url": normalized_media[0]["url"],
        "bedrooms": int(record.get("bedrooms", 0)),
        "bathrooms": float(record.get("bathrooms", 0)),
        "area_sq_m": float(record["areaSqM"]),
        "listing_status": listing_status,
        "readiness": readiness,
        "handover_label": str(record.get("handoverLabel") or "").strip() or None,
        "tour_type": str(record.get("tourType", "NONE")),
        "tour_url": str(record.get("tourUrl") or "").strip() or None,
        "images": json.dumps([item["url"] for item in normalized_media]),
        "latitude": float(record["latitude"]) if record.get("latitude") is not None else None,
        "longitude": float(record["longitude"]) if record.get("longitude") is not None else None,
        "year_built": int(record["yearBuilt"]) if record.get("yearBuilt") else None,
        "parking": int(record["parking"]) if record.get("parking") is not None else None,
        "features": json.dumps([str(value) for value in record.get("features", [])]),
        "floor_plan_url": str(record.get("floorPlanUrl") or "").strip() or None,
        "is_demo": demo,
        "published": bool(record.get("published", False)),
        "source_label": str(record.get("sourceLabel") or "").strip() or None,
        "created_at": _parse_datetime(record.get("createdAt"), "createdAt") or now,
        "updated_at": now,
        "media": normalized_media,
    }


def import_records(records: list[dict[str, Any]], *, dry_run: bool = False) -> int:
    validated = [validate_record(record) for record in records]
    if dry_run:
        return len(validated)
    with session() as connection:
        for record in validated:
            media_rows = record.pop("media")
            existing = connection.execute(select(listings.c.id).where(listings.c.slug == record["slug"])).first()
            if existing:
                listing_id = int(existing[0])
                connection.execute(listings.update().where(listings.c.id == listing_id).values(**record))
                connection.execute(media.delete().where(media.c.listing_id == listing_id))
            else:
                result = connection.execute(listings.insert().values(**record))
                listing_id = int(result.inserted_primary_key[0])
            connection.execute(media.insert(), [{**item, "listing_id": listing_id} for item in media_rows])
    return len(validated)


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate and import Golden Key CMS catalogue JSON.")
    parser.add_argument("file", type=Path, help="JSON array of catalogue records")
    parser.add_argument("--dry-run", action="store_true", help="Validate without writing")
    args = parser.parse_args()
    records = json.loads(args.file.read_text(encoding="utf-8"))
    if not isinstance(records, list):
        raise SystemExit("Import file must contain a JSON array.")
    count = import_records(records, dry_run=args.dry_run)
    print(f"Validated {count} catalogue record(s)." if args.dry_run else f"Imported {count} catalogue record(s).")


if __name__ == "__main__":
    main()
