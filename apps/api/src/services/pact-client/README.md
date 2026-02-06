# PACT API Client Architecture

## Overview

This directory contains a unified client abstraction for communicating with PACT-compliant nodes. The design follows SOLID principles to enable seamless communication with both **internal nodes** (direct service calls) and **external nodes** (HTTP API calls) using the exact same interface.

## Design Philosophy

### SOLID Principles Applied

1. **Single Responsibility**: Each client implementation handles one type of communication
   - `InternalNodePactClient` → Direct service calls
   - `ExternalNodePactClient` → HTTP requests

2. **Open/Closed**: Easy to extend with new client types (e.g., `MockPactClient`, `RetryPactClient`) without modifying existing code

3. **Liskov Substitution**: Both implementations satisfy the `PactApiClient` contract identically

4. **Interface Segregation**: The interface contains only methods that all implementations can support

5. **Dependency Inversion**: High-level code depends on the `PactApiClient` abstraction, not concrete implementations

### KISS (Keep It Simple, Stupid)

- **One factory method**: `PactApiClientFactory.create()` is the only decision point
- **Same API**: Internal and external clients expose identical methods
- **No conditionals**: Consumer code never checks node type
- **Minimal complexity**: ~200 lines of code total

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Node Connection Service                    │
│  (or any service that needs to communicate with nodes)       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Creates client via factory
                         ▼
              ┌──────────────────────┐
              │ PactApiClientFactory │
              └──────────┬───────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌────────────────────┐         ┌────────────────────┐
│ InternalNodeClient │         │ ExternalNodeClient │
└────────────────────┘         └────────────────────┘
         │                               │
         │                               │
         ▼                               ▼
┌────────────────────┐         ┌────────────────────┐
│  Internal Services │         │   HTTP Fetch API   │
│  (Direct calls)    │         │   (External APIs)  │
└────────────────────┘         └────────────────────┘
```

## File Structure

```
services/pact-client/
├── index.ts                          # Public exports
├── pact-api-client.interface.ts      # Core interface & types
├── internal-node-client.ts           # Internal node implementation
├── external-node-client.ts           # External node implementation
└── pact-client-factory.ts            # Factory for creating clients
```

## Core Interface

```typescript
interface PactApiClient {
  // OAuth2 authentication
  authenticate(clientId: string, clientSecret: string): Promise<TokenResponse>;
  
  // PACT v3 footprints endpoints
  listFootprints(filters?: FootprintFilters, pagination?: PaginationParams): Promise<PactApiListResponse>;
  getFootprint(id: string): Promise<PactApiResponse<ProductFootprintV3>>;
  
  // PACT v3 events endpoint
  sendEvent(event: CloudEvent): Promise<void>;
}
```

## Usage Example

### Basic Usage

```typescript
import { PactApiClientFactory } from './services/pact-client';

// Get node information from database
const targetNode = await nodeService.getNode(nodeId);

// Create appropriate client (internal or external)
const client = PactApiClientFactory.create(
  {
    id: targetNode.id,
    type: targetNode.type,  // 'internal' or 'external'
    apiUrl: targetNode.apiUrl,
  },
  {
    // Only needed for internal nodes
    internalNodeAuth,
    internalNodePact,
  }
);

// Authenticate
await client.authenticate(clientId, clientSecret);

// Fetch footprints - same code for internal and external!
const footprints = await client.listFootprints({
  geography: 'US',
  status: 'Active',
});
```

### Real-World Integration (node-connection-service.ts)

```typescript
async requestFootprints(
  context: UserContext,
  connectionId: number,
  filters?: FootprintFilters
) {
  // Get connection and credentials
  const connection = await this.getConnection(connectionId);
  
  // Get target node
  const targetNode = await this.nodeService.getNode(connection.targetNodeId);
  
  // Create client - works for BOTH internal and external!
  const client = PactApiClientFactory.create(
    {
      id: targetNode.id,
      type: targetNode.type,
      apiUrl: targetNode.apiUrl,
    },
    {
      internalNodeAuth: this.internalNodeAuth,
      internalNodePact: this.internalNodePact,
    }
  );
  
  // Authenticate and fetch - same code for both types!
  await client.authenticate(connection.clientId, connection.clientSecret);
  const result = await client.listFootprints(filters);
  
  return result.data;
}
```

## Communication Scenarios

### Scenario 1: Internal Node → External Node

An organization's internal node queries a partner's external PACT API:

```typescript
// Internal organization node calls external partner node
const partnerNode = {
  id: 42,
  type: 'external',
  apiUrl: 'https://partner-company.com/pact',
};

// Create external client
const client = PactApiClientFactory.create(partnerNode);

// Authenticate with partner's OAuth2 endpoint
await client.authenticate(connectionClientId, connectionClientSecret);

// Fetch partner's footprints - standard PACT v3 API
const footprints = await client.listFootprints({
  productId: 'urn:gtin:4012345678901',
  status: 'Active',
});

// Process external footprints
for (const footprint of footprints.data) {
  console.log(`Received footprint from partner: ${footprint.id}`);
  // Import into internal system, trigger workflows, etc.
}
```

**Communication Flow:**
```
┌────────────────────┐                        ┌─────────────────────┐
│  Internal Node     │                        │  External Partner   │
│  (Your Org)        │  ─── HTTP/HTTPS ───>   │  (Their API)        │
│                    │                        │                     │
│  Uses:             │  1. POST /auth/token   │  OAuth2 Server      │
│  ExternalNodeClient│  2. GET /3/footprints  │  PACT v3 API        │
└────────────────────┘                        └─────────────────────┘
```

### Scenario 2: External Node → Internal Node

A partner's external system queries your organization's internal node:

```typescript
// Partner makes HTTP request to your internal node's public endpoint
// From partner's perspective, they just call a PACT-compliant API

// Partner's code (hypothetical):
const response = await fetch('https://your-company.com/api/nodes/5/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'grant_type=client_credentials&client_id=partner123&client_secret=secret456',
});
const { access_token } = await response.json();

const footprintsResponse = await fetch('https://your-company.com/api/nodes/5/3/footprints?productId=laptop', {
  headers: { 'Authorization': `Bearer ${access_token}` },
});
const { data: footprints } = await footprintsResponse.json();

// On your server, the internal node routes handle this:
// 1. POST /api/nodes/:nodeId/auth/token → InternalNodeAuthService
// 2. GET /api/nodes/:nodeId/3/footprints → InternalNodePactService
// Partner sees it as a standard PACT API, we handle it internally!
```

**Communication Flow:**
```
┌─────────────────────┐                        ┌────────────────────┐
│  External Partner   │                        │  Internal Node     │
│  (Their System)     │  ─── HTTP/HTTPS ───>   │  (Your Org)        │
│                     │                        │                    │
│  Standard HTTP      │  1. POST /auth/token   │  Express Routes    │
│  PACT v3 Client     │  2. GET /3/footprints  │  ↓                 │
│                     │                        │  InternalNodeAuth  │
│                     │  <─── JSON Response ─  │  InternalNodePact  │
└─────────────────────┘                        └────────────────────┘
```

**Key Insight:** From the external partner's perspective, your internal node looks exactly like any other PACT-compliant API. They don't know (or care) that it's served by internal services rather than a database-backed API.

### Scenario 3: Internal Node → Internal Node (Same Organization)

Two nodes within the same organization communicate:

```typescript
// Node A (warehouse system) queries Node B (manufacturing system)
const manufacturingNode = {
  id: 8,
  type: 'internal',
  apiUrl: undefined, // Not needed for internal
};

// Create internal client - zero HTTP overhead!
const client = PactApiClientFactory.create(
  manufacturingNode,
  {
    internalNodeAuth: this.internalNodeAuth,
    internalNodePact: this.internalNodePact,
  }
);

// Authenticate (validates connection, generates JWT)
await client.authenticate(internalConnectionClientId, internalConnectionClientSecret);

// Fetch footprints - direct service call, no network latency!
const footprints = await client.listFootprints({
  companyId: 'urn:uuid:org-manufacturing-dept',
  validOn: '2024-01-15',
});

// Ultra-fast: ~0.1ms vs ~50-500ms for external calls
```

**Communication Flow:**
```
┌─────────────────────┐                        ┌─────────────────────┐
│  Internal Node A    │                        │  Internal Node B    │
│  (Warehouse)        │  ─── Direct Call ───>  │  (Manufacturing)    │
│                     │                        │                     │
│  Uses:              │  No HTTP/network!      │  Services:          │
│  InternalNodeClient │  ↓                     │  - Auth Service     │
│                     │  Direct Method Calls   │  - PACT Service     │
└─────────────────────┘                        └─────────────────────┘
```

**Performance Advantage:** Since both nodes are internal, the client makes direct service calls instead of HTTP requests, resulting in:
- **~500x faster** (0.1ms vs 50ms+)
- No serialization/deserialization overhead
- No network latency
- Same security (OAuth2 + JWT still enforced)

### Scenario 4: Bidirectional Communication

Two organizations exchanging data in both directions:

```typescript
// Company A's internal node calls Company B's external node
async function fetchPartnerFootprints() {
  const partnerNode = { id: 99, type: 'external', apiUrl: 'https://company-b.com/pact' };
  const client = PactApiClientFactory.create(partnerNode);
  
  await client.authenticate(clientIdForPartner, clientSecretForPartner);
  return await client.listFootprints({ geography: 'US' });
}

// Company B's external system calls Company A's internal node (via HTTP)
// Their request comes to: POST https://company-a.com/api/nodes/5/auth/token
// Then: GET https://company-a.com/api/nodes/5/3/footprints
// Our internal routes handle it seamlessly

// Result: Bidirectional data exchange, same interface both directions!
```

**Communication Flow:**
```
┌──────────────────────────┐          ┌──────────────────────────┐
│  Company A               │          │  Company B               │
│                          │          │                          │
│  Internal Node ───────>  │  HTTP    │  External API            │
│  (ExternalNodeClient)    │  ───>    │  (Their PACT Server)     │
│                          │          │                          │
│                          │  HTTP    │                          │
│  Express Routes      <── │  <───    │  HTTP Client             │
│  (Looks like ext. API)   │          │  (Standard PACT Client)  │
└──────────────────────────┘          └──────────────────────────┘
```

## Implementation Details

### Internal Node Client

**Characteristics:**
- Zero HTTP overhead
- Direct service method calls
- Synchronous authentication
- Uses existing service implementations

**Performance:**
- ~0.1ms per request (no network latency)
- No serialization/deserialization
- Direct memory access

**Use Case:**
- Testing and development
- Internal organizational communication
- Mock/demo environments

### External Node Client

**Characteristics:**
- Standard HTTP/HTTPS communication
- Fetch API for requests
- Async authentication with token caching
- Full PACT v3 compliance

**Performance:**
- Network latency dependent (~50-500ms)
- HTTP overhead (headers, parsing)
- TLS handshake costs

**Use Case:**
- Production inter-organizational communication
- External partner integrations
- Distributed systems

## URL Structure

Both client types use the same PACT v3 URL structure:

### Internal Nodes
```
Base: http://localhost:3010/api/nodes/{nodeId}

Endpoints:
- POST   /auth/token              # OAuth2 authentication
- GET    /3/footprints            # List footprints
- GET    /3/footprints/:id        # Get single footprint
- POST   /3/events                # Send CloudEvents
```

### External Nodes
```
Base: https://external-api.example.com

Endpoints:
- POST   /auth/token              # OAuth2 authentication
- GET    /3/footprints            # List footprints
- GET    /3/footprints/:id        # Get single footprint
- POST   /3/events                # Send CloudEvents
```

**Key Insight**: The only difference is the base URL! This symmetry is the foundation of our unified architecture.

## Error Handling

Both implementations throw standard JavaScript errors:

```typescript
try {
  await client.authenticate(clientId, clientSecret);
} catch (error) {
  // Handle authentication failure
  // Works identically for internal and external
}

try {
  const footprint = await client.getFootprint(id);
} catch (error) {
  // Handle 404 or other errors
  // Same error handling for both types
}
```

## Testing Strategy

### Unit Tests

```typescript
describe('PactApiClient', () => {
  it('should work with internal nodes', async () => {
    const client = PactApiClientFactory.create(internalNode, services);
    await client.authenticate('client', 'secret');
    const footprints = await client.listFootprints();
    expect(footprints.data).toHaveLength(3);
  });
  
  it('should work with external nodes', async () => {
    const client = PactApiClientFactory.create(externalNode);
    await client.authenticate('client', 'secret');
    const footprints = await client.listFootprints();
    expect(footprints.data).toHaveLength(3);
  });
});
```

### Integration Tests

```typescript
describe('Node Communication', () => {
  it('should handle internal->external communication', async () => {
    // Internal node calls external node
    const result = await nodeConnectionService.requestFootprints(
      context,
      connectionToExternalNode,
      { geography: 'US' }
    );
    expect(result).toBeDefined();
  });
  
  it('should handle external->internal communication', async () => {
    // External node calls internal node (via HTTP)
    const result = await fetch('http://localhost:3010/api/nodes/5/3/footprints', {
      headers: { Authorization: 'Bearer ' + token }
    });
    expect(result.ok).toBe(true);
  });
});
```

## Future Enhancements

### Token Caching
```typescript
class CachedPactClient implements PactApiClient {
  constructor(private client: PactApiClient) {}
  
  async authenticate(clientId: string, clientSecret: string) {
    if (this.cachedToken && !this.isExpired()) {
      return this.cachedToken;
    }
    return this.client.authenticate(clientId, clientSecret);
  }
  
  // ... delegate other methods
}
```

### Retry Logic
```typescript
class RetryPactClient implements PactApiClient {
  constructor(private client: PactApiClient, private maxRetries = 3) {}
  
  async listFootprints(filters, pagination) {
    let lastError;
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await this.client.listFootprints(filters, pagination);
      } catch (error) {
        lastError = error;
        await this.delay(1000 * Math.pow(2, i));
      }
    }
    throw lastError;
  }
  
  // ... implement other methods with retry
}
```

### Mock Client for Testing
```typescript
class MockPactClient implements PactApiClient {
  async authenticate() {
    return { accessToken: 'mock-token', tokenType: 'Bearer', expiresIn: 3600 };
  }
  
  async listFootprints() {
    return { data: mockFootprints };
  }
  
  // ... return mock data for all methods
}
```

## Migration Guide

### Before (without unified client)

```typescript
// Old code with conditionals
if (node.type === 'internal') {
  const token = await internalNodeAuth.generateToken(node.id, clientId, clientSecret);
  const footprints = internalNodePact.getFootprints(filters);
  return footprints.data;
} else {
  const response = await fetch(`${node.apiUrl}/auth/token`, ...);
  const token = await response.json();
  const response2 = await fetch(`${node.apiUrl}/3/footprints`, ...);
  const footprints = await response2.json();
  return footprints.data;
}
```

### After (with unified client)

```typescript
// New code without conditionals
const client = PactApiClientFactory.create(node, services);
await client.authenticate(clientId, clientSecret);
const result = await client.listFootprints(filters);
return result.data;
```

**Benefits:**
- ✅ No type checking
- ✅ No code duplication
- ✅ Easier to test
- ✅ Easier to extend

## Best Practices

1. **Always use the factory**: Never instantiate clients directly
2. **Handle authentication once**: Clients cache tokens internally
3. **Reuse client instances**: Create once per connection/session
4. **Handle errors gracefully**: Both clients throw on failure
5. **Pass services for internal nodes**: Factory needs them to work

## Contributing

When adding new PACT endpoints:

1. Add method to `PactApiClient` interface
2. Implement in `InternalNodePactClient` (direct service call)
3. Implement in `ExternalNodePactClient` (HTTP call)
4. Update this README with examples
5. Add tests for both implementations

## Related Documentation

- [PACT v3 Specification](https://wbcsd.github.io/pact/)
- [Internal Node Virtual PACT API](../../docs/internal-node-virtual-pact-api.md)
- [PACT v3 Conformance Implementation](../../docs/pact-v3-conformance-implementation.md)
- [Node Connection Management](../../docs/node-connection-management.md)
