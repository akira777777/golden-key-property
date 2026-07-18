# Golden Key Property Listings

A clean, informational property catalogue with private viewing inquiries. Built for international property advisory in Dubai and other prime locations.

> **Informational only.** This site does not accept payments, custody assets, promise returns, process withdrawals, or perform identity verification. All listings require independent verification with a licensed local broker before any commitment.

---

## Live features

- **Catalog API** — paginated, filtered listings (`/api/properties`, `/api/properties/{id}`, `/api/properties/{id}/similar`)
- **3D / virtual tours** — `PHOTO_360`, `MODEL_3D`, `VIDEO_3D` via `/api/properties/{id}/tour`
- **Inquiry intake** — rate-limited, HTML-sanitized form (`/api/inquiries`)
- **Multi-language UI** — Russian, English, German, Spanish (locale-aware prices, dates, plurals)
- **Production-grade security**
  - Strict Content-Security-Policy (`default-src 'self'`, no inline, no eval)
  - X-Frame-Options: DENY, X-Content-Type-Options: nosniff
  - Permissions-Policy locked down (no camera/geo/mic without consent)
  - In-memory sliding-window rate-limit per IP (5 / 60 s default)
  - Pydantic v2 input validation + custom XSS sanitizer on text fields
- **Modern front-end** — OKLCH design tokens, container queries, View Transitions API, scroll-driven animations, full `prefers-reduced-motion` respect
- **Health & ops** — `/health` endpoint, structured logging, Docker healthcheck
- **SEO & discovery** — Open Graph, Twitter cards, JSON-LD Organization schema, `sitemap.xml`, `robots.txt`, PWA manifest

## Tech stack

| Layer    | Choice                                            |
| -------- | ------------------------------------------------- |
| Runtime  | Python 3.12+                                      |
| API      | FastAPI + Pydantic v2                             |
| DB       | SQLite (file-backed, schema migrated in-place)    |
| Front    | Vanilla HTML / CSS / JS (no framework), i18n.js   |
| 3D       | `@google/model-viewer` for `.glb`, iframe otherwise |
| Deploy   | Docker Compose, Vercel (`@vercel/python`)         |
| CI       | GitHub Actions: ruff lint, unit tests, docker build |

## Quick start

### Local (Python)

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

Open http://127.0.0.1:8000

### Docker

```bash
docker compose up --build
```

Open http://127.0.0.1:8000

## Tests

```bash
cd backend
python -m unittest -v test_main.py
```

The test suite covers: landing-page rendering, asset MIME types, security headers, pagination, filtering, validation, rate-limiting, XSS sanitization, similar-listings endpoint, and a compliance test that asserts retired payment / KYC / withdrawal endpoints stay 404.

## Configuration

Copy `backend/.env.example` to `.env` and adjust:

| Variable                 | Default                          | Description                                   |
| ------------------------ | -------------------------------- | --------------------------------------------- |
| `PROPERTY_LISTINGS_DB_PATH` | `property_listings.db`         | SQLite database path                          |
| `ALLOWED_ORIGINS`        | `localhost:3000`, `localhost:5500` | Comma-separated CORS allowlist              |
| `RATE_LIMIT_MAX`         | `5`                              | Max inquiry submissions per IP per window     |
| `RATE_LIMIT_WINDOW`      | `60`                             | Rate-limit window in seconds                  |

## Deployment

### Vercel

The `vercel.json` file pins Python 3.12, sets CORS origins for `*.vercel.app`, and routes everything through `backend/main.py`. SQLite is stored at `/tmp/property_listings.db` (ephemeral — restart wipes data, which is fine for a public catalogue).

### Docker Compose

The `api` service exposes port 8000, mounts a named volume for the SQLite file, and runs a healthcheck against `/health` every 30 seconds.

### Environment hardening for production

For investor-grade deployment:

1. Set `ALLOWED_ORIGINS` to your real frontend domain
2. Lower `RATE_LIMIT_MAX` to 3 if you expect higher inquiry volume per IP
3. Front the app with a TLS-terminating reverse proxy (Caddy / nginx / Cloudflare)
4. Run behind a WAF that blocks common scanner traffic
5. Log aggregation: pipe `stdout` to your platform's log sink — the app uses structured `logger.info` / `logger.warning`

## Documentation

Full reference for the API, data model, deployment, and compliance posture is available at **`/docs`** once the server is running. Sidebar TOC with anchor links, code examples in curl / Python / JavaScript tabs, copy-to-clipboard buttons, and legal disclaimers specific to Dubai (DLD / RERA).

## Compliance posture

This product is built to be informational only and stays that way:

- No payment endpoint exists (and never has — see the compliance test `test_does_not_expose_financial_or_identity_collection_workflows`).
- No KYC, no dashboard, no withdrawal step.
- All response payloads include a `notice` field reiterating that listing data is illustrative and subject to verification by a licensed broker.
- The Dubai-specific disclaimer in `/docs` reminds readers that any transaction must go through a DLD-registered broker.

## Structure

```
golden-key-dubai/
├── backend/
│   ├── main.py              # FastAPI app (listings, inquiries, tours, health)
│   ├── test_main.py         # Unit + integration tests
│   ├── static/              # Frontend assets (HTML / CSS / JS / images)
│   │   ├── docs/            # Documentation page (/docs)
│   │   ├── css/             # Stylesheets (styles.css + docs.css)
│   │   ├── index.html       # Landing page
│   │   ├── 404.html         # 404 page
│   │   ├── app.js           # Landing client (catalog, dialogs, i18n)
│   │   ├── docs.js          # Docs client (TOC, tabs, copy)
│   │   ├── i18n.js          # Locale strings (ru / en / de / es)
│   │   ├── manifest.webmanifest
│   │   ├── robots.txt
│   │   └── sitemap.xml
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
├── vercel.json
├── README.md
├── SECURITY.md
├── LICENSE
└── .github/workflows/ci.yml
```

## License

MIT — see [LICENSE](./LICENSE).