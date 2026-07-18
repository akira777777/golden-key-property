# ruff: noqa: E402
import os
import re
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

TEST_DB_PATH = Path(tempfile.gettempdir()) / "golden_key_property_listings_test.db"
TEST_DB_PATH.unlink(missing_ok=True)
os.environ["PROPERTY_LISTINGS_DB_PATH"] = str(TEST_DB_PATH)

from main import app

client = TestClient(app)


def tearDownModule():
    TEST_DB_PATH.unlink(missing_ok=True)


class PropertyListingsApiTests(unittest.TestCase):
    def setUp(self):
        from database import clear_rate_limits

        clear_rate_limits()

    def test_serves_a_public_property_landing_page(self):
        response = client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response.headers["content-type"])
        self.assertIn("Golden Key", response.text)
        self.assertIn("Подобрать объект", response.text)
        self.assertIn("data-catalog-filters", response.text)

    def test_serves_landing_page_assets(self):
        response = client.get("/static/styles.css")

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/css", response.headers["content-type"])

    def test_serves_landing_page_catalog_script(self):
        response = client.get("/static/app.js")

        self.assertEqual(response.status_code, 200)
        self.assertIn("fetch", response.text)

    def test_hero_copy_stays_visible_without_javascript(self):
        landing = client.get("/")
        styles = client.get("/static/styles.css")

        self.assertIn('id="hero-title"', landing.text)
        self.assertIn("Недвижимость в", landing.text)
        self.assertIn(".hero.is-priming .hero__content > *", styles.text)
        self.assertNotIn(
            ".hero__content > *,\n  .hero__footer { opacity: 0",
            styles.text,
        )

    def test_catalog_client_has_retry_empty_and_error_states(self):
        script = client.get("/static/app.js").text

        self.assertIn("function showCatalogEmpty", script)
        self.assertIn("function showCatalogError", script)
        self.assertIn("data-catalog-retry", script)
        self.assertIn("catalog.retry", script)

    def test_catalog_controls_are_translated_and_wired_to_the_api(self):
        script = client.get("/static/app.js").text
        translations = client.get("/static/i18n.js").text

        self.assertIn('params.set("bedroomsMin"', script)
        self.assertIn('params.set("sortBy"', script)
        for key in (
            "filter.bedrooms.label",
            "filter.bedrooms.any",
            "filter.sort.label",
            "filter.sort.default",
            "filter.sort.priceAsc",
            "filter.sort.priceDesc",
            "filter.sort.areaDesc",
            "filter.sort.newest",
        ):
            self.assertGreaterEqual(
                translations.count(f'"{key}"'),
                4,
                f"{key} must be defined for ru/en/de/es",
            )

    def test_mobile_header_hides_the_secondary_cta_and_prevents_overflow(self):
        styles = client.get("/static/styles.css").text

        self.assertIn(".header-cta { display: none; }", styles)
        self.assertIn(".scroll-progress { display: none; }", styles)
        self.assertIn("max-inline-size: 100%", styles)

    def test_favourites_and_compare_are_persisted_client_side(self):
        script = client.get("/static/app.js").text

        self.assertIn('"gk.favorites"', script)
        self.assertIn('"gk.compare"', script)
        self.assertIn("localStorage.getItem", script)
        self.assertIn("localStorage.setItem", script)
        self.assertIn("data-favorite-property", script)
        self.assertIn("selectedCompareIds.length >= 3", script)

    def test_comparison_actions_remain_table_cells(self):
        styles = client.get("/static/styles.css").text

        actions_rule = styles.split(".compare-table__actions {", 1)[1].split("}", 1)[0]
        self.assertNotIn("display: flex", actions_rule)
        self.assertIn("overflow-x: auto", styles)

    def test_serves_landing_page_favicon(self):
        response = client.get("/static/favicon.svg")

        self.assertEqual(response.status_code, 200)
        self.assertIn("image/svg+xml", response.headers["content-type"])

    def test_applies_security_headers_to_the_public_landing_page(self):
        response = client.get("/")

        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertEqual(response.headers["x-frame-options"], "DENY")
        self.assertEqual(response.headers["referrer-policy"], "strict-origin-when-cross-origin")
        self.assertIn("default-src 'self'", response.headers["content-security-policy"])

    def test_lists_paginated_property_listings(self):
        response = client.get("/api/properties", params={"page": 1, "pageSize": 2})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload["data"]), 2)
        self.assertGreater(payload["pagination"]["totalItems"], 0)
        self.assertIn("askingPriceUsd", payload["data"][0])
        self.assertNotIn("roiPercent", payload["data"][0])

    def test_demo_catalog_has_twenty_records_with_stable_slugs(self):
        response = client.get("/api/properties", params={"pageSize": 100})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(payload["pagination"]["totalItems"], 20)
        for listing in payload["data"]:
            self.assertRegex(listing["slug"], r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
            self.assertTrue(listing["isDemo"])

    def test_gets_property_by_stable_slug(self):
        listing = client.get("/api/properties", params={"pageSize": 1}).json()["data"][0]

        response = client.get(f'/api/properties/by-slug/{listing["slug"]}')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["id"], listing["id"])

    def test_filters_by_district_type_bathrooms_area_and_readiness(self):
        response = client.get(
            "/api/properties",
            params={
                "district": "Dubai Marina",
                "propertyType": "APARTMENT",
                "bathroomsMin": 2,
                "areaMin": 120,
                "readiness": "READY",
                "pageSize": 100,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreater(payload["pagination"]["totalItems"], 0)
        for listing in payload["data"]:
            self.assertEqual(listing["district"], "Dubai Marina")
            self.assertEqual(listing["propertyType"], "APARTMENT")
            self.assertGreaterEqual(listing["bathrooms"], 2)
            self.assertGreaterEqual(listing["areaSqM"], 120)
            self.assertEqual(listing["readiness"], "READY")

    def test_filters_property_listings_by_status_location_and_price(self):
        # PENDING + Jumeirah Bay + price band 17M..19M should isolate id=6
        # (Jumeirah Bay Island Beachfront Villa, $18,000,000, status PENDING).
        response = client.get(
            "/api/properties",
            params={
                "listingStatus": "PENDING",
                "location": "Jumeirah Bay",
                "minPrice": 17_000_000,
                "maxPrice": 19_000_000,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["pagination"]["totalItems"], 1)
        self.assertEqual(payload["data"][0]["title"], "Jumeirah Bay Island Beachfront Villa")
        self.assertEqual(payload["data"][0]["listingStatus"], "PENDING")
        self.assertEqual(payload["data"][0]["askingPriceUsd"], 18_000_000)

    def test_rejects_an_invalid_price_filter_range(self):
        response = client.get("/api/properties", params={"minPrice": 2_000_000, "maxPrice": 1_000_000})

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_ERROR")

    def test_returns_a_consistent_not_found_error_for_unknown_listing(self):
        response = client.get("/api/properties/99999")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"]["code"], "NOT_FOUND")

    def test_creates_an_inquiry_without_exposing_personal_details(self):
        listing = client.get("/api/properties").json()["data"][0]
        response = client.post(
            "/api/inquiries",
            json={
                "propertyId": listing["id"],
                "fullName": "Alex Example",
                "email": "alex@example.com",
                "phone": "+420 123 456 789",
                "message": "I would like to arrange a viewing.",
                "consentToContact": True,
                "consentPrivacy": True,
            },
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["status"], "RECEIVED")
        self.assertIn("inquiryId", payload)
        self.assertNotIn("email", payload)
        self.assertNotIn("phone", payload)

    def test_lead_form_collects_required_operational_fields(self):
        landing = client.get("/").text
        script = client.get("/static/app.js").text

        for field_name in (
            'name="purpose"',
            'name="budgetUsd"',
            'name="preferredChannel"',
            'name="consentPrivacy"',
            'name="consentMarketing"',
            'name="website"',
        ):
            self.assertIn(field_name, landing)
        self.assertIn("preferredChannel", script)
        self.assertIn("consentPrivacy", script)
        self.assertIn("I18N.getLocale()", script)

    def test_inquiry_success_message_uses_requested_locale(self):
        response = client.post(
            "/api/inquiries",
            json={
                "propertyId": 1,
                "fullName": "Тестовый Пользователь",
                "email": "locale@example.com",
                "message": "Прошу связаться со мной по этому объекту.",
                "purpose": "PERSONAL_USE",
                "preferredChannel": "EMAIL",
                "consentToContact": True,
                "consentPrivacy": True,
                "locale": "ru",
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("Спасибо", response.json()["message"])

    def test_honeypot_submission_is_not_persisted(self):
        from main import get_connection

        before_connection = get_connection()
        try:
            before = before_connection.execute("SELECT COUNT(*) FROM inquiries").fetchone()[0]
        finally:
            before_connection.close()

        response = client.post(
            "/api/inquiries",
            json={
                "propertyId": 1,
                "fullName": "Bot Example",
                "email": "bot@example.com",
                "message": "This field should cause a silent discard.",
                "consentToContact": True,
                "consentPrivacy": True,
                "website": "https://spam.example",
            },
        )

        after_connection = get_connection()
        try:
            after = after_connection.execute("SELECT COUNT(*) FROM inquiries").fetchone()[0]
        finally:
            after_connection.close()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(after, before)

    def test_rejects_an_inquiry_without_contact_consent(self):
        response = client.post(
            "/api/inquiries",
            json={
                "propertyId": 1,
                "fullName": "Alex Example",
                "email": "alex@example.com",
                "message": "Please contact me.",
                "consentToContact": False,
                "consentPrivacy": True,
            },
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_ERROR")

    def test_does_not_expose_financial_or_identity_collection_workflows(self):
        retired_paths = [
            "/api/property/deposit",
            "/api/dashboard",
            "/api/referral/info",
            "/api/kyc/status",
            "/api/withdrawal/step",
        ]

        for path in retired_paths:
            with self.subTest(path=path):
                response = client.get(path)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.json()["error"]["code"], "NOT_FOUND")

    def test_allows_only_local_development_origins_by_default(self):
        allowed = client.get("/health", headers={"Origin": "http://localhost:5500"})
        blocked = client.get("/health", headers={"Origin": "https://unapproved.example"})

        self.assertEqual(allowed.headers.get("access-control-allow-origin"), "http://localhost:5500")
        self.assertNotIn("access-control-allow-origin", blocked.headers)

    def test_returns_similar_properties_in_price_range(self):
        response = client.get("/api/properties/1/similar")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsInstance(payload["data"], list)
        for item in payload["data"]:
            self.assertNotEqual(item["id"], 1)

    def test_similar_properties_returns_not_found_for_unknown_id(self):
        response = client.get("/api/properties/99999/similar")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"]["code"], "NOT_FOUND")

    def test_rate_limits_rapid_inquiry_submissions(self):
        inquiry_body = {
            "propertyId": 1,
            "fullName": "Rate Limit Tester",
            "email": "ratelimit@example.com",
            "message": "Testing rate limiting behavior.",
            "consentToContact": True,
            "consentPrivacy": True,
        }

        for _ in range(5):
            response = client.post("/api/inquiries", json=inquiry_body)
            self.assertEqual(response.status_code, 201)

        blocked = client.post("/api/inquiries", json=inquiry_body)
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(blocked.json()["error"]["code"], "RATE_LIMITED")
        self.assertEqual(blocked.headers["x-content-type-options"], "nosniff")
        self.assertIn("default-src 'self'", blocked.headers["content-security-policy"])

    def test_sanitizes_html_tags_in_inquiry_fields(self):
        response = client.post(
            "/api/inquiries",
            json={
                "propertyId": 1,
                "fullName": "<script>alert('xss')</script>John Doe",
                "email": "sanitize@example.com",
                "message": "<img src=x onerror=alert(1)>I would like a viewing please.",
                "consentToContact": True,
                "consentPrivacy": True,
            },
        )

        self.assertEqual(response.status_code, 201)
        inquiry_id = response.json()["inquiryId"]

        from main import get_connection
        connection = get_connection()
        try:
            row = connection.execute(
                "SELECT full_name, message FROM inquiries WHERE id = ?",
                (inquiry_id,),
            ).fetchone()
        finally:
            connection.close()

        self.assertEqual(row["full_name"], "John Doe")
        self.assertNotIn("<", row["message"])
        self.assertNotIn("alert", row["message"].lower())

    def test_rate_limit_storage_never_contains_raw_client_address(self):
        client.post(
            "/api/inquiries",
            json={
                "propertyId": 1,
                "fullName": "Privacy Test",
                "email": "privacy@example.com",
                "message": "Checking the durable request budget.",
                "consentToContact": True,
                "consentPrivacy": True,
            },
        )

        from main import get_connection
        connection = get_connection()
        try:
            row = connection.execute("SELECT client_hash FROM rate_limit_events LIMIT 1").fetchone()
        finally:
            connection.close()
        self.assertIsNotNone(row)
        self.assertEqual(len(row["client_hash"]), 64)
        self.assertNotIn("testclient", row["client_hash"])

    def test_public_config_exposes_site_key_only(self):
        response = client.get("/api/public-config")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"turnstileSiteKey": None})
        self.assertNotIn("secret", response.text.lower())

    def test_catalog_import_validates_media_rights_and_rejects_unsplash(self):
        from import_catalog import import_records

        record = {
            "slug": "cms-import-demo-record",
            "title": "CMS Import Demo Record",
            "district": "Dubai Marina",
            "propertyType": "APARTMENT",
            "priceUsd": 1_000_000,
            "description": "Demonstration import record used only to validate the publishing workflow.",
            "areaSqM": 100,
            "isDemo": True,
            "media": [
                {
                    "url": "/static/hero-dubai-skyline.png",
                    "altText": "Demonstration skyline media",
                    "rightsBasis": "Bundled demonstrative asset",
                }
            ],
        }
        self.assertEqual(import_records([record], dry_run=True), 1)

        record["media"][0]["url"] = "https://images.unsplash.com/example.jpg"
        with self.assertRaisesRegex(ValueError, "Unsplash"):
            import_records([record], dry_run=True)

    def test_returns_empty_data_for_page_beyond_total(self):
        response = client.get("/api/properties", params={"page": 999, "pageSize": 10})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["data"], [])
        self.assertEqual(payload["pagination"]["page"], 999)
        self.assertGreater(payload["pagination"]["totalItems"], 0)

    def test_serves_docs_page(self):
        response = client.get("/docs")

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response.headers["content-type"])
        self.assertIn("Golden Key", response.text)
        self.assertIn("data-docs-shell", response.text)
        self.assertIn("data-docs-toc", response.text)
        self.assertIn("/static/css/docs.css", response.text)
        self.assertIn("/static/docs.js", response.text)
        self.assertIn("data-i18n=\"docs.title\"", response.text)

    def test_serves_404_page(self):
        response = client.get("/404")

        self.assertEqual(response.status_code, 404)
        self.assertIn("text/html", response.headers["content-type"])
        self.assertIn("Golden Key", response.text)
        self.assertIn("data-i18n=\"error.404.title\"", response.text)
        self.assertIn("error-shell", response.text)

    def test_spa_unknown_route_serves_branded_404_html(self):
        response = client.get("/this-path-does-not-exist")

        self.assertEqual(response.status_code, 404)
        self.assertIn("text/html", response.headers["content-type"])
        self.assertIn("error-shell", response.text)

    def test_serves_safe_branded_500_page(self):
        response = client.get("/500")

        self.assertEqual(response.status_code, 500)
        self.assertIn("text/html", response.headers["content-type"])
        self.assertIn("We could not complete this request", response.text)
        self.assertNotIn("Traceback", response.text)
        self.assertEqual(response.headers["x-robots-tag"] if "x-robots-tag" in response.headers else "noindex", "noindex")

    def test_server_rendered_catalogue_and_property_pages_are_indexable(self):
        catalogue = client.get("/properties")
        self.assertEqual(catalogue.status_code, 200)
        self.assertIn('name="district"', catalogue.text)
        self.assertIn("Demo data", catalogue.text)

        listing = client.get("/api/properties", params={"pageSize": 1}).json()["data"][0]
        detail = client.get(f'/properties/{listing["slug"]}')
        self.assertEqual(detail.status_code, 200)
        self.assertIn(listing["title"], detail.text)
        self.assertIn(f'/properties/{listing["slug"]}', detail.text)
        self.assertIn('type="application/ld+json"', detail.text)
        self.assertGreaterEqual(detail.text.count("data-gallery-item"), 8)
        self.assertIn("data-floor-plan", detail.text)
        self.assertIn("data-request-viewing", detail.text)
        self.assertIn("data-request-shortlist", detail.text)

    def test_area_why_dubai_and_legal_pages_exist(self):
        areas_page = client.get("/areas")
        self.assertEqual(areas_page.status_code, 200)
        for area in ("Palm Jumeirah", "Downtown Dubai", "Dubai Marina", "Dubai Hills Estate", "DIFC", "Jumeirah"):
            self.assertIn(area, areas_page.text)

        for path in (
            "/areas/palm-jumeirah",
            "/why-dubai",
            "/privacy",
            "/cookies",
            "/terms",
        ):
            with self.subTest(path=path):
                response = client.get(path)
                self.assertEqual(response.status_code, 200)
                self.assertIn('rel="canonical"', response.text)

    def test_dynamic_sitemap_lists_property_and_area_routes(self):
        listing = client.get("/api/properties", params={"pageSize": 1}).json()["data"][0]
        response = client.get("/sitemap.xml")

        self.assertEqual(response.status_code, 200)
        self.assertIn(f'/properties/{listing["slug"]}', response.text)
        self.assertIn("/areas/palm-jumeirah", response.text)

    def test_admin_requires_login_and_uses_http_only_session(self):
        from argon2 import PasswordHasher
        from database import upsert_admin_user

        upsert_admin_user(email="admin-test@example.com", password_hash=PasswordHasher().hash("Correct horse 42!"), role="admin")
        with TestClient(app) as operator:
            anonymous = operator.get("/admin", follow_redirects=False)
            self.assertEqual(anonymous.status_code, 303)
            self.assertEqual(anonymous.headers["location"], "/admin/login")

            login = operator.post(
                "/admin/login",
                data={"email": "admin-test@example.com", "password": "Correct horse 42!"},
                follow_redirects=False,
            )
            self.assertEqual(login.status_code, 303)
            self.assertIn("gk_admin_session=", login.headers["set-cookie"])
            self.assertIn("HttpOnly", login.headers["set-cookie"])
            self.assertIn("SameSite=strict", login.headers["set-cookie"])

            dashboard = operator.get("/admin")
            self.assertEqual(dashboard.status_code, 200)
            self.assertIn("Catalogue operations", dashboard.text)
            self.assertEqual(dashboard.headers["x-robots-tag"], "noindex, nofollow")
            self.assertIn("no-store", dashboard.headers["cache-control"])

    def test_editor_can_update_listing_but_cannot_view_leads(self):
        from argon2 import PasswordHasher
        from database import upsert_admin_user

        upsert_admin_user(email="editor-test@example.com", password_hash=PasswordHasher().hash("Editor password 42!"), role="editor")
        with TestClient(app) as operator:
            operator.post("/admin/login", data={"email": "editor-test@example.com", "password": "Editor password 42!"})
            editor = operator.get("/admin/listings/1")
            self.assertEqual(editor.status_code, 200)
            csrf_match = re.search(r'name="csrfToken" value="([^"]+)"', editor.text)
            self.assertIsNotNone(csrf_match)
            csrf = csrf_match.group(1)

            current = client.get("/api/properties/1").json()["data"]
            update = operator.post(
                "/admin/listings/1",
                data={
                    "csrfToken": csrf,
                    "title": current["title"],
                    "description": current["description"],
                    "askingPriceUsd": current["askingPriceUsd"],
                    "listingStatus": current["listingStatus"],
                    "readiness": current["readiness"],
                    "published": "on",
                    "sourceLabel": current["sourceLabel"],
                    "floorPlanUrl": current["floorPlanUrl"] or "",
                },
                follow_redirects=False,
            )
            self.assertEqual(update.status_code, 303)
            self.assertEqual(operator.get("/admin/leads").status_code, 403)

            rejected = operator.post(
                "/admin/listings/1",
                data={"csrfToken": "wrong"},
                follow_redirects=False,
            )
            self.assertEqual(rejected.status_code, 403)

    def test_admin_can_view_stored_leads(self):
        from argon2 import PasswordHasher
        from database import upsert_admin_user

        upsert_admin_user(email="lead-admin@example.com", password_hash=PasswordHasher().hash("Lead admin password 42!"), role="admin")
        with TestClient(app) as operator:
            operator.post("/admin/login", data={"email": "lead-admin@example.com", "password": "Lead admin password 42!"})
            leads = operator.get("/admin/leads")
            self.assertEqual(leads.status_code, 200)
            self.assertIn("Lead operations", leads.text)
            self.assertNotIn("gk_admin_session", leads.text)

    def test_api_unknown_route_still_returns_json_not_found(self):
        response = client.get("/api/this-does-not-exist")

        self.assertEqual(response.status_code, 404)
        self.assertIn("application/json", response.headers["content-type"])
        self.assertEqual(response.json()["error"]["code"], "NOT_FOUND")

    def test_compliance_endpoints_still_404(self):
        """Preserve the informational-only posture: no payment / KYC / withdrawal endpoints."""
        retired_paths = [
            "/api/payment",
            "/api/payment/create",
            "/api/kyc",
            "/api/kyc/status",
            "/api/withdrawal",
            "/api/withdrawal/step",
            "/api/dashboard",
        ]

        for path in retired_paths:
            with self.subTest(path=path):
                response = client.get(path)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.json()["error"]["code"], "NOT_FOUND")

    def test_healthz_alias_matches_health(self):
        primary = client.get("/health")
        alias = client.get("/healthz")

        self.assertEqual(primary.status_code, alias.status_code)
        self.assertEqual(primary.json(), alias.json())

    def test_serves_web_manifest(self):
        response = client.get("/manifest.webmanifest")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers["content-type"], "application/manifest+json"
        )
        self.assertIn("Golden Key Property Listings", response.text)
        self.assertIn('"start_url": "/"', response.text)
        self.assertIn('"theme_color": "#0f2b25"', response.text)

    def test_serves_robots_txt(self):
        response = client.get("/robots.txt")

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/plain", response.headers["content-type"])
        self.assertIn("User-agent: *", response.text)
        self.assertIn("Sitemap: http://127.0.0.1:8000/sitemap.xml", response.text)

    def test_serves_sitemap_xml(self):
        response = client.get("/sitemap.xml")

        self.assertEqual(response.status_code, 200)
        self.assertIn("application/xml", response.headers["content-type"])
        self.assertIn("<urlset", response.text)
        self.assertIn("<loc>http://127.0.0.1:8000/</loc>", response.text)
        self.assertIn("<loc>http://127.0.0.1:8000/docs</loc>", response.text)

    def test_serves_open_graph_metadata(self):
        response = client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response.headers["content-type"])
        self.assertIn('property="og:title"', response.text)
        self.assertIn('property="og:type"', response.text)
        self.assertIn('name="twitter:card"', response.text)
        self.assertIn('rel="canonical"', response.text)
        self.assertIn('rel="manifest"', response.text)


if __name__ == "__main__":
    unittest.main()
