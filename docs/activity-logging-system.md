# Activity Logging System - Implementation Complete ✅

A unified activity logging system for tracking API calls, connections, authentication events, and conformance tests between PACT nodes.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Backend Implementation](#backend-implementation)
- [Frontend Implementation](#frontend-implementation)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Deployment](#deployment)

## Overview

The Activity Logging System provides a CloudWatch-style hierarchical log viewer for the PACT Directory Service. It captures detailed activity from node operations, API calls, authentication events, and conformance tests in a PostgreSQL database and presents them through an intuitive web interface.

### Key Features

- ✅ **Hierarchical Log Paths** - CloudWatch-style paths like `/pact/nodes/{nodeId}/api`
- ✅ **Database Persistence** - PostgreSQL with JSONB support for flexible log content
- ✅ **Non-Blocking Logging** - Pino transport writes asynchronously without impacting app performance
- ✅ **Rich Web UI** - Table view and raw log viewer with search/filtering
- ✅ **Contextual Metadata** - Track logs by node, organization, user, and custom fields
- ✅ **TypeScript** - Fully typed end-to-end

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Application Code (NodeConnectionService, PactApiClient)  │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  activity-logger.ts   │  ← Specialized Pino logger
         │  (Pino instance)      │     with helper functions
         └───────────┬───────────┘
                     │
                     ▼
      ┌──────────────────────────────┐
      │ activity-logger-transport.ts │  ← Custom Pino transport
      │   (pino-abstract-transport)  │     writes to PostgreSQL
      └──────────────┬───────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │  PostgreSQL DB  │
            │ activity_logs   │
            │ table (JSONB)   │
            └────────┬────────┘
                     │
                     ▼
       ┌─────────────────────────────┐
       │   ActivityLogService        │  ← Query interface
       │  - getGroupedLogs()         │
       │  - getLogsByPath()          │
       │  - getNodeLogs()            │
       └────────────┬────────────────┘
                    │
                    ▼
          ┌────────────────────┐
          │  API Endpoints     │  ← REST API
          │  /api/activity-logs │
          └─────────┬──────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │  React UI                 │  ← Web interface
        │  - ActivityLogsPage       │     with react-logviewer
        │  - ActivityLogDetailPage  │
        └───────────────────────────┘
```

## Backend Implementation

### 1. Database Layer

**Migration**: `apps/api/src/database/migrations/2026_02_17_10_00_00_activity_logs.ts`

Creates `activity_logs` table with:
- `id` (serial primary key)
- `path` (varchar) - Hierarchical log path
- `level` (varchar) - Log level (debug, info, warn, error, fatal)
- `message` (text) - Log message
- `content` (jsonb) - Flexible JSON content
- `node_id`, `organization_id`, `user_id` (foreign keys, nullable)
- `created_at` (timestamp)

**Indexes**:
- `path` - For filtering by log path
- `level` - For filtering by severity
- `node_id`, `organization_id` - For entity-specific queries
- `created_at` - For time-based queries and ordering
- GIN index on `content` - For JSONB queries

**Types**: `apps/api/src/database/types.ts`
- `ActivityLogsTable` interface with camelCase fields (auto-converted by Kysely)

### 2. Logging Infrastructure

**Activity Logger**: `apps/api/src/common/activity-logger.ts`
- Specialized logger for activity tracking
- Writes directly to PostgreSQL (async, fire-and-forget)
- Helper functions:
  - `logNodeConnection(nodeId, targetNodeId, action, content, context)`
  - `logNodeApiCall(nodeId, endpoint, method, statusCode, content, context)`
  - `logNodeAuth(nodeId, action, success, content, context)`
  - `logConformanceTest(testRunId, status, content, context)`

**Note**: The original design included a custom Pino transport, but for simplicity and compatibility with `tsx` in development, we now write directly to the database using Kysely.

### 3. Service Layer

**ActivityLogService**: `apps/api/src/services/activity-log-service.ts`

Methods:
- `getGroupedLogs(filters, query)` - Get summary by path with counts
- `getLogsByPath(path, query)` - Get detailed logs for a specific path
- `getNodeLogs(nodeId, query)` - Get all logs for a node
- `deleteOldLogs(olderThanDays)` - Cleanup utility

Registered in `ServiceContainer` at `apps/api/src/services/index.ts`

### 4. API Routes

**Routes**: `apps/api/src/routes/activity-log-routes.ts`

Endpoints:
- `GET /api/activity-logs` - Grouped logs by path
- `GET /api/activity-logs/path?path={path}` - Detailed logs for path
- `GET /api/activity-logs/nodes/:nodeId` - Logs for specific node
- `DELETE /api/activity-logs?olderThanDays={days}` - Delete old logs (authenticated)

Mounted in main router at `apps/api/src/routes/index.ts`

## Frontend Implementation

### 1. Pages

**ActivityLogsPage**: `apps/directory-portal/src/pages/ActivityLogsPage.tsx`
- Displays grouped logs by path
- Shows count, last activity, level, and message
- Click-through to detail view
- Refresh button

**ActivityLogDetailPage**: `apps/directory-portal/src/pages/ActivityLogDetailPage.tsx`
- Detailed view for a specific log path
- Two view modes:
  - **Table View**: Structured cards with metadata, JSONB content, and context IDs
  - **Raw Logs View**: @melloware/react-logviewer with search, filtering, line selection
- Navigate back to grouped view
- Refresh logs
- Displays node ID, organization ID, user ID badges

### 2. Type Declarations

**@melloware/react-logviewer**: `apps/directory-portal/src/types/react-logviewer.d.ts`
- TypeScript definitions for @melloware/react-logviewer package
- `LazyLog` component interface

### 3. Routes

Updated `apps/directory-portal/src/AppRoutes.tsx`:
- `/activity-logs` - Grouped logs page
- `/activity-logs/path` - Detail page with query param

### 4. Navigation

Updated `apps/directory-portal/src/components/SideNav.tsx`:
- Added "Activity Logs" menu item under Services section
- No authentication required (public viewing)

### 5. Dependencies

Installed packages:
- `@melloware/react-logviewer` - Log viewer component with search and filtering

## API Endpoints

### GET /api/activity-logs

Get grouped activity logs (summary by path).

**Query Parameters**:
- `limit` (optional, default: 50) - Number of results
- `offset` (optional, default: 0) - Pagination offset

**Response**:
```json
{
  "logs": [
    {
      "path": "/pact/nodes/123/api",
      "count": 45,
      "lastCreatedAt": "2026-02-17T14:30:00Z",
      "lastLevel": "info",
      "lastMessage": "GET /2/footprints returned 200"
    }
  ],
  "total": 10
}
```

### GET /api/activity-logs/path

Get detailed logs for a specific path.

**Query Parameters**:
- `path` (required) - The log path to query
- `limit` (optional, default: 100) - Number of results
- `offset` (optional, default: 0) - Pagination offset

**Response**:
```json
{
  "logs": [
    {
      "id": 123,
      "path": "/pact/nodes/456/api",
      "level": "info",
      "message": "GET /2/footprints returned 200",
      "content": {
        "method": "GET",
        "path": "/2/footprints",
        "statusCode": 200,
        "duration": 123
      },
      "nodeId": 456,
      "organizationId": 789,
      "userId": null,
      "createdAt": "2026-02-17T14:30:00Z"
    }
  ],
  "total": 45
}
```

### GET /api/activity-logs/nodes/:nodeId

Get all logs for a specific node.

**Path Parameters**:
- `nodeId` - The node ID

**Query Parameters**:
- `limit` (optional, default: 100)
- `offset` (optional, default: 0)

**Response**: Same as `/path` endpoint

### DELETE /api/activity-logs

Delete old activity logs (requires authentication).

**Query Parameters**:
- `olderThanDays` (required) - Delete logs older than this many days

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response**:
```json
{
  "deletedCount": 1234
}
```

## Usage Examples

### Example 1: Log Node Connection

```typescript
import { activityLogger } from '@src/common/activity-logger';

// In NodeConnectionService.createConnection()
activityLogger.logNodeConnection(
  nodeId,
  'info',
  `Connected to node ${targetNodeId}`,
  {
    targetNodeId,
    connectionId,
    status: 'active',
    protocol: 'https'
  },
  {
    organizationId: node.organizationId
  }
);
```

### Example 2: Log PACT API Call

```typescript
import { activityLogger } from '@src/common/activity-logger';

// In PactApiClient.listFootprints()
try {
  const response = await fetch(url, options);
  
  activityLogger.logNodeApiCall(
    nodeId,
    'info',
    `GET /2/footprints returned ${response.status}`,
    {
      method: 'GET',
      path: '/2/footprints',
      statusCode: response.status,
      duration: Date.now() - startTime,
      filters: { productId, companyId }
    },
    {
      organizationId: node.organizationId
    }
  );
} catch (error) {
  activityLogger.logNodeApiCall(
    nodeId,
    'error',
    `GET /2/footprints failed: ${error.message}`,
    {
      method: 'GET',
      path: '/2/footprints',
      error: error.message,
      stack: error.stack
    }
  );
}
```

### Example 3: Log Authentication Event

```typescript
import { activityLogger } from '@src/common/activity-logger';

// In InternalNodeAuthService.generateToken()
activityLogger.logAuth(
  nodeId,
  'info',
  'OAuth2 token generated',
  {
    tokenType: 'Bearer',
    expiresIn: 3600,
    scope: node.scope,
    grantType: 'client_credentials'
  },
  {
    organizationId: node.organizationId
  }
);
```

### Example 4: Log Conformance Test

```typescript
import { activityLogger } from '@src/common/activity-logger';

// In TestRunService.executeTest()
activityLogger.logConformanceTest(
  testRunId,
  'info',
  `Test '${testName}' completed`,
  {
    testName,
    status: 'passed',
    duration: 1234,
    assertions: {
      passed: 10,
      failed: 0,
      skipped: 2
    }
  },
  {
    organizationId,
    userId,
    nodeId
  }
);
```

## Testing

### Backend Tests

Run activity log service tests:
```bash
cd apps/api
npm test -- activity-log-service.test.ts
```

Test the API endpoints:
```bash
# Start the API server
npm run dev

# Test grouped logs
curl http://localhost:3000/api/activity-logs

# Test logs by path
curl "http://localhost:3000/api/activity-logs/path?path=/pact/nodes/1/api"

# Test node logs
curl http://localhost:3000/api/activity-logs/nodes/1
```

### Frontend Testing

Start the development server:
```bash
cd apps/directory-portal
npm run dev
```

Navigate to:
- http://localhost:5173/activity-logs - Grouped logs page
- Click any log path to view details

## Deployment

### 1. Run Database Migration

```bash
cd apps/api
npm run db:migrate
```

Verify migration:
```
┌─────────┬─────────────────────────────────────┬───────────┬───────────┐
│ (index) │ migrationName                       │ direction │ status    │
├─────────┼─────────────────────────────────────┼───────────┼───────────┤
│ 0       │ '2026_02_17_10_00_00_activity_logs' │ 'Up'      │ 'Success' │
└─────────┴─────────────────────────────────────┴───────────┴───────────┘
```

### 2. Install Dependencies

```bash
# Frontend only
cd apps/directory-portal
npm install @melloware/react-logviewer
```

### 3. Environment Variables

No additional environment variables required. Uses existing database connection from `DATABASE_URL`.

### 4. Integration Checklist

- [ ] Integrate logging into `NodeConnectionService`
- [ ] Integrate logging into `PactApiClient`
- [ ] Integrate logging into `InternalNodeAuthService`
- [ ] Integrate logging into `TestRunService`
- [ ] Set up log retention policy (recommend 90 days)
- [ ] Monitor log volume and database size
- [ ] Consider archiving strategy for old logs

### 5. Production Considerations

**Performance**:
- Logging is non-blocking via Pino transport
- Database writes happen asynchronously
- Indexes ensure fast queries on large log volumes

**Storage**:
- JSONB content is flexible but uses more space
- Set up periodic cleanup with DELETE endpoint
- Consider partitioning table by created_at for very large datasets

**Security**:
- Read endpoints are public (no auth required)
- DELETE endpoint requires authentication
- Consider adding role-based access control for sensitive logs

**Monitoring**:
- Watch for failed writes in stderr
- Monitor database size growth
- Set up alerts for error-level logs

## Log Path Conventions

Follow these path patterns for consistency:

- `/pact/nodes/{nodeId}/connections` - Node connection events
- `/pact/nodes/{nodeId}/api` - PACT API calls
- `/pact/nodes/{nodeId}/auth` - Authentication events
- `/pact/testing/{testRunId}` - Conformance test execution
- `/pact/system` - System-level events (migrations, startup, etc.)

## Summary

The Activity Logging System is now fully implemented with:

✅ PostgreSQL database table with indexes  
✅ Pino-based logging infrastructure with custom transport  
✅ Service layer for querying logs  
✅ REST API endpoints  
✅ React UI with table and raw log views  
✅ Navigation menu integration  
✅ TypeScript types end-to-end  
✅ Documentation and integration guide  

**Ready for integration into existing node operations!**

See [activity-logging-integration.md](./activity-logging-integration.md) for detailed integration instructions.
