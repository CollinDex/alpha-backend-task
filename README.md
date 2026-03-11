# Backend Engineering Assessment

A two-service monorepo demonstrating backend engineering best practices across different technology stacks.

## Services

- **python-service** (InsightOps): FastAPI-based briefing report generator
- **ts-service** (TalentFlow): NestJS-based candidate document intake and summarization

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.12+
- Node.js 22+
- npm

### Start PostgreSQL

```bash
docker compose up -d postgres
```

This starts PostgreSQL with:
- Database: `assessment_db`
- User: `assessment_user`  
- Password: `assessment_pass`
- Port: `5432`

## Python Service (InsightOps)

A FastAPI service for creating, managing, and rendering professional briefing reports.

### Setup

```bash
cd python-service

# Create and activate virtual environment
python3.12 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env  # Edit if needed
```

### Run Migrations

```bash
cd python-service
source .venv/bin/activate

# Apply migrations
python -m app.db.run_migrations up

# Verify completion (shows applied migrations)
python -m app.db.run_migrations status
```

### Start Service

```bash
cd python-service
source .venv/bin/activate

# Development (with auto-reload)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Or use the configured port from .env
uvicorn app.main:app --host 0.0.0.0 --port ${APP_PORT}
```

Service runs at `http://localhost:8000`

- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Run Tests

```bash
cd python-service
source .venv/bin/activate

pytest tests/ -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

### API Endpoints

#### Create Briefing

```bash
POST /briefings

{
  "companyName": "Acme Holdings",
  "ticker": "acme",
  "sector": "Industrial Technology",
  "analystName": "Jane Doe",
  "summary": "Acme is benefiting from strong enterprise demand...",
  "recommendation": "Monitor for margin expansion before increasing exposure.",
  "keyPoints": [
    "Revenue grew 18% year-over-year.",
    "Management raised full-year guidance."
  ],
  "risks": [
    "Top two customers account for 41% of revenue."
  ],
  "metrics": [
    { "name": "Revenue Growth", "value": "18%" },
    { "name": "Operating Margin", "value": "22.4%" }
  ]
}
```

**Validation Rules:**
- `companyName`: Required, 1-255 characters
- `ticker`: Required, normalized to uppercase
- `summary`: Required, min 1 character
- `recommendation`: Required, min 1 character
- `keyPoints`: Required, minimum 2 key points
- `risks`: Required, minimum 1 risk
- `metrics`: Optional, metric names must be unique within briefing

**Response:**
```json
{
  "id": 1,
  "companyName": "Acme Holdings",
  "ticker": "ACME",
  "sector": "Industrial Technology",
  "analystName": "Jane Doe",
  "summary": "...",
  "recommendation": "...",
  "keyPoints": [...],
  "risks": [...],
  "metrics": [...],
  "generated_at": null,
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

#### Retrieve Briefing

```bash
GET /briefings/{id}
```

Returns the complete briefing structure with all relationships.

#### Generate Report

```bash
POST /briefings/{id}/generate
```

Generates HTML report from briefing data and marks as generated.

**Response:**
```json
{
  "id": 1,
  "status": "generated",
  "generated_at": "2024-01-01T12:05:00Z"
}
```

#### Get HTML Report

```bash
GET /briefings/{id}/html
```

Returns rendered HTML content (MIME type: text/html).

---

## TypeScript Service (TalentFlow)

A NestJS service for managing candidate documents and generating AI-powered summaries.

### Setup

```bash
cd ts-service

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

#### Environment Variables

```env
PORT=3000
DATABASE_URL=postgres://assessment_user:assessment_pass@localhost:5432/assessment_db
NODE_ENV=development

# LLM Configuration
USE_GEMINI_PROVIDER=true
GEMINI_API_KEY=<your-gemini-api-key>
```

**Gemini API Setup:**
1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create a free API key
3. Set `GEMINI_API_KEY` in `.env`
4. Set `USE_GEMINI_PROVIDER=true` to enable real LLM integration
5. Leave `USE_GEMINI_PROVIDER=false` to use fake provider (for testing)

### Run Migrations

```bash
cd ts-service

# Show pending migrations
npm run migration:show

# Run migrations
npm run migration:run

# Revert migrations (be careful!)
npm run migration:revert
```

### Start Service

```bash
cd ts-service

# Development (with watch mode)
npm run start:dev

# Production build and start
npm run build
npm run start:prod
```

Service runs at `http://localhost:3000`

### Run Tests

```bash
cd ts-service

# Unit and integration tests
npm test

# E2E tests
npm run test:e2e
```

### API Endpoints

**Base URL:** `http://localhost:3000`

##### Authentication

All endpoints require these headers:
```
x-user-id: <user-id>
x-workspace-id: <workspace-id>
```

#### Upload Document

```bash
POST /candidates/:candidateId/documents
x-user-id: user-123
x-workspace-id: workspace-456

{
  "fileName": "john_doe_resume.pdf",
  "documentType": "resume",
  "rawText": "John Doe\n5+ years software engineering experience..."
}
```

**Response:**
```json
{
  "id": "doc-uuid",
  "candidateId": "candidate-uuid",
  "documentType": "resume",
  "fileName": "john_doe_resume.pdf",
  "storageKey": "candidates/candidate-uuid/documents/...",
  "uploadedAt": "2024-01-01T12:00:00Z"
}
```

#### List Documents

```bash
GET /candidates/:candidateId/documents
x-user-id: user-123
x-workspace-id: workspace-456
```

Returns array of candidate documents.

#### Request Summary Generation

```bash
POST /candidates/:candidateId/summaries/generate
x-user-id: user-123
x-workspace-id: workspace-456

{}
```

**Response (HTTP 202 Accepted):**
```json
{
  "statusCode": 202,
  "message": "Summary generation enqueued",
  "summaryId": "summary-uuid"
}
```

The request returns immediately while processing happens asynchronously.

#### List Summaries

```bash
GET /candidates/:candidateId/summaries
x-user-id: user-123
x-workspace-id: workspace-456
```

Returns array of summaries for the candidate (pending, completed, or failed).

#### Get Summary

```bash
GET /candidates/:candidateId/summaries/:summaryId
x-user-id: user-123
x-workspace-id: workspace-456
```

**Response:**
```json
{
  "id": "summary-uuid",
  "candidateId": "candidate-uuid",
  "statusType": "completed",
  "score": 85,
  "strengths": [
    "Strong systems design experience",
    "Clear communication skills"
  ],
  "concerns": [
    "Limited experience with specific technology stack"
  ],
  "summary": "Experienced backend engineer with strong fundamentals...",
  "recommendedDecision": "advance",
  "provider": "gemini",
  "promptVersion": "v1",
  "errorMessage": null,
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:05:00Z"
}
```
## Architecture Notes

### Part A: Python/FastAPI Briefing Service

**Data Model:**
- `briefings` - Main briefing records
- `briefing_key_points` - Associated key points with ordering
- `briefing_risks` - Associated risks with ordering
- `briefing_metrics` - Optional financial/business metrics

**Key Design Decisions:**
1. **Normalized Schema** - Separate tables for key points, risks, and metrics enable:
   - Unique constraint on metric names per briefing
   - Natural ordering support  
   - Efficient queries for specific data subsets

2. **Service Layer** - `BriefingService` handles all data operations:
   - Atomic creation of briefing with related data (single transaction)
   - Read operations with ORM relationship loading
   - HTML generation tracking

3. **Formatter Layer** - `ReportFormatter` transforms database models to template context:
   - Separates concerns (data vs. presentation)
   - Enables testing without rendering
   - Supports future multi-format reporting

4. **Jinja2 Templating** - Professional HTML generation:
   - Server-side rendering for security (auto-escaping)
   - Responsive CSS for various use cases
   - Semantic HTML structure

5. **Validation** - Comprehensive Pydantic validation:
   - Type checking and constraints
   - Ticker normalization
   - Unique metric names enforced at schema level
   - Minimum counts for key points and risks

### Part B: NestJS/TypeScript Candidate Service

**Data Model:**
- `candidate_documents` - Uploaded documents with raw text
- `candidate_summaries` - Generated summaries with LLM output and status

**Key Design Decisions:**

1. **Provider Abstraction** - `SummarizationProvider` interface:
   - Easy to swap Gemini for other LLM providers
   - Fake provider for testing (no API calls)
   - Type-safe input/output contracts

2. **Async Job Queue**:
   - Summary requests return immediately (HTTP 202)
   - Real processing happens asynchronously
   - Status tracking through database
   - Error handling and retry capability

3. **Worker Service** - Decoupled background processing:
   - Standalone service for job processing
   - Can run in separate worker process/thread
   - No request context required
   - Structured error handling

4. **Access Control** - Workspace scoping:
   - FakeAuthGuard extracts workspace from headers
   - All queries filtered by workspace_id
   - Prevents cross-workspace data access

5. **Data Types**:
   - JSON serialization for arrays (strengths, concerns)
   - Enum-like status tracking (pending/completed/failed)
   - Timestamps for audit trail

---

## Assumptions & Trade-offs

### Python Service

**Assumptions:**
- Single process, no horizontal scaling
- Manual SQL migrations (not auto migration framework)
- No authentication/authorization (assessed separately)
- In-memory rendering (no caching layer)

**Trade-offs:**
- Simplicity over enterprise features
- Manual migrations for full control vs. auto-sync
- No API versioning (single version)

### TypeScript Service

**Assumptions:**
- In-memory queue for job management in standalone/testing scenario
- Fake auth headers sufficient for assessment
- Gemini API available (free tier)
- Single worker thread processes jobs

**Trade-offs:**
- Simple queue vs. Redis/RabbitMQ
- Synchronous job processor for development
- No retry logic (could be enhanced)
- No rate limiting on LLM API

### Both Services

**Assumptions:**
- PostgreSQL as data store
- No caching layer
- No observability/monitoring (could add)
- Synchronous I/O (both services)

**Future Enhancements:**
- Implement real queue system (Bull, Temporal)
- Add caching (Redis) for frequently accessed reports
- Production authentication/authorization
- Structured logging and monitoring
- Performance optimization (pagination, indexing)
- Database connection pooling optimization
- API rate limiting
- Comprehensive error recovery

---

## Development Commands

### Run Everything

```bash
# Terminal 1: Start database
docker compose up postgres

# Terminal 2: Python service
cd python-service
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.db.run_migrations up
uvicorn app.main:app --reload

# Terminal 3: TypeScript service
cd ts-service
npm install
npm run migration:run
npm run start:dev
```

### Quick Testing

```bash
# Python tests
cd python-service && pytest tests/

# TypeScript tests
cd ts-service && npm test

# E2E tests
cd ts-service && npm run test:e2e
```

---

## Submission Checklist

- [x] Python FastAPI briefing service working end-to-end
- [x] NestJS candidate document/summary service working
- [x] Database migrations for both services
- [x] API validation and error handling
- [x] Service layer separation of concerns
- [x] HTML templating (Jinja2)
- [x] Async job queue with worker
- [x] Access control (workspace scoping)
- [x] LLM provider integration (Gemini)
- [x] Tests for Python service
- [x] Documentation with setup/run instructions

See [NOTES.md](./NOTES.md) for design decisions and improvement opportunities.
