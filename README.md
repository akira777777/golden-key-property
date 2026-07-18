# Golden Key Property Listings

A clean, informational real-estate catalogue with viewing inquiries. No deposits, investment products, or financial transactions.

## Features

- FastAPI backend with pagination, filtering, and rate-limited inquiry intake
- SQLite database with property listings and 3D/virtual tour metadata
- Responsive Russian-language frontend with accessible forms and dialogs
- 3D tour support: PHOTO_360, MODEL_3D, VIDEO_3D via `/api/properties/{id}/tour`
- Motion reveal animations with `prefers-reduced-motion` respect
- Docker and Docker Compose for local deployment

## Quick start

```powershell
cd backend
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

Open http://127.0.0.1:8000

## Docker

```powershell
docker compose up --build
```

## Tests

```powershell
cd backend
python -m unittest -v test_main.py
```

## Structure

```
real_estate_scam/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── test_main.py         # Unit tests
│   ├── static/              # Frontend assets
│   ├── requirements.txt
│   ├── pyproject.toml
│   └── Dockerfile
├── docker-compose.yml
├── vercel.json
└── .github/workflows/ci.yml
```

## License

MIT
