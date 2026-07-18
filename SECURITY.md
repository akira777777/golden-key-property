# Security policy

## Reporting a vulnerability

Please email security@example.com (replace with the real address before publishing) with:

- A clear description of the issue
- Reproduction steps
- Impact assessment
- Your contact details

We respond within **3 business days** and aim to ship a fix within **30 days** for high-impact issues.

## Hardening checklist (already in place)

- [x] Strict Content-Security-Policy (`default-src 'self'`, no inline scripts)
- [x] HTTP security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- [x] Permissions-Policy locked down (camera, geolocation, microphone disabled by default)
- [x] Rate limit on `POST /api/inquiries` (5 requests per IP per 60 s by default)
- [x] Pydantic v2 input validation
- [x] Custom XSS sanitizer for text fields (strips `<script>`, `<style>`, and all tags)
- [x] CORS allowlist (no wildcard)
- [x] No payment / KYC / withdrawal endpoints — informational-only posture enforced by test suite
- [x] SQL via parameterized queries only (no string interpolation in `execute()`)
- [x] Static `model-viewer` loaded from a pinned CDN version (no `latest` tag)

## Production recommendations

1. **TLS termination** — front the app with Caddy / nginx / Cloudflare.
2. **WAF** — enable a managed WAF in front of the app to absorb common scanner traffic.
3. **Log aggregation** — pipe structured `logger.info` / `logger.warning` lines to a centralized log sink.
4. **CSP nonce** — if you ever inline a `<script>` (don't, unless forced), use a per-request nonce and update CSP to `script-src 'self' 'nonce-...'`.
5. **Rotate `ALLOWED_ORIGINS`** when you change frontend domains — the app reads it on startup.
6. **Backups** — if you mount a persistent volume for SQLite, snapshot it on a schedule.
7. **Health check** — point your platform's health probe at `/health` (returns `{"status":"ok"}` when DB is reachable).

## Threat model

This product is intentionally narrow in scope:

- It is a **public-facing catalogue**, not an authenticated service.
- It accepts **one** kind of write: viewing inquiries (rate-limited, sanitized).
- It serves **no** user-specific data and stores **no** PII beyond what a user types in an inquiry.
- It has **no** session, no cookie auth, no JWT, no OAuth — by design.

What an attacker could try:

- **Spam inquiries** — mitigated by rate-limit (5 / 60 s per IP) and HTML sanitization.
- **XSS via inquiry text** — mitigated by sanitizer (tested).
- **CSP bypass** — mitigated by pinning model-viewer to a specific version and `default-src 'self'`.
- **Path traversal** — mitigated by FastAPI's static-file handling and the absence of dynamic file paths.
- **SQL injection** — mitigated by parameterized queries and Pydantic input validation.

What this product **does not** protect against:

- DDoS at the network edge — handle at the CDN / WAF layer.
- A compromised CDN (use Subresource Integrity for any third-party `<script>` you add in the future).

## Disclosure timeline

We follow **coordinated disclosure**: 90 days from report to public disclosure, or sooner if a fix is shipped.