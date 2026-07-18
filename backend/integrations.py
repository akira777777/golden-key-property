"""Bounded lead delivery adapters.

Lead records are persisted before this module is called. Delivery failures only
change operational status, so a temporary integration outage cannot lose a lead.
No contact fields are written to application logs.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import smtplib
from email.message import EmailMessage
from typing import Any
from urllib.parse import unquote, urlparse

import httpx

from database import update_inquiry_delivery

logger = logging.getLogger("golden_key.integrations")


def _deliver_crm(payload: dict[str, Any]) -> bool:
    webhook_url = os.getenv("CRM_WEBHOOK_URL", "").strip()
    if not webhook_url:
        return False
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    headers = {"Content-Type": "application/json", "User-Agent": "Golden-Key-Lead-Delivery/1.0"}
    secret = os.getenv("CRM_WEBHOOK_SECRET", "").encode("utf-8")
    if secret:
        headers["X-Golden-Key-Signature"] = "sha256=" + hmac.new(secret, body, hashlib.sha256).hexdigest()
    with httpx.Client(timeout=8, follow_redirects=False) as client:
        response = client.post(webhook_url, content=body, headers=headers)
        response.raise_for_status()
    return True


def _deliver_email(inquiry_id: int, payload: dict[str, Any]) -> bool:
    smtp_url = os.getenv("SMTP_URL", "").strip()
    recipient = os.getenv("LEAD_FALLBACK_EMAIL", "").strip()
    if not smtp_url or not recipient:
        return False
    parsed = urlparse(smtp_url)
    if parsed.scheme not in {"smtp", "smtps"} or not parsed.hostname:
        raise ValueError("SMTP_URL must use smtp:// or smtps:// with a hostname.")

    message = EmailMessage()
    sender = os.getenv("LEAD_FROM_EMAIL", "").strip() or recipient
    message["From"] = sender
    message["To"] = recipient
    message["Subject"] = f"Golden Key inquiry #{inquiry_id}"
    message.set_content(
        "\n".join(
            [
                f"Inquiry ID: {inquiry_id}",
                f"Property ID: {payload['propertyId']}",
                f"Name: {payload['fullName']}",
                f"Email: {payload['email']}",
                f"Phone: {payload.get('phone') or 'Not supplied'}",
                f"Purpose: {payload['purpose']}",
                f"Budget USD: {payload.get('budgetUsd') or 'Not supplied'}",
                f"Preferred channel: {payload['preferredChannel']}",
                f"Message: {payload['message']}",
                f"Marketing consent: {payload['consentMarketing']}",
            ]
        )
    )

    port = parsed.port or (465 if parsed.scheme == "smtps" else 587)
    smtp_class = smtplib.SMTP_SSL if parsed.scheme == "smtps" else smtplib.SMTP
    with smtp_class(parsed.hostname, port, timeout=8) as connection:
        if parsed.scheme == "smtp":
            connection.starttls()
        if parsed.username:
            connection.login(unquote(parsed.username), unquote(parsed.password or ""))
        connection.send_message(message)
    return True


def deliver_inquiry(inquiry_id: int, payload: dict[str, Any]) -> None:
    """Try CRM first, then email, recording only a retryable delivery state."""
    crm_configured = bool(os.getenv("CRM_WEBHOOK_URL", "").strip())
    email_configured = bool(os.getenv("SMTP_URL", "").strip() and os.getenv("LEAD_FALLBACK_EMAIL", "").strip())
    if not crm_configured and not email_configured:
        update_inquiry_delivery(inquiry_id, "NOT_CONFIGURED")
        logger.info("lead_delivery id=%d status=NOT_CONFIGURED", inquiry_id)
        return

    if crm_configured:
        try:
            if _deliver_crm(payload):
                update_inquiry_delivery(inquiry_id, "DELIVERED_CRM")
                logger.info("lead_delivery id=%d status=DELIVERED_CRM", inquiry_id)
                return
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("lead_delivery id=%d channel=crm status=FAILED error_type=%s", inquiry_id, type(exc).__name__)

    if email_configured:
        try:
            if _deliver_email(inquiry_id, payload):
                update_inquiry_delivery(inquiry_id, "DELIVERED_EMAIL")
                logger.info("lead_delivery id=%d status=DELIVERED_EMAIL", inquiry_id)
                return
        except (OSError, smtplib.SMTPException, ValueError) as exc:
            logger.warning("lead_delivery id=%d channel=email status=FAILED error_type=%s", inquiry_id, type(exc).__name__)

    update_inquiry_delivery(inquiry_id, "FAILED")
    logger.warning("lead_delivery id=%d status=FAILED", inquiry_id)
