# ruff: noqa: E402
import os
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
            },
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["status"], "RECEIVED")
        self.assertIn("inquiryId", payload)
        self.assertNotIn("email", payload)
        self.assertNotIn("phone", payload)

    def test_rejects_an_inquiry_without_contact_consent(self):
        response = client.post(
            "/api/inquiries",
            json={
                "propertyId": 1,
                "fullName": "Alex Example",
                "email": "alex@example.com",
                "message": "Please contact me.",
                "consentToContact": False,
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
        from main import _rate_buckets
        _rate_buckets.clear()

        inquiry_body = {
            "propertyId": 1,
            "fullName": "Rate Limit Tester",
            "email": "ratelimit@example.com",
            "message": "Testing rate limiting behavior.",
            "consentToContact": True,
        }

        for _ in range(5):
            response = client.post("/api/inquiries", json=inquiry_body)
            self.assertEqual(response.status_code, 201)

        blocked = client.post("/api/inquiries", json=inquiry_body)
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(blocked.json()["error"]["code"], "RATE_LIMITED")
        self.assertEqual(blocked.headers["x-content-type-options"], "nosniff")
        self.assertIn("default-src 'self'", blocked.headers["content-security-policy"])

        _rate_buckets.clear()

    def test_sanitizes_html_tags_in_inquiry_fields(self):
        from main import _rate_buckets
        _rate_buckets.clear()

        response = client.post(
            "/api/inquiries",
            json={
                "propertyId": 1,
                "fullName": "<script>alert('xss')</script>John Doe",
                "email": "sanitize@example.com",
                "message": "<img src=x onerror=alert(1)>I would like a viewing please.",
                "consentToContact": True,
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
        _rate_buckets.clear()

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
        self.assertIn("Sitemap: /sitemap.xml", response.text)

    def test_serves_sitemap_xml(self):
        response = client.get("/sitemap.xml")

        self.assertEqual(response.status_code, 200)
        self.assertIn("application/xml", response.headers["content-type"])
        self.assertIn("<urlset", response.text)
        self.assertIn("<loc>/</loc>", response.text)
        self.assertIn("<loc>/docs</loc>", response.text)

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
