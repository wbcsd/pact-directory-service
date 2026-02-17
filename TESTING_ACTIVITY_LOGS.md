# Testing the Activity Logging System

This guide shows how to test the newly implemented activity logging system.

## Quick Start

### 1. Start the Services

```bash
# Terminal 1 - Start API
cd apps/api
npm run dev

# Terminal 2 - Start Frontend
cd apps/directory-portal
npm run dev
```

### 2. Generate Test Logs

Run the test script to create sample activity logs:

```bash
cd apps/api
npx tsx scripts/test-activity-logging.ts
```

This will create 10 sample log entries covering:
- ✅ Connection invitations sent
- ✅ Invitations accepted
- ✅ Invitations rejected
- ✅ Successful API calls
- ✅ Failed API calls
- ✅ Authentication events
- ✅ Conformance tests
- ✅ Connections removed
- ✅ Footprint requests

### 3. View the Logs

**Option A: Web UI (Recommended)**

Navigate to: http://localhost:5173/activity-logs

You'll see:
- Grouped view showing all log paths with counts
- Click any path to see detailed logs
- Switch between Table View and Raw Logs View
- Search and filter capabilities

**Option B: API Endpoints**

```bash
# Get grouped logs (summary)
curl http://localhost:3000/api/activity-logs | jq

# Get logs for a specific path
curl "http://localhost:3000/api/activity-logs/path?path=/pact/nodes/1/connections" | jq

# Get logs for a specific node
curl http://localhost:3000/api/activity-logs/nodes/1 | jq
```

## Testing Real Node Operations

### Test with Actual Node Invitations

1. **Login to the Directory Portal**
   - Navigate to http://localhost:5173/login
   - Login with your credentials

2. **Create a Node Connection**
   - Go to Nodes page
   - Select a node
   - Click "Connections" or "Invitations"
   - Create a new invitation

3. **Accept an Invitation**
   - Switch to the target node's view
   - Go to Invitations
   - Accept the pending invitation

4. **View the Activity Logs**
   - Navigate to Activity Logs page
   - You should see entries for:
     - `/pact/nodes/{nodeId}/connections` - Your invitation events

### Expected Log Paths

After testing real operations, you should see these log paths:

```
/pact/nodes/1/connections       - Node 1 connection activities
/pact/nodes/1/api              - API calls from/to Node 1
/pact/nodes/1/auth             - Authentication events for Node 1
/pact/nodes/2/connections      - Node 2 connection activities
/pact/testing/test-run-abc123  - Conformance test execution
```

### What Gets Logged

#### 1. Node Connection Events

**When**: Creating invitations, accepting, rejecting, or removing connections

**Log Fields**:
- `action`: `invitation_sent`, `invitation_accepted`, `invitation_rejected`, `connection_removed`
- `fromNodeName`: Name of the initiating node
- `targetNodeName`: Name of the target node
- `connectionId`: ID of the connection
- `organizationId`: Organization performing the action
- `userId`: User performing the action

#### 2. API Calls

**When**: Making PACT API requests between nodes

**Log Fields**:
- `endpoint`: API endpoint called (e.g., `/2/footprints`)
- `method`: HTTP method (GET, POST, etc.)
- `statusCode`: Response status code
- `duration`: Request duration in ms
- `resultCount`: Number of items returned

#### 3. Authentication Events

**When**: Generating or verifying OAuth2 tokens

**Log Fields**:
- `action`: `token_generated`, `token_verified`, `token_rejected`
- `clientId`: OAuth2 client ID
- `success`: Whether authentication succeeded
- `grantType`: OAuth2 grant type

#### 4. Footprint Requests

**When**: Requesting footprints from a connected node

**Log Fields**:
- `action`: `footprints_requested`
- `connectionId`: Connection used
- `resultCount`: Number of footprints returned
- `filters`: Filters applied to the query

## Verifying the Integration

### Check Database

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# View recent logs
SELECT 
  id, 
  path, 
  level, 
  message, 
  created_at 
FROM activity_logs 
ORDER BY created_at DESC 
LIMIT 20;

# Count logs by path
SELECT 
  path, 
  COUNT(*) as count,
  MAX(created_at) as last_activity
FROM activity_logs
GROUP BY path
ORDER BY last_activity DESC;

# View logs for a specific node
SELECT * 
FROM activity_logs 
WHERE node_id = 1 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Pino Transport

The activity logger uses a custom Pino transport that writes to PostgreSQL. If logs aren't appearing:

1. **Check for errors in the console**
   - Look for transport initialization errors
   - Check for database connection errors

2. **Verify DATABASE_URL is set**
   ```bash
   echo $DATABASE_URL
   ```

3. **Check the transport is running**
   - The transport writes asynchronously
   - Give it 1-2 seconds after logging

## Troubleshooting

### Logs Not Appearing

**Issue**: Created test logs but don't see them in UI

**Solutions**:
1. Wait 2-3 seconds for async transport to write
2. Refresh the page
3. Check database directly: `SELECT COUNT(*) FROM activity_logs;`
4. Check API endpoint: `curl http://localhost:3000/api/activity-logs`
5. Look for errors in API console

### Empty Grouped View

**Issue**: Activity Logs page shows "No activity logs found"

**Solutions**:
1. Run the test script: `npx tsx scripts/test-activity-logging.ts`
2. Perform actual node operations (create invitation, etc.)
3. Check API response: `curl http://localhost:3000/api/activity-logs`

### TypeScript Errors

**Issue**: Import errors for activity logger

**Solution**:
```typescript
// Correct import
import { logNodeConnection } from '@src/common/activity-logger';

// NOT this (no default export as activityLogger)
import activityLogger from '@src/common/activity-logger'; // ❌
```

### Database Migration Not Run

**Issue**: Table 'activity_logs' doesn't exist

**Solution**:
```bash
cd apps/api
npm run db:migrate
```

## Example Output

### Console Output (Test Script)
```
Creating test activity logs...

1. Logging node connection invitation...
2. Logging invitation accepted...
3. Logging successful API call...
4. Logging failed API call...
5. Logging successful authentication...
6. Logging failed authentication...
7. Logging conformance test...
8. Logging connection removed...
9. Logging footprints requested...
10. Logging invitation rejected...

✅ Test logs created successfully!

You can now view them at:
- Web UI: http://localhost:5173/activity-logs
- API: http://localhost:3000/api/activity-logs

Note: It may take a moment for logs to appear in the database.

✨ Logs should now be visible in the UI!
```

### Web UI Output

**Grouped View**:
```
Path                              Count  Last Activity           Level  Last Message
/pact/nodes/1/connections        5      2026-02-17 14:45:23    INFO   Connection removed
/pact/nodes/1/api               2      2026-02-17 14:45:21    ERROR  API call GET /2/footprints/invalid-id
/pact/nodes/2/connections       2      2026-02-17 14:45:19    INFO   Invitation accepted
/pact/testing/test-run-abc123   1      2026-02-17 14:45:22    INFO   Conformance test completed
```

### API Response

```json
{
  "logs": [
    {
      "path": "/pact/nodes/1/connections",
      "count": 5,
      "lastCreatedAt": "2026-02-17T14:45:23.000Z",
      "lastLevel": "info",
      "lastMessage": "Node connection connection_removed"
    }
  ],
  "total": 4
}
```

## Next Steps

1. ✅ Test with sample data using the script
2. ✅ Test with real node operations (create/accept invitations)
3. ✅ Verify logs appear in UI and database
4. ✅ Test search and filtering in Raw Logs View
5. ⏳ Integrate logging into remaining services (if needed)
6. ⏳ Set up log retention policy
7. ⏳ Monitor log volume in production

## Success Criteria

The activity logging system is working correctly when:

- ✅ Test script creates logs visible in UI within 2-3 seconds
- ✅ Real node operations (invitations) generate logs
- ✅ Logs are grouped by path in the main view
- ✅ Detail view shows full log content including JSONB metadata
- ✅ Raw logs view allows searching and filtering
- ✅ API endpoints return correct data
- ✅ No errors in console or database

Enjoy your new unified activity logging system! 🎉
