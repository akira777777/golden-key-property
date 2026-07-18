# Implementation Plan: Golden Key Property Production Release

## Overview

Bring the existing FastAPI + vanilla HTML/CSS/JavaScript application to a production-ready property catalogue and lead-generation channel without changing its quiet-premium visual language. The current FastAPI/static surface is the deployed product; the incomplete `src/` Next.js experiment is out of scope and will not become a second production stack.

## Baseline Findings

- The hero copy exists in HTML but CSS hides it until `app.js` adds `.is-ready`; a JavaScript failure can therefore leave the hero blank.
- Catalogue skeletons exist, but error/empty states have no retry action and the inquiry selector is incorrectly reduced to the current filtered result.
- Bedrooms and sort controls are visible but untranslated and are not included in the API request.
- Mobile at 390 px overflows to 505 px because the header CTA remains in the grid; the open menu is rendered off-screen.
- Quick view, inquiry, comparison, and 3D dialogs open, but transitions take about two seconds before they are visually stable; comparison actions are hard to scan and the 3D assets are demonstrative geometry.
- Only five active demo records are visible, with generic remote images and no stable property routes.
- Production deployment still points SQLite at `/tmp`; the current unit suite has 26 passing and 2 stale SEO assertions.

## Architecture Decisions

- Keep FastAPI, server-rendered/static HTML, CSS tokens, and vanilla JavaScript. Do not migrate to Next.js.
- Use SQLAlchemy Core with `DATABASE_URL`: PostgreSQL is mandatory in hosted production, while SQLite remains an explicit local/test fallback only.
- Manage schema changes through numbered Alembic migrations and a repeatable demo seed/import command.
- Preserve the existing additive public API shape. New filters and fields are optional camelCase additions; errors keep the existing `{error: {code, message, details?}}` contract.
- Render SEO pages server-side with Jinja templates and per-request canonical/OG/JSON-LD values.
- Treat seeded records and media as demonstrative. Production publishing requires verified source and rights metadata.
- Keep authentication server-side. Admin/editor users are configured with password hashes, receive short-lived httpOnly signed sessions, and all protected mutations require role and CSRF checks.
- Store leads first, then deliver to CRM/email in a bounded background task. Logs contain lead IDs and delivery status, never contact fields.

## Dependency Graph

```text
Database URL + migrations
  -> listing/media/lead schema
     -> public API filters and slug lookup
        -> catalogue states and property/area pages
     -> admin authentication and CRUD
     -> CRM/email delivery and durable rate limiting

Shared page metadata + media model
  -> canonical/JSON-LD/sitemap
  -> responsive gallery and images

Unit/API contracts
  -> E2E flows
     -> browser QA and Lighthouse acceptance
```

## Task List

### Phase 1: Critical Reliability

- [ ] Task 1: Add failing regression tests for no-JS hero visibility, catalogue retry/empty markup, and complete RU/EN filter keys.
- [ ] Task 2: Make the hero visible by default, shorten progressive motion, and repair the 390 px header/menu overflow.
- [ ] Task 3: Implement distinct skeleton, empty, and error catalogue states with a retry button and accessible live announcements.
- [ ] Task 4: Wire bedrooms and sort filters to the existing API and keep the inquiry selector independent from filtered results.
- [ ] Task 5: Persist favourites and comparison IDs (maximum three), then repair comparison layout and focus restoration.

### Checkpoint: Critical Reliability

- [ ] Unit/API tests pass.
- [ ] Hero remains readable when `app.js` is blocked.
- [ ] Desktop and 390 px mobile have no horizontal overflow.
- [ ] Catalogue has working loading, empty, error, retry, filter, favourite, and compare states.

### Phase 2: Durable Data and Content Model

- [ ] Task 6: Introduce SQLAlchemy database access and environment validation without breaking the current API contract.
- [ ] Task 7: Add Alembic migrations for listings, media, areas, leads, admin audit events, and rate-limit events.
- [ ] Task 8: Add stable slugs and the full catalogue filter model (district, type, bedrooms, bathrooms, area, readiness, price, sort, pagination).
- [ ] Task 9: Add an idempotent set of at least 20 clearly labelled demo records across the six requested areas.
- [ ] Task 10: Add media rights/source/alt/order/role fields plus a documented CDN import workflow for WebP/AVIF assets.

### Checkpoint: Data Foundation

- [ ] Hosted production refuses ephemeral SQLite.
- [ ] Migrations upgrade an empty PostgreSQL database.
- [ ] Demo seed is idempotent and public records expose stable slugs.

### Phase 3: Lead-Generation Pages

- [ ] Task 11: Build `/properties/{slug}` with gallery/lightbox, plan, facts, amenities, map/distances, status, price per m2, similar listings, and both lead CTAs.
- [ ] Task 12: Build `/properties` as a shareable URL-filtered catalogue with pagination or load-more.
- [ ] Task 13: Build `/areas` and six area routes/cards with demo-safe positioning, price ranges derived from published records, and filtered catalogue links.
- [ ] Task 14: Add Why Dubai, transaction process, factual FAQ, and environment-driven contact channels; omit testimonials until approved material exists.
- [ ] Task 15: Add Privacy, Cookie, and Terms pages with explicit placeholders for owner-supplied company/RERA details.

### Phase 4: Lead Operations and Admin

- [ ] Task 16: Expand the lead form contract with goal, budget, preferred channel, privacy consent, honeypot, and Turnstile verification.
- [ ] Task 17: Replace in-memory rate limiting with a durable, privacy-preserving database limiter.
- [ ] Task 18: Deliver stored leads to a configured CRM webhook and fallback email without logging PII.
- [ ] Task 19: Add admin/editor login, signed sessions, CSRF protection, and role enforcement.
- [ ] Task 20: Add protected listing/media/status/lead management screens and audit events.

### Checkpoint: Operations

- [ ] A redeploy does not erase listings or leads.
- [ ] Editors cannot access lead/admin-only actions.
- [ ] Lead delivery failures remain retryable and do not lose the stored lead.

### Phase 5: SEO, Accessibility, and Observability

- [ ] Task 21: Generate canonical/OG/Twitter/JSON-LD metadata from `SITE_URL` for every public route.
- [ ] Task 22: Generate sitemap/robots dynamically for property and area routes; keep branded 404 and add a safe 500 page.
- [ ] Task 23: Audit keyboard order, localized accessible names, focus traps/restoration, reduced motion, alt text, form errors, and responsive reflow.
- [ ] Task 24: Add optional Sentry initialization, structured PII-free events, database-aware health/readiness, backup/restore documentation, and CSP allowlists for configured integrations.

### Phase 6: Automated Acceptance and Delivery

- [ ] Task 25: Extend unit/API tests for migrations, filters, slugs, lead security, roles, SEO, and failure states.
- [ ] Task 26: Add automated browser tests for home, catalogue load/error/retry, filtering, property route, lead submission, RU/EN, comparison, 3D fallback, and mobile navigation.
- [ ] Task 27: Run the full suite, production build/smoke checks, responsive browser QA, and Lighthouse mobile.
- [ ] Task 28: Update README/deployment docs with migrations, environment variables, seed/import, backup/restore, and Vercel deployment steps.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Real company, contact, licence, and CRM details are not in the repository | Production cannot truthfully publish them | Keep values environment-driven and visibly block/omit unverified legal claims |
| No object-storage credentials or approved listing media are available | Cannot upload final real listing galleries | Implement the media/CDN contract and use clearly marked demo assets only |
| Existing generated 3D files do not represent real properties | Misleading user experience | Label demo tours and provide an accessible unavailable/fallback state |
| PostgreSQL is unavailable during local CI | Test drift between backends | Run fast SQLite contract tests plus a PostgreSQL service job in CI |
| Broad scope increases regression risk | Partial or tangled release | Deliver vertical slices with tests and browser checkpoints after each phase |

## Definition of Done

- No blank hero, endless loading, broken image, non-working CTA, untranslated control, or mobile horizontal overflow.
- Stable property and area URLs have correct metadata and are included in sitemap.
- Production uses managed PostgreSQL and migrations; demo/real publishing boundaries are explicit.
- Lead intake is consented, abuse-resistant, durably stored, and operationally delivered.
- Admin/editor permissions are enforced server-side.
- Unit, API, and E2E tests pass; Lighthouse mobile reaches Performance 85+, Accessibility 95+, SEO 95+ or remaining blockers are named with evidence.
