# Activity Logging Integration Guide

This guide shows how to integrate activity logging into your PACT node operations.

## Overview

The activity logging system provides a unified view of all application logs with CloudWatch-style hierarchical paths. Logs are stored in PostgreSQL and can be viewed through the web UI.

## Architecture

- **activity-logger.ts**: Specialized Pino logger for activity tracking (separate from main app logger)
- **activity-logger-transport.ts**: Custom Pino transport writing directly to PostgreSQL
- **ActivityLogService**: Service for querying logs via API
- **React UI**: Web interface with react-logviewer for browsing logs

## Log Paths

Logs are organized hierarchically by path:

- `/pact/nodes/{nodeId}/connections` - Node connection events
- `/pact/nodes/{nodeId}/api` - PACT API calls between nodes
- `/pact/nodes/{nodeId}/auth` - Authentication events
- `/pact/testing/{testRunId}` - Conformance test execution
- `/pact/system` - System-level events

## Usage Examples

### 1. Logging Node Connections

When a node establishes a connection with another node:

\`\`\`typescript
import { activityLogger } from '@src/common/activity-logger';

// In NodeConnectionService.createConnection()
activityLogger.logNodeConnection(
  nodeId,
  'info',
  \`Connected to node \${targetNodeId}\`,
  {
    targetNodeId,
    connectionId,
    status: 'active'
  },
  {
    organizationId: node.organizationId
  }
);
\`\`\`

### 2. Logging PACT API Calls

When making PACT API requests:

\`\`\`typescript
import { activityLogger } from '@src/common/activity-logger';

// In pact-api-client.ts - listFootprints()
try {
  const response = await fetch(url, options);
  
  activityLogger.logNodeApiCall(
    nodeId,
    'info',
    \`GET /2/footprints returned \${response.status}\`,
    {
      method: 'GET',
      path: '/2/footprints',
      statusCode: response.status,
      filters,
      pagination
    },
    {
      organizationId: node.organizationId
    }
  );
  
  return response;
} catch (error) {
  activityLogger.logNodeApiCall(
    nodeId,
    'error',
    \`GET /2/footprints failed: \${error.message}\`,
    {
      method: 'GET',
      path: '/2/footprints',
      error: error.message,
      filters,
      pagination
    },
    {
      organizationId: node.organizationId
    }
  );
  throw error;
}
\`\`\`

### 3. Logging Authentication Events

When nodes authenticate:

\`\`\`typescript
import { activityLogger } from '@src/common/activity-logger';

// In InternalNodeAuthService.generateToken()
activityLogger.logAuth(
  nodeId,
  'info',
  \`OAuth2 token generated for node\`,
  {
    tokenType: 'Bearer',
    expiresIn: 3600,
    scope: node.scope
  },
  {
    organizationId: node.organizationId
  }
);
\`\`\`

### 4. Logging Conformance Tests

When running conformance tests:

\`\`\`typescript
import { activityLogger } from '@src/common/activity-logger';

// In TestRunService.executeTest()
activityLogger.logConformanceTest(
  testRunId,
  'info',
  \`Test '\${testName}' completed\`,
  {
    testName,
    status: 'passed',
    duration: 1234,
    assertions: {
      passed: 10,
      failed: 0
    }
  },
  {
    organizationId,
    userId,
    nodeId
  }
);
\`\`\`

### 5. Custom Log Paths

For custom scenarios, use the base logger:

\`\`\`typescript
import { activityLogger } from '@src/common/activity-logger';

activityLogger.info({
  path: '/pact/system/migration',
  nodeId: null,
  organizationId: null,
  userId: null,
  msg: 'Database migration completed',
  content: {
    version: '2026_02_17_10_00_00',
    duration: 123
  }
});
\`\`\`

## API Endpoints

### Get Grouped Logs

\`\`\`
GET /api/activity-logs?limit=100&offset=0
\`\`\`

Returns summary of all log paths with count and last activity.

### Get Logs by Path

\`\`\`
GET /api/activity-logs/path?path=/pact/nodes/123/api&limit=500
\`\`\`

Returns detailed logs for a specific path.

### Get Node Logs

\`\`\`
GET /api/activity-logs/nodes/:nodeId?limit=500
\`\`\`

Returns all logs for a specific node across all paths.

### Delete Old Logs

\`\`\`
DELETE /api/activity-logs?olderThanDays=90
Authorization: Bearer <token>
\`\`\`

Deletes logs older than the specified number of days. Requires authentication.

## Web UI

Access the activity logs UI at `/activity-logs`:

1. **Grouped View**: See all log paths with activity counts
2. **Detail View**: Click a path to see detailed logs
3. **Table View**: Structured view with metadata (level, message, content, IDs)
4. **Raw Logs View**: react-logviewer with search, filtering, and line selection

## Best Practices

1. **Use Appropriate Log Levels**:
   - `debug`: Detailed diagnostic information
   - `info`: General informational messages (connections, API calls)
   - `warn`: Warning messages (deprecated features, high latency)
   - `error`: Error messages (failed API calls, connection errors)
   - `fatal`: Critical failures requiring immediate attention

2. **Include Contextual Information**:
   - Always include `nodeId`, `organizationId`, `userId` when available
   - Add relevant metadata in the `content` field (request params, response codes, etc.)

3. **Keep Messages Concise**:
   - Message should be a brief summary
   - Put detailed data in the `content` object

4. **Use Hierarchical Paths**:
   - Follow the established path structure
   - Group related operations under the same parent path

5. **Log Both Success and Failure**:
   - Log successful operations at `info` level
   - Log failures at `error` level with error details

## Performance Considerations

- The activity logger uses a background Pino transport
- Database writes are non-blocking and won't slow down your application
- Failed log writes go to stderr without crashing the app
- Consider setting up log retention policies (use DELETE endpoint)

## Example Integration Points

Here are the main places to add activity logging:

1. **NodeConnectionService**:
   - `createConnection()` - Log new connections
   - `updateConnectionStatus()` - Log status changes
   - `testConnection()` - Log connection tests

2. **PactApiClient**:
   - All API methods (`listFootprints()`, `getFootprint()`, `sendEvent()`)
   - Authentication flows
   - Error handling

3. **InternalNodeAuthService**:
   - `generateToken()` - Log token generation
   - `verifyToken()` - Log token verification
   - `validateInternalNode()` - Log validation attempts

4. **TestRunService**:
   - `executeTest()` - Log test execution
   - Test results (pass/fail)
   - Performance metrics

## Migration Checklist

- [x] Database migration applied (activity_logs table)
- [x] Activity logger service created
- [x] Pino transport implemented
- [x] API endpoints created
- [x] Web UI implemented with @melloware/react-logviewer
- [ ] Integrate into NodeConnectionService
- [ ] Integrate into PactApiClient
- [ ] Integrate into InternalNodeAuthService
- [ ] Integrate into TestRunService
- [ ] Set up log retention policy
- [ ] Monitor log volume and performance
