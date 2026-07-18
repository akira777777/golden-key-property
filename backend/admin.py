"""Protected admin/editor surface with server-side sessions and CSRF checks."""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from fastapi.templating import Jinja2Templates
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from database import (
    admin_catalogue_rows,
    admin_inquiry_rows,
    admin_media_rows,
    admin_session_by_hash,
    admin_user_by_email,
    create_admin_session,
    delete_admin_session,
    record_audit_event,
    serialize_listing,
    update_listing_from_admin,
    update_media_from_admin,
)

router = APIRouter(prefix="/admin", include_in_schema=False)
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")
password_hasher = PasswordHasher()
SESSION_COOKIE = "gk_admin_session"
SESSION_MAX_AGE = int(os.getenv("ADMIN_SESSION_SECONDS", "3600"))
_configured_session_secret = os.getenv("SESSION_SECRET", "").strip()
if os.getenv("ENVIRONMENT", "").lower() == "production" and len(_configured_session_secret) < 32:
    raise RuntimeError("SESSION_SECRET must contain at least 32 characters in production.")
SESSION_SECRET = _configured_session_secret or "local-development-session-secret"
serializer = URLSafeTimedSerializer(SESSION_SECRET, salt="golden-key-admin-v1")


def _digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _template(request: Request, name: str, context: dict[str, Any], status_code: int = 200) -> HTMLResponse:
    response = templates.TemplateResponse(request=request, name=name, context=context, status_code=status_code)
    response.headers["Cache-Control"] = "no-store, private"
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    return response


def _current_session(request: Request) -> dict[str, Any] | None:
    signed = request.cookies.get(SESSION_COOKIE)
    if not signed:
        return None
    try:
        payload = serializer.loads(signed, max_age=SESSION_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None
    if not isinstance(payload, dict) or not isinstance(payload.get("sid"), str) or not isinstance(payload.get("csrf"), str):
        return None
    row = admin_session_by_hash(_digest(payload["sid"]))
    if row is None:
        return None
    values = dict(row._mapping)
    if not hmac.compare_digest(values["csrf_hash"], _digest(payload["csrf"])):
        return None
    values["csrf_token"] = payload["csrf"]
    return values


def _require_csrf(session: dict[str, Any], supplied: Any) -> None:
    if not isinstance(supplied, str) or not hmac.compare_digest(_digest(supplied), session["csrf_hash"]):
        raise HTTPException(status_code=403, detail="CSRF validation failed.")


def _login_context(error: str | None = None) -> dict[str, Any]:
    return {
        "title": "Operator login | Golden Key",
        "description": "Protected Golden Key operator access.",
        "error": error,
    }


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request) -> Response:
    if _current_session(request):
        return RedirectResponse("/admin", status_code=303)
    return _template(request, "admin_login.html", _login_context())


@router.post("/login", response_class=HTMLResponse)
async def login(request: Request) -> Response:
    form = await request.form()
    email = str(form.get("email") or "").strip().lower()
    password = str(form.get("password") or "")
    user = admin_user_by_email(email)
    verified = False
    if user is not None:
        try:
            verified = password_hasher.verify(user._mapping["password_hash"], password)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            verified = False
    if not verified or user is None:
        return _template(request, "admin_login.html", _login_context("The email or password is not valid."), status_code=401)

    sid = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(32)
    create_admin_session(
        id_hash=_digest(sid),
        user_id=int(user._mapping["id"]),
        csrf_hash=_digest(csrf),
        expires_at=datetime.now(UTC) + timedelta(seconds=SESSION_MAX_AGE),
    )
    record_audit_event(actor_user_id=int(user._mapping["id"]), action="LOGIN", entity_type="SESSION")
    response = RedirectResponse("/admin", status_code=303)
    response.set_cookie(
        SESSION_COOKIE,
        serializer.dumps({"sid": sid, "csrf": csrf}),
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=os.getenv("ENVIRONMENT", "").lower() == "production",
        samesite="strict",
        path="/admin",
    )
    response.headers["Cache-Control"] = "no-store"
    return response


@router.get("", response_class=HTMLResponse)
async def dashboard(request: Request) -> Response:
    session = _current_session(request)
    if session is None:
        return RedirectResponse("/admin/login", status_code=303)
    listings = [serialize_listing(row) for row in admin_catalogue_rows()]
    return _template(
        request,
        "admin_dashboard.html",
        {
            "title": "Catalogue operations | Golden Key",
            "description": "Protected catalogue operations.",
            "session": session,
            "listings": listings,
        },
    )


@router.post("/logout")
async def logout(request: Request) -> RedirectResponse:
    session = _current_session(request)
    if session is not None:
        form = await request.form()
        _require_csrf(session, form.get("csrfToken"))
        signed = request.cookies.get(SESSION_COOKIE, "")
        try:
            payload = serializer.loads(signed, max_age=SESSION_MAX_AGE)
            delete_admin_session(_digest(payload["sid"]))
        except (BadSignature, SignatureExpired, KeyError, TypeError):
            pass
        record_audit_event(actor_user_id=session["user_id"], action="LOGOUT", entity_type="SESSION")
    response = RedirectResponse("/admin/login", status_code=303)
    response.delete_cookie(SESSION_COOKIE, path="/admin")
    response.headers["Cache-Control"] = "no-store"
    return response


@router.get("/listings/{listing_id}", response_class=HTMLResponse)
async def listing_editor(request: Request, listing_id: int) -> Response:
    session = _current_session(request)
    if session is None:
        return RedirectResponse("/admin/login", status_code=303)
    listing = next((serialize_listing(row) for row in admin_catalogue_rows() if row._mapping["id"] == listing_id), None)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found.")
    media = [dict(row._mapping) for row in admin_media_rows(listing_id)]
    return _template(
        request,
        "admin_listing.html",
        {
            "title": f"Edit {listing['title']} | Golden Key",
            "description": "Protected listing editor.",
            "session": session,
            "listing": listing,
            "media": media,
        },
    )


@router.post("/listings/{listing_id}")
async def update_listing(request: Request, listing_id: int) -> RedirectResponse:
    session = _current_session(request)
    if session is None:
        return RedirectResponse("/admin/login", status_code=303)
    form = await request.form()
    _require_csrf(session, form.get("csrfToken"))
    try:
        price = float(str(form.get("askingPriceUsd") or ""))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Price must be numeric.") from exc
    listing_status = str(form.get("listingStatus") or "")
    readiness = str(form.get("readiness") or "")
    if price <= 0 or listing_status not in {"ACTIVE", "PENDING", "SOLD"} or readiness not in {"READY", "OFF_PLAN"}:
        raise HTTPException(status_code=422, detail="Invalid listing values.")
    updated = update_listing_from_admin(
        listing_id,
        {
            "title": str(form.get("title") or "").strip(),
            "description": str(form.get("description") or "").strip(),
            "asking_price_usd": price,
            "listing_status": listing_status,
            "readiness": readiness,
            "published": form.get("published") == "on",
            "source_label": str(form.get("sourceLabel") or "").strip(),
            "floor_plan_url": str(form.get("floorPlanUrl") or "").strip() or None,
        },
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Listing not found.")
    record_audit_event(
        actor_user_id=session["user_id"],
        action="UPDATE_LISTING",
        entity_type="LISTING",
        entity_id=str(listing_id),
        details={"fields": ["title", "description", "price", "status", "readiness", "published", "source", "floor_plan"]},
    )
    return RedirectResponse(f"/admin/listings/{listing_id}?saved=1", status_code=303)


@router.post("/media/{media_id}")
async def update_media(request: Request, media_id: int) -> RedirectResponse:
    session = _current_session(request)
    if session is None:
        return RedirectResponse("/admin/login", status_code=303)
    form = await request.form()
    _require_csrf(session, form.get("csrfToken"))
    try:
        sort_order = int(str(form.get("sortOrder") or "0"))
        listing_id = int(str(form.get("listingId") or "0"))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid media values.") from exc
    updated = update_media_from_admin(
        media_id,
        {
            "alt_text": str(form.get("altText") or "").strip(),
            "sort_order": sort_order,
            "source_url": str(form.get("sourceUrl") or "").strip() or None,
            "rights_basis": str(form.get("rightsBasis") or "").strip(),
        },
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Media item not found.")
    record_audit_event(
        actor_user_id=session["user_id"],
        action="UPDATE_MEDIA",
        entity_type="MEDIA",
        entity_id=str(media_id),
    )
    return RedirectResponse(f"/admin/listings/{listing_id}?mediaSaved=1", status_code=303)


@router.get("/leads", response_class=HTMLResponse)
async def leads(request: Request) -> Response:
    session = _current_session(request)
    if session is None:
        return RedirectResponse("/admin/login", status_code=303)
    if session["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin role required.")
    rows = [dict(row._mapping) for row in admin_inquiry_rows()]
    return _template(
        request,
        "admin_leads.html",
        {
            "title": "Lead operations | Golden Key",
            "description": "Protected lead operations.",
            "session": session,
            "leads": rows,
        },
    )
