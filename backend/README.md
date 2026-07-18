# Golden Key Property Listings API

This is an informational property-listing API. It supports browsing listings
and sending a consent-based request for an agent to make contact.

It does **not** accept deposits, custody money or crypto-assets, offer
investments or returns, collect identity documents, charge withdrawal fees, or
process withdrawals.

## Run locally

```powershell
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

The API is available at `http://127.0.0.1:8000` and its interactive schema is
at `/docs`.

## Public API

- `GET /health`
- `GET /api/properties?page=1&pageSize=20&location=&minPrice=&maxPrice=&listingStatus=ACTIVE`
- `GET /api/properties/{propertyId}`
- `POST /api/inquiries`

Example inquiry body:

```json
{
  "propertyId": 1,
  "fullName": "Alex Example",
  "email": "alex@example.com",
  "phone": "+420 123 456 789",
  "message": "I would like to arrange a viewing.",
  "consentToContact": true
}
```

The API does not expose inquiry contact details through a public endpoint.
All validation and application errors use an `error.code` and `error.message`
response shape.

## Development checks

```powershell
python -m unittest -v test_main.py
python -m compileall -q main.py test_main.py
```

## Before a production launch

This code is not itself legal compliance. Before publishing real listings or
collecting real contact details, obtain advice for the jurisdictions involved
and complete at least these operational steps:

- verify the broker/agent licensing, property authorization, ownership claims,
  price, availability, and image usage rights;
- publish privacy, cookie, and contact-consent notices; define a retention and
  deletion process for inquiry data;
- add authenticated, authorized staff access for inquiries and protect the
  database with managed backups and encryption at rest;
- place the service behind HTTPS and configure a specific CORS allowlist for
  the approved frontend origins;
- use verified production listing data instead of the illustrative seed data.

The old `properties.db` is intentionally not read or deleted by this version;
review and dispose of its legacy data under an appropriate retention policy.
