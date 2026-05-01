# PACT v3 Conformance Implementation

## Overview

This document describes the complete PACT v3 conformance implementation for internal nodes in the PACT Directory Service. The implementation is based on patterns from the [wbcsd/pact-conformance-service](https://github.com/wbcsd/pact-conformance-service) repository and follows the PACT specification exactly.

## Implementation Status

### ✅ Completed Features

1. **Authentication Endpoint**
   - `POST /api/nodes/:nodeId/auth/token`
   - OAuth2 Client Credentials flow
   - JWT token generation (1 hour expiry)
   - Connection credential validation

2. **PACT v3 Footprint Endpoints**
   - `GET /api/nodes/:nodeId/3/footprints` - List with filtering
   - `GET /api/nodes/:nodeId/3/footprints/:id` - Get single footprint
   - Version-prefixed URLs matching PACT spec

3. **Events Endpoint**
   - `POST /api/nodes/:nodeId/3/events` - CloudEvents handler
   - CloudEvents 1.0 format validation
   - Support for all PACT event types

4. **Advanced Filtering**
   - Basic filters: `productId`, `companyId`, `status`
   - Geography filter: Matches country, region, or subdivision
   - Classification filter: Matches productClassifications array
   - Temporal filters: `validOn`, `validAfter`, `validBefore`
   - Fallback logic: Uses referencePeriod if validityPeriod missing

5. **Pagination**
   - Offset/limit pattern (not page numbers)
   - Link header generation (first, prev, next, last)
   - Configurable page size

## Architecture

### Service Layer

**`InternalNodePactService`** (`services/internal-node-pact-service.ts`)

Core business logic for PACT API operations:

```typescript
class InternalNodePactService {
  // List footprints with comprehensive filtering
  getFootprints(filters: FootprintFilters, pagination: PaginationParams): {
    data: ProductFootprintV3[];
    links: PaginationLinks;
  }

  // Get single footprint by ID
  getFootprintById(id: string): ProductFootprintV3 | undefined;

  // Build pagination links
  buildPaginationLinks(totalCount: number, params: PaginationParams): PaginationLinks;

  // Format Link HTTP header
  buildLinkHeader(links: PaginationLinks, baseUrl: string): string | null;
}
```

**Key Features:**
- Mock data from `mock-footprints-v3.ts`
- Advanced filtering with OR logic for geography
- Temporal filtering with date range checks
- Classification matching against arrays
- Link header generation per PACT spec

### Filter Implementation

#### Geography Filter
Matches **any** of these fields:
- `pcf.geography.country`
- `pcf.geography.regionOrSubregion`
- `pcf.geography.countrySubdivision`

```typescript
if (filters.geography) {
  filtered = filtered.filter(
    (fp) =>
      fp.pcf.geography?.country?.toLowerCase() === filters.geography!.toLowerCase() ||
      fp.pcf.geography?.regionOrSubregion?.toLowerCase() === filters.geography!.toLowerCase() ||
      fp.pcf.geography?.countrySubdivision?.toLowerCase() === filters.geography!.toLowerCase()
  );
}
```

#### Classification Filter
Matches product classifications array:

```typescript
if (filters.classification) {
  filtered = filtered.filter((fp) =>
    fp.productClassifications?.some((pc) => pc.classId === filters.classification)
  );
}
```

#### Temporal Filters
Checks validity period with fallback to reference period:

```typescript
// validOn: Footprint valid on specific date
if (filters.validOn) {
  const validOnDate = new Date(filters.validOn);
  filtered = filtered.filter((fp) => {
    if (fp.validityPeriod?.start && fp.validityPeriod?.end) {
      const start = new Date(fp.validityPeriod.start);
      const end = new Date(fp.validityPeriod.end);
      return validOnDate >= start && validOnDate <= end;
    }
    // Fallback to reference period
    const start = new Date(fp.pcf.referencePeriod.start);
    const end = new Date(fp.pcf.referencePeriod.end);
    return validOnDate >= start && validOnDate <= end;
  });
}

// validAfter: Validity starts on or after date
if (filters.validAfter) {
  const afterDate = new Date(filters.validAfter);
  filtered = filtered.filter((fp) => {
    const start = fp.validityPeriod?.start || fp.pcf.referencePeriod.start;
    return new Date(start) >= afterDate;
  });
}

// validBefore: Validity ends on or before date
if (filters.validBefore) {
  const beforeDate = new Date(filters.validBefore);
  filtered = filtered.filter((fp) => {
    const end = fp.validityPeriod?.end || fp.pcf.referencePeriod.end;
    return new Date(end) <= beforeDate;
  });
}
```

### Routes Layer

**`internal-node-routes.ts`**

Express route handlers with query parameter parsing:

```typescript
// Parse all filter parameters
const productId = req.query.productId as string | undefined;
const companyId = req.query.companyId as string | undefined;
const geography = req.query.geography as string | undefined;
const classification = req.query.classification as string | undefined;
const status = req.query.status as string | undefined;
const validOn = req.query.validOn as string | undefined;
const validAfter = req.query.validAfter as string | undefined;
const validBefore = req.query.validBefore as string | undefined;

// Pass to service
const result = services.internalNodePact.getFootprints(
  { productId, companyId, geography, classification, status, validOn, validAfter, validBefore },
  { limit, offset }
);
```

### Events Handling

**CloudEvents 1.0 Format:**

```json
{
  "type": "org.wbcsd.pact.ProductFootprint.PublishedEvent.3",
  "specversion": "1.0",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "https://example.com/footprints",
  "time": "2023-05-19T12:30:00Z",
  "data": {
    "pfIds": ["urn:gtin:4712345060507"]
  }
}
```

**Supported Event Types** (from `models/pact-v3/events.ts`):
- `org.wbcsd.pact.ProductFootprint.RequestCreatedEvent.3`
- `org.wbcsd.pact.ProductFootprint.RequestFulfilledEvent.3`
- `org.wbcsd.pact.ProductFootprint.RequestRejectedEvent.3`
- `org.wbcsd.pact.ProductFootprint.PublishedEvent.3`

**Event Handler** (in routes):
```typescript
router.post(
  "/:nodeId/3/events",
  authenticateInternalNode,
  async (req: Request, res: Response, next: NextFunction) => {
    // Validate CloudEvents format
    if (!req.body.type || !req.body.specversion || !req.body.id || !req.body.source) {
      throw new BadRequestError("Invalid CloudEvents format");
    }

    // Log event for audit trail
    logger.info({
      nodeId,
      eventType: req.body.type,
      eventId: req.body.id,
      eventSource: req.body.source,
    }, "Received PACT event for internal node");

    // Acknowledge receipt
    res.status(200).send();
  }
);
```

## API Examples

### Authentication

```bash
# Get access token
curl -X POST "http://localhost:3010/api/nodes/5/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=abc123&client_secret=secret456"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### List Footprints

```bash
# Basic listing
curl -X GET "http://localhost:3010/api/nodes/5/3/footprints?limit=10&offset=0" \
  -H "Authorization: Bearer <token>"

# Filter by geography
curl -X GET "http://localhost:3010/api/nodes/5/3/footprints?geography=US" \
  -H "Authorization: Bearer <token>"

# Filter by status
curl -X GET "http://localhost:3010/api/nodes/5/3/footprints?status=Active" \
  -H "Authorization: Bearer <token>"

# Filter by validity date
curl -X GET "http://localhost:3010/api/nodes/5/3/footprints?validOn=2023-06-01" \
  -H "Authorization: Bearer <token>"

# Filter by classification
curl -X GET "http://localhost:3010/api/nodes/5/3/footprints?classification=urn:gtin:4712345060507" \
  -H "Authorization: Bearer <token>"

# Multiple filters (AND logic)
curl -X GET "http://localhost:3010/api/nodes/5/3/footprints?geography=US&status=Active&validOn=2023-06-01" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "data": [
    {
      "id": "urn:gtin:4712345060507",
      "specVersion": "3.0.0",
      "version": 1,
      "created": "2023-01-15T10:30:00Z",
      "status": "Active",
      "companyName": "TechCorp USA",
      "companyIds": ["urn:epc:id:sgln:4012345.00000.0"],
      "productDescription": "High-performance laptop computer",
      "productIds": ["urn:gtin:4712345060507"],
      "pcf": {
        "declaredUnit": "kilogram",
        "unitaryProductAmount": "1",
        "fossilGhgEmissions": "100.5",
        "biogenicCarbonContent": "0",
        "biogenicEmissions": "2.0",
        "characterizationFactors": "AR6",
        "referencePeriod": {
          "start": "2022-01-01T00:00:00Z",
          "end": "2022-12-31T23:59:59Z"
        },
        "geography": {
          "country": "US"
        }
      }
    }
  ]
}
```

**Link Header:**
```
Link: <http://localhost:3010/api/nodes/5/3/footprints?limit=10&offset=0>; rel="first",
      <http://localhost:3010/api/nodes/5/3/footprints?limit=10&offset=10>; rel="next",
      <http://localhost:3010/api/nodes/5/3/footprints?limit=10&offset=20>; rel="last"
```

### Get Single Footprint

```bash
curl -X GET "http://localhost:3010/api/nodes/5/3/footprints/urn:gtin:4712345060507" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "data": {
    "id": "urn:gtin:4712345060507",
    ...
  }
}
```

### Send Event

```bash
curl -X POST "http://localhost:3010/api/nodes/5/3/events" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/cloudevents+json" \
  -d '{
    "type": "org.wbcsd.pact.ProductFootprint.PublishedEvent.3",
    "specversion": "1.0",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "source": "https://example.com/footprints",
    "time": "2023-05-19T12:30:00Z",
    "data": {
      "pfIds": ["urn:gtin:4712345060507"]
    }
  }'
```

**Response:**
- `200 OK` with empty body

## Files Modified/Created

### Created Files
- ✅ `apps/api/src/models/pact-v3/events.ts` - CloudEvents types and PACT event definitions
- ✅ `docs/pact-v3-conformance-implementation.md` - This document

### Modified Files
- ✅ `apps/api/src/services/internal-node-pact-service.ts` - Added advanced filtering logic
- ✅ `apps/api/src/routes/internal-node-routes.ts` - Updated URLs to `/3/` prefix, added events endpoint
- ✅ `docs/internal-node-virtual-pact-api.md` - Updated documentation with new features

## Testing

### Manual Testing Steps

1. **Start the API:**
   ```bash
   cd apps/api
   docker compose up -d
   npm run db:migrate
   npm run dev
   ```

2. **Create test connection:**
   ```bash
   npm run db:add-user test@example.com "Test User" "password" "administrator" "TestCo" "test-co"
   # Note the node ID returned
   ```

3. **Test authentication:**
   ```bash
   curl -X POST "http://localhost:3010/api/nodes/5/auth/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=client_credentials&client_id=abc123&client_secret=secret456"
   ```

4. **Test footprint listing:**
   ```bash
   # All footprints
   curl -X GET "http://localhost:3010/api/nodes/5/3/footprints" \
     -H "Authorization: Bearer <token>"
   
   # Filter by geography
   curl -X GET "http://localhost:3010/api/nodes/5/3/footprints?geography=US" \
     -H "Authorization: Bearer <token>"
   
   # Filter by date
   curl -X GET "http://localhost:3010/api/nodes/5/3/footprints?validOn=2023-06-01" \
     -H "Authorization: Bearer <token>"
   ```

5. **Test single footprint:**
   ```bash
   curl -X GET "http://localhost:3010/api/nodes/5/3/footprints/urn:gtin:4712345060507" \
     -H "Authorization: Bearer <token>"
   ```

6. **Test events:**
   ```bash
   curl -X POST "http://localhost:3010/api/nodes/5/3/events" \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/cloudevents+json" \
     -d '{
       "type": "org.wbcsd.pact.ProductFootprint.PublishedEvent.3",
       "specversion": "1.0",
       "id": "test-event-1",
       "source": "https://test.example.com",
       "time": "2023-05-19T12:30:00Z",
       "data": {"pfIds": ["urn:gtin:4712345060507"]}
     }'
   ```

### Expected Results

- ✅ Authentication returns JWT token with 1-hour expiry
- ✅ Footprint listing returns `{ "data": [...] }` format
- ✅ Link header appears with pagination links
- ✅ Geography filter matches US, DE, NL footprints correctly
- ✅ Temporal filters work with validityPeriod and referencePeriod fallback
- ✅ Single footprint returns wrapped in `{ "data": {...} }`
- ✅ Events endpoint returns 200 OK with empty body
- ✅ Invalid CloudEvents format returns 400 Bad Request

## Conformance Checklist

Based on wbcsd/pact-conformance-service patterns:

- ✅ **URL Structure**: `/3/footprints` and `/3/footprints/:id` with version prefix
- ✅ **Authentication**: OAuth2 Client Credentials with JWT
- ✅ **Response Format**: `{ "data": [...] }` wrapper for all endpoints
- ✅ **Pagination**: offset/limit pattern with Link header
- ✅ **Filters**: productId, companyId, geography, classification, status, validOn, validAfter, validBefore
- ✅ **Geography Matching**: OR logic across country/region/subdivision
- ✅ **Classification Matching**: Array matching with productClassifications
- ✅ **Temporal Filtering**: validityPeriod with referencePeriod fallback
- ✅ **Events**: CloudEvents 1.0 format with all PACT event types
- ✅ **Error Handling**: Proper HTTP status codes (400, 401, 404)
- ✅ **Empty Results**: Returns `{ "data": [] }` for no matches

## Future Enhancements

### Database Integration
Currently using mock data. Future versions should:
- Store footprints in PostgreSQL
- Implement proper CRUD operations
- Add database migrations for footprints table
- Support bulk import/export

### Event Processing
Current implementation only logs events. Future versions should:
- Store events in database for audit trail
- Trigger webhooks for subscribed listeners
- Implement event replay functionality
- Add event filtering and querying

### Advanced Features
- Webhook subscriptions for footprint updates
- Batch operations for bulk footprint updates
- Search with full-text indexing
- Caching layer for performance
- Rate limiting per connection
- Metrics and monitoring

## References

- [PACT Specification v3.0.0](https://wbcsd.github.io/pact/)
- [wbcsd/pact-conformance-service](https://github.com/wbcsd/pact-conformance-service)
- [CloudEvents Specification v1.0](https://github.com/cloudevents/spec/blob/v1.0/spec.md)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)

## Changelog

### 2024-01-XX - Initial PACT v3 Conformance Implementation
- ✅ Implemented version-prefixed URLs (`/3/footprints`)
- ✅ Added advanced filtering (geography, classification, temporal)
- ✅ Added CloudEvents endpoint (`/3/events`)
- ✅ Updated documentation with examples and testing guide
- ✅ Created CloudEvents type definitions
- ✅ Validated against pact-conformance-service patterns
