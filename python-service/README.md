# InsightOps Python Service

FastAPI-based briefing report generator with HTML rendering.

## Features

- Create briefings with structured data (company, summary, key points, risks, metrics)
- Store briefing data in relational PostgreSQL schema
- Generate professional HTML reports from briefings
- Validation with Pydantic
- Jinja2 server-side HTML templating

## Setup

### Prerequisites

- Python 3.12+
- PostgreSQL

### Installation

```bash
# Create virtual environment
python3.12 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

### Environment Variables

Key variables in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `APP_ENV` - development/production
- `APP_PORT` - API port (default 8000)

## Running

### Migrate Database

```bash
# Apply all pending migrations
python -m app.db.run_migrations up

# Show migration status
python -m app.db.run_migrations status

# Rollback
python -m app.db.run_migrations down
```

### Start Server

```bash
cd python-service
source .venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000

```

Server runs at `http://localhost:8000`
- **Docs**: http://localhost:8000/docs (Swagger UI)

## Testing

```bash
# Run tests
cd python-service
source .venv/bin/activate
python -m pytest
```

## API Overview

### Create Briefing

```bash
POST /briefings
Content-Type: application/json

{
  "companyName": "Acme Holdings",
  "ticker": "acme",
  "sector": "Industrial Technology",
  "analystName": "Jane Doe",
  "summary": "Strong fundamentals with growth potential",
  "recommendation": "Monitor quarterly results before increasing exposure",
  "keyPoints": [
    "Revenue grew 18% YoY",
    "Enterprise subscriptions up 25%"
  ],
  "risks": [
    "Top 2 customers = 41% revenue",
    "International expansion headwinds"
  ],
  "metrics": [
    {"name": "Revenue Growth", "value": "18%"},
    {"name": "Operating Margin", "value": "22.4%"}
  ]
}
```

### Get Briefing

```bash
GET /briefings/{id}
```

Returns briefing with all related data.

### Generate Report

```bash
POST /briefings/{id}/generate
```

Generates HTML report and marks briefing as generated.

### Get HTML

```bash
GET /briefings/{id}/html
```

Returns rendered HTML report (viewable in browser).

## Project Structure

```
python-service/
├── app/
│   ├── api/              # API routes
│   │   ├── briefings.py  # Briefing endpoints
│   │   ├── health.py
│   │   └── sample_items.py
│   ├── db/               # Database
│   │   ├── session.py    # SQLAlchemy setup
│   │   ├── base.py       # ORM base class
│   │   └── run_migrations.py
│   ├── models/           # SQLAlchemy models
│   │   ├── sample_item.py
│   │   └── briefing.py
│   ├── schemas/          # Pydantic schemas/DTOs
│   │   ├── sample_item.py
│   │   └── briefing.py
│   ├── services/         # Business logic
│   │   ├── sample_item_service.py
│   │   ├── briefing_service.py
│   │   └── report_formatter.py
│   ├── templates/        # Jinja2 templates
│   │   ├── base.html
│   │   └── briefing_report.html
│   ├── config.py         # Settings/config
│   └── main.py           # FastAPI app
├── db/
│   └── migrations/       # SQL migrations
│       ├── 001_create_sample_items.*
│       └── 002_create_briefings.*
├── tests/               # Pytest tests
│   ├── test_health.py
│   ├── test_sample_items.py
│   └── test_briefings.py
├── requirements.txt     # Dependencies
├── pytest.ini          # Pytest config
└── README.md
```

## Key Implementation Details

### Data Model

Normalized schema with separate tables:
- `briefings` - Main briefing record
- `briefing_key_points` - Ordered key points
- `briefing_risks` - Ordered risks  
- `briefing_metrics` - Optional metrics with uniqueness constraint

**Benefits:**
- Enforce unique metric names
- Support ordering
- Enable complex queries
- Database-level integrity

### Validation

Pydantic validation:
- Ticker normalized to uppercase
- 2+ key points required
- 1+ risks required
- Unique metric names per briefing
- Field length and type checking

### Report Generation

Three-layer architecture:

1. **Service Layer** (`BriefingService`)
   - Database operations
   - Atomic transactions

2. **Formatter Layer** (`ReportFormatter`)
   - Transform model to view context
   - Handle formatting and sorting

3. **Template Layer** (`briefing_report.html`)
   - Professional HTML rendering
   - Responsive CSS styling
   - Semantic structure

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [SQLAlchemy 2.0](https://docs.sqlalchemy.org)
- [Pydantic v2](https://docs.pydantic.dev)
- [Jinja2 Templating](https://jinja.palletsprojects.com)
```

## Project Layout

- `app/main.py`: FastAPI bootstrap and router wiring
- `app/config.py`: environment config
- `app/db/`: SQLAlchemy session management and migration runner
- `db/migrations/`: SQL migration files
- `app/models/`: ORM models
- `app/schemas/`: Pydantic request/response schemas
- `app/services/`: service-layer logic and template helpers
- `app/api/`: route handlers
- `app/templates/`: Jinja templates
- `tests/`: test suite
