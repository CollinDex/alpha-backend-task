# Design Notes & Decisions

## Part A: Python Briefing Service

### Design Decisions

#### 1. Database Schema Normalization

**Decision:** Use separate tables for key points, risks, and metrics with foreign keys rather than JSON fields.

**Rationale:**
- Enables unique constraints (metric names per briefing)
- Natural support for ordering
- Efficient querying of specific subsets
- Supports future features like bulk operations, filtering
- Maintains data integrity at database level

**Alternative Considered:** 
- JSON fields in PostgreSQL - simpler but less flexible for constraints and queries
- Array columns - similar limitations as JSON

#### 2. Service Layer Pattern

**Decision:** `BriefingService` class handles all data operations with clear methods.

**Rationale:**
- Separation of concerns between API and data access
- Transactional operations (create briefing + all related data atomically)
- Reusable across multiple endpoints
- Testable without HTTP context
- Future-ready for caching, logging, audit trails

#### 3. Report Formatter

**Decision:** Separate `ReportFormatter` class transforms database models to template context.

**Rationale:**
- Decouples data from presentation logic
- Template receives fully-prepared context (no logic in template)
- Supports testing formatter independently
- Makes future reporting formats easier (PDF, DOCX, etc.)
- Sorting and normalization in one place

#### 4. Jinja2 Server-Side Templating

**Decision:** Use Jinja2 for server-rendered HTML (not React/Vue frontend).

**Rationale:**
- Secure auto-escaping prevents XSS attacks
- Direct HTML response for simple reporting use case
- No frontend build complexity
- Professional styling with plain CSS
- Scalable to complex layouts

**Design Elements:**
- Semantic HTML for accessibility
- Responsive CSS grid for metrics
- Color-coded sections (summary in yellow, recommendation in green)
- Print-friendly styling
- Proper footer with generation timestamp

#### 5. Validation Strategy

**Decision:** Comprehensive Pydantic schema validation with custom validators.

**Rationale:**
- Type safety at API boundary
- Field constraints (min/max length, requirements)
- Custom validation logic (ticker uppercase, metric uniqueness)
- Clear error messages to API consumers
- Prevents invalid data reaching database

**Validations Implemented:**
- `companyName`: Required, 1-255 chars
- `ticker`: Required, normalized to uppercase
- `summary`: Required, min 1 char
- `recommendation`: Required, min 1 char
- `keyPoints`: 2+ required, stripped of whitespace
- `risks`: 1+ required
- `metrics`: Optional, names must be unique per briefing

---

## Part B: TypeScript Candidate Service

### Design Decisions

#### 1. Provider Abstraction Pattern

**Decision:** `SummarizationProvider` interface with two implementations.

**Rationale:**
- Dependency inversion - controllers depend on interface, not concrete implementation
- Swap providers without changing business logic
- Easy testing with fake provider
- Supports multiple LLM backends
- Clear contract for provider implementations

**Implementations:**
- `FakeSummarizationProvider` - Deterministic output for testing
- `GeminiSummarizationProvider` - Real Google Gemini API calls

#### 2. Async Job Queue Architecture

**Decision:** Return HTTP 202 immediately, process in background.

**Rationale:**
- API doesn't block on LLM processing (which can be slow)
- Better user experience with status polling
- Failure isolation - LLM failures don't kill the request
- Enables scaling via separate worker processes
- Natural for microservices architecture

**Flow:**
1. POST /generate → Creates pending summary → Enqueues job → Returns 202
2. Client polls GET /summaries/:id to check status
3. Background job processes asynchronously
4. Updates summary record with results or error

#### 3. Worker Service Decoupling

**Decision:** `CandidateSummaryWorkerService` separate from API layer.

**Rationale:**
- Can run in separate process/container
- No HTTP context required
- Clear responsibility (process jobs)
- Testable independently
- Supports scaling workers separately from API

**Processing:**
1. Fetch candidate's documents
2. Call LLM provider
3. Validate response schema
4. Update summary status (completed/failed)
5. Error handling with message logging

#### 4. Access Control via Workspace

**Decision:** Filter all queries by workspace_id extracted from request headers.

**Rationale:**
- Multi-tenancy in assessment context
- Prevents cross-workspace data leaks
- Workspace acts as security boundary
- FakeAuthGuard enforces header presence
- All services validate workspace ownership

**Implementation:**
- FakeAuthGuard extracts x-user-id, x-workspace-id headers
- Attaches to Request.user object
- All services filter queries with workspace_id
- Database indexes on workspace_id for performance

#### 5. Data Serialization for JSON Fields

**Decision:** Use JSON strings for arrays in database, with helper properties.

**Rationale:**
- PostgreSQL JSON support for flexibility
- TypeORM doesn't natively support JSON array serialization
- Getter/setter pattern provides clean API
- Single source of truth (database)
- Maintains type safety in entity

**Example:**
```typescript
// Entity stores: '["strength1", "strength2"]'
get strengths(): string[] { return JSON.parse(this.strengthsJson); }
set strengths(value: string[]) { this.strengthsJson = JSON.stringify(value); }
```

#### 6. Gemini LLM Integration

**Decision:** Use Google Gemini API with structured JSON output parsing.

**Rationale:**
- Free tier available for development
- Modern model (1.5-flash) with good performance
- JSON mode for structured output
- Simple REST API
- Easy setup and debugging

**Prompt Design:**
- Explicit JSON format requirement
- Markdown code block stripping (models like to wrap JSON)
- Validation of all required fields
- Graceful degradation (defaults for invalid data)

**Error Handling:**
- API errors bubble up with helpful messages
- Response parsing failures caught and logged
- Summary marked as failed with error message
- User sees why generation failed

---

## Schema Decisions

### Python: Briefing Tables

```
briefings (main record)
  ├─ briefing_key_points (ordered list)
  ├─ briefing_risks (ordered list)
  └─ briefing_metrics (with uniqueness constraint)

Indexes:
- company_name (search by company)
- ticker (lookup)
- Foreign keys for referential integrity
```

### TypeScript: Candidate Tables

```
candidate_documents (input data)
  └─ workspace (multi-tenant ownership)

candidate_summaries (output data)
  ├─ workspace (multi-tenant ownership)
  ├─ candidate (relationship)
  └─ status tracking (pending/completed/failed)

Indexes:
- workspace_id + candidate_id (access control)
- status_type (find pending jobs)
```

---

## Testing Approaches

### Python Service

**Test File:** `tests/test_briefings.py`

**Coverage:**
- Create briefing with valid data ✓
- Validation failures (insufficient points, duplicate metrics) ✓
- Retrieve briefing by ID ✓
- Generate HTML report ✓
- Fetch rendered HTML ✓
- Edge cases (no optional fields, ticker normalization) ✓

**Test Approach:**
- In-memory SQLite database
- No external dependencies
- Fast execution (~0.5s)
- Comprehensive validation testing

### TypeScript Service

**Potential Test Areas:**
- Document upload and retrieval
- Summary creation (DB state)
- Queue job enqueuing
- Worker processing logic
- Gemini provider parsing
- Error handling

**Recommended Test Libraries:**
- Jest with supertest (for HTTP testing)
- TypeORM test utilities
- Mock LLM provider for isolated testing

---

## What I Would Improve With More Time

### High Priority

1. **Real Message Queue**
   - Implement Bull/BullMQ (Redis-backed) for robust job processing
   - Persistent queue survives application restarts
   - Retry logic with exponential backoff
   - Dead letter queue for failed jobs
   - Job monitoring and analytics

2. **Error Recovery**
   - Retry logic for transient Gemini API failures
   - Circuit breaker pattern for LLM provider
   - Fallback summaries for critical failures
   - Detailed error logs with context

3. **Caching Layer**
   - Cache briefing renders for repeated requests
   - Cache Gemini responses for identical documents
   - Redis with TTL-based invalidation
   - Improves response times significantly

4. **Database Optimization**
   - Connection pooling (PgBouncer)
   - Query optimization and EXPLAIN ANALYZE
   - Batching for bulk operations
   - Read replicas for analytics

5. **TypeScript Tests**
   - Comprehensive unit tests for all services
   - E2E tests for full workflows
   - Test coverage >80%
   - Mock Gemini for isolated testing

### Medium Priority

1. **API Improvements**
   - Pagination for listing endpoints
   - Filtering and sorting
   - Rate limiting
   - API versioning
   - OpenAPI/Swagger for TypeScript

2. **Security Enhancements**
   - Real authentication (JWT, OAuth2)
   - Role-based access control (RBAC)
   - Input sanitization beyond validation
   - CORS configuration
   - HTTPS enforcement

3. **Observability**
   - Structured logging (Winston, Pino)
   - Distributed tracing (OpenTelemetry)
   - Metrics/monitoring (Prometheus)
   - Error tracking (Sentry)
   - Performance profiling

4. **Document Handling**
   - Actual file storage (S3, GCS)
   - File type validation
   - Virus scanning
   - OCR for scanned documents
   - Document metadata extraction

5. **LLM Improvements**
   - Streaming responses for large documents
   - Multi-model support
   - Prompt caching
   - Cost tracking and limits
   - A/B testing different prompts

### Nice to Have

1. **Infrastructure**
   - Docker Compose for full stack
   - Kubernetes manifests
   - CI/CD pipeline (GitHub Actions)
   - Automated testing on PRs
   - Pre-commit hooks

2. **Documentation**
   - API documentation (Swagger UI for both services)
   - Architecture Decision Records (ADRs)
   - Deployment guides
   - Troubleshooting guides

3. **Developer Experience**
   - Local development setup script
   - Database seeding with sample data
   - Hot reload improvements
   - Better error messages
   - Request logging middleware

4. **Features**
   - Briefing versioning and history
   - Collaborative editing (concurrent updates)
   - Export to PDF/DOCX
   - Email report distribution
   - Scheduled summary generation

---

## Known Limitations

### Python Service

1. **Migration Management** - Manual SQL runner requires explicit up/down commands
   - Mitigation: Could use Alembic for auto-migration
   
2. **No Caching** - Renders same HTML on every request
   - Mitigation: Add Redis caching layer
   
3. **Single Process** - No horizontal scaling
   - Mitigation: Stateless design supports scaling behind load balancer

### TypeScript Service

1. **In-Memory Queue** - Jobs lost on restart
   - Mitigation: Use Redis/Bull for persistence
   
2. **No Retry Logic** - Failed jobs don't retry
   - Mitigation: Add retry mechanism to worker
   
3. **Fake Auth** - No real authentication
   - Mitigation: Implement JWT/OAuth2

4. **Synchronous LLM Processing** - One slow request blocks job processing
   - Mitigation: Worker pool or async queue

---

## Consistency & Patterns

### Both Services

**API Consistency:**
- RESTful endpoints (POST for creation, GET for retrieval)
- Consistent HTTP status codes (201 for created, 202 for accepted, 404 not found)
- JSON request/response bodies
- Error responses with descriptive messages

**Data Consistency:**
- Timestamps in ISO 8601 format (UTC)
- Numeric IDs where applicable, string UUIDs for distributed systems
- Null vs. empty array distinction
- Enum-like values (status types)

**Code Organization:**
- Clear separation of concerns (models, schemas, services, controllers)
- Type safety (TypeScript + Python type hints)
- Dependency injection where appropriate
- Single responsibility principle

**Testing:**
- Unit tests for business logic
- Integration tests for API contracts
- Test database isolation
- Clear test names describing scenarios

---

## Deployment Considerations

### Local Development
- Docker Compose for PostgreSQL
- In-memory queue (acceptable for testing)
- Fake LLM provider (fast, no API costs)

### Staging
- Real PostgreSQL with backups
- Redis for queue and caching
- Gemini API with rate limiting
- Local file storage for documents

### Production
- Multi-node PostgreSQL with replication
- Redis Cluster for queue and cache
- S3/GCS for document storage
- Dedicated worker nodes for job processing
- Load balancer in front of API servers
- CDN for static HTML reports
- Monitoring and alerting (Datadog, New Relic, etc.)

---

## Conclusion

This implementation demonstrates:
- ✅ Clean architecture with separation of concerns
- ✅ Type-safe development practices
- ✅ Comprehensive validation and error handling
- ✅ Async job processing pattern
- ✅ Database design with proper constraints
- ✅ Server-side HTML templating
- ✅ LLM provider abstraction
- ✅ Access control awareness
- ✅ Testable, maintainable code

The solution prioritizes clarity and correctness over premature optimization, making it easy to evolve and scale as requirements change.
