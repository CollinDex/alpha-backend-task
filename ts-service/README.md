# TalentFlow TypeScript Service

NestJS-based candidate document intake and AI-powered summary generation service.

## Features

- Upload candidate documents (resumes, cover letters, etc.)
- Request asynchronous summary generation
- Integration with Google Gemini API
- Queue-based job processing
- Workspace-scoped access control
- Comprehensive error handling
- Full TypeORM migrations

## Setup

### Prerequisites

- Node.js 22+
- npm
- PostgreSQL running

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

### Environment Variables

```env
PORT=3000
DATABASE_URL=postgres://assessment_user:assessment_pass@localhost:5432/assessment_db
NODE_ENV=development

# LLM Configuration
USE_GEMINI_PROVIDER=false  # Set true to use real Gemini
GEMINI_API_KEY=
```

#### Getting Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API key"
3. Copy the key to `.env` as `GEMINI_API_KEY`
4. Set `USE_GEMINI_PROVIDER=true` to enable

*Note:* Development uses fake provider by default for fast testing.

## Running

### Migrate Database

```bash
# Show migration status
npm run migration:show

# Run migrations
cd ts-service
npm run start:dev

# Rollback migrations (be careful!)
npm run migration:revert
```

### Start Server

```bash
cd ts-service
npm run start:dev
```

Server runs at `http://localhost:3000`
- **OpenAPI**: http://localhost:3000/api

## Testing

```bash
cd ts-service
npm test
npm run test:e2e
```

## API Overview

### Authentication Headers

All endpoints require:
```
x-user-id: <your-user-id>
x-workspace-id: <your-workspace-id>
```

Example:
```bash
curl -H "x-user-id: user-123" \
     -H "x-workspace-id: workspace-456" \
     http://localhost:3000/candidates/candidate-uuid/documents
```

### Upload Document

```bash
POST /candidates/:candidateId/documents
x-user-id: user-123
x-workspace-id: workspace-456
Content-Type: application/json

{
  "fileName": "resume.pdf",
  "documentType": "resume",
  "rawText": "John Doe\n5+ years software engineering...<full text>"
}
```

**Response (201 Created):**
```json
{
  "id": "doc-uuid",
  "candidateId": "candidate-uuid",
  "documentType": "resume",
  "fileName": "resume.pdf",
  "storageKey": "candidates/candidate-uuid/documents/...",
  "uploadedAt": "2024-01-01T12:00:00.000Z"
}
```

### List Documents

```bash
GET /candidates/:candidateId/documents
x-user-id: user-123
x-workspace-id: workspace-456
```

Returns array of documents for the candidate.

### Request Summary Generation

```bash
POST /candidates/:candidateId/summaries/generate
x-user-id: user-123
x-workspace-id: workspace-456
Content-Type: application/json

{}
```

**Response (202 Accepted):**
```json
{
  "statusCode": 202,
  "message": "Summary generation enqueued",
  "summaryId": "summary-uuid"
}
```

Immediately returns while processing continues asynchronously.

### List Summaries

```bash
GET /candidates/:candidateId/summaries
x-user-id: user-123
x-workspace-id: workspace-456
```

Returns array of all summaries for the candidate.

### Get Summary

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
    "Strong systems design",
    "Clear communication"
  ],
  "concerns": [
    "Limited framework experience"
  ],
  "summary": "Experienced backend engineer...",
  "recommendedDecision": "advance",
  "provider": "gemini",
  "promptVersion": "v1",
  "errorMessage": null,
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:05:00.000Z"
}
```

## Project Structure

```
ts-service/
├── src/
│   ├── candidate/              # Candidate module
│   │   ├── dto/                # Data transfer objects
│   │   ├── candidate-document.service.ts
│   │   ├── candidate-document.controller.ts
│   │   ├── candidate-summary.service.ts
│   │   ├── candidate-summary.controller.ts
│   │   ├── candidate-summary-worker.service.ts
│   │   ├── background-job-processor.service.ts
│   │   └── candidate.module.ts
│   ├── entities/               # TypeORM entities
│   │   ├── sample-candidate.entity.ts
│   │   ├── sample-workspace.entity.ts
│   │   ├── candidate-document.entity.ts
│   │   └── candidate-summary.entity.ts
│   ├── auth/                   # Authentication
│   │   ├── auth.types.ts
│   │   ├── fake-auth.guard.ts
│   │   └── auth-user.decorator.ts
│   ├── llm/                    # LLM providers
│   │   ├── summarization-provider.interface.ts
│   │   ├── fake-summarization.provider.ts
│   │   ├── gemini-summarization.provider.ts
│   │   └── llm.module.ts
│   ├── queue/                  # Job queue
│   │   ├── queue.service.ts
│   │   └── queue.module.ts
│   ├── config/                 # Database config
│   │   ├── typeorm.config.ts
│   │   └── typeorm.options.ts
│   ├── migrations/             # TypeORM migrations
│   │   ├── 1710000000000-InitialStarterEntities.ts
│   │   └── 1710000000001-CreateCandidateDocumentsAndSummaries.ts
│   ├── app.module.ts           # Root module
│   └── main.ts                 # Bootstrap
├── test/                       # E2E tests
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── jest.config.ts              # Jest configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Key Implementation Details

### Database Schema

**Entities:**
- `sample_workspaces` - Multi-tenancy container
- `sample_candidates` - Candidate records
- `candidate_documents` - Uploaded documents with raw text
- `candidate_summaries` - Generated summaries with status

**Relationships:**
- Documents belong to candidate and workspace
- Summaries belong to candidate and workspace
- Cascade delete on workspace deletion

### Async Processing

**Architecture:**
1. HTTP request creates summary record (status: pending)
2. Job enqueued immediately
3. Returns HTTP 202 (accepted)
4. Background worker processes asynchronously
5. Updates summary record with results

**Workflow:**
```
Request → Create Pending → Enqueue → Return 202
                                        ↓
                            Background Worker
                                     ↓
                            Fetch Documents
                                     ↓
                            Call LLM API
                                     ↓
                            Validate Response
                                     ↓
                            Update Summary DB
```

### Provider Abstraction

**Interface:**
```typescript
SummarizationProvider {
  generateCandidateSummary(input): Promise<CandidateSummaryResult>
}
```

**Implementations:**
- `FakeSummarizationProvider` - Deterministic output (testing)
- `GeminiSummarizationProvider` - Real Google Gemini API

**Benefits:**
- Swap providers without changing business logic
- Easy testing with fake provider
- Supports multiple LLM backends in future

### Access Control

**Pattern:** Workspace-scoped queries

**Implementation:**
1. `FakeAuthGuard` extracts headers: x-user-id, x-workspace-id
2. Attaches to Express Request.user
3. All services filter by workspace_id
4. Database indexes on workspace_id

**Protection:** Prevents cross-workspace data access

## Performance Considerations

### Scaling

**Current:** Single-process, in-memory queue
- Good for: Development and testing
- Limitation: No persistence

**Production:** Real queue system
- Recommended: Bull (Redis-backed)
- Handles: Job persistence, retries, monitoring

### Database

**Current:** No connection pooling within NestJS
- Works for: Small to medium load
- Limitation: Connections per request

**Optimization:**
```typescript
// In typeorm.options
extra: {
  max: 20,  // Pool size
  min: 5,   // Keep-alive
}
```

### LLM Cost

Each summary request calls Gemini API:
- Estimate: $0.001-0.01 per request
- Limit: Monitor quota on Google Cloud Console

**Optimization:** Implement prompt caching for identical documents

## Layout Highlights

- `src/auth/`: fake auth guard, user decorator, auth types
- `src/entities/`: starter entities
- `src/sample/`: tiny example module (controller/service/dto)
- `src/queue/`: in-memory queue abstraction
- `src/llm/`: provider interface + fake provider
- `src/migrations/`: TypeORM migration files
