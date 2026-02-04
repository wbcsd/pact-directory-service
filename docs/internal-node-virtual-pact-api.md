# Internal Node Virtual PACT API

## Overview

The Internal Node Virtual PACT API provides a **virtualized PACT v3-compliant** (Partnership for Carbon Transparency) API for internal nodes within the PACT Directory Service. This implementation allows internal nodes to serve Product Carbon Footprint (PCF) data using mock/hardcoded data, enabling:

- **Testing and development** without external API dependencies
- **Demos and prototypes** with realistic PCF data
- **Internal node-to-node communication** with OAuth2 authentication
- **Full PACT v3 specification compliance**

## Architecture

### URL Structure

All virtual PACT endpoints follow this pattern:

```
/api/internal/{nodeId}/[auth|footprints]
```

- **`{nodeId}`**: The ID of the internal node
- **`auth`**: OAuth2 authentication endpoints
- **`footprints`**: PACT v3 product footprint endpoints

### Components

#### 1. **Data Models** (`models/pact-v3/`)
TypeScript interfaces defining PACT v3-compliant data structures:
- `ProductFootprintV3` with all required fields
- `CarbonFootprintV3` with nested objects
- Enums for standards, units, statuses
- `ProductClassification` support

#### 2. **Mock Data** (`data/`)
- `mock-footprints-v3.ts`: Sample PCF data for v3 API
- Contains 3 diverse footprints (laptop, steel beam, bioplastic container)

#### 3. **Services**

**`InternalNodePactService`** (`services/internal-node-pact-service.ts`)
- Manages mock footprint data
- Handles filtering (productId, companyId, geography, status)
- Implements pagination with Link headers
- PACT v3-compliant responses

**`InternalNodeAuthService`** (`services/internal-node-auth-service.ts`)
- OAuth2 Client Credentials flow
- JWT token generation and verification
- Connection credential validation
- Token audience/issuer validation

#### 4. **Routes** (`routes/internal-node-routes.ts`)
- Authentication endpoints
- Footprint listing and retrieval
- Middleware for token validation
- Error handling

## API Endpoints

### Authentication

#### Generate Access Token
```http
POST /api/internal/:nodeId/auth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=<clientId>
&client_secret=<clientSecret>
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Requirements:**
- `nodeId` must be an **internal** node
- `clientId` and `clientSecret` must match a valid **accepted** connection
- Connection must be targeting the specified `nodeId`

### PACT v3 Endpoints

#### List Product Footprints
```http
GET /api/internal/:nodeId/footprints?limit=10&offset=0
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `limit`: Number of results (default: 10)
- `offset`: Pagination offset (default: 0)
- `productId`: Filter by product ID (partial match)
- `companyId`: Filter by company ID (partial match)
- `geographyCountry`: Filter by country code (exact match)
- `status`: Filter by footprint status (Active/Deprecated)

**Response:**
```json
{
  "data": [
    {
      "id": "d9be4477-e351-45b3-acd9-e1da05e6f633",
      "specVersion": "3.0.0",
      "version": 1,
      "created": "2023-07-01T00:00:00Z",
      "status": "Active",
      "companyName": "Example Company Inc.",
      "companyIds": ["urn:uuid:12345678-1234-1234-1234-123456789012"],
      "productDescription": "Exemplary Laptop Model X",
      "productIds": ["urn:gtin:12345678"],
      "productClassifications": [
        {
          "classId": "452",
          "className": "Electronic Computing Equipment",
          "classificationSystem": "CPC"
        }
      ],
      "productNameCompany": "Laptop Model X",
      "pcf": {
        "declaredUnit": "kilogram",
        "unitaryProductAmount": "1.0",
        "pCfExcludingBiogenic": "120.5",
        "fossilGhgEmissions": "115.2",
        "referencePeriod": {
          "start": "2022-01-01T00:00:00Z",
          "end": "2022-12-31T23:59:59Z"
        },
        "geography": {
          "country": "US"
        },
        ...
      }
    }
  ]
}
```

**Headers:**
- `Link`: Pagination links (first, prev, next, last) when applicable

#### Get Single Footprint
```http
GET /api/internal/:nodeId/footprints/:id
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "data": { /* ProductFootprintV3 object */ }
}
```

## Authentication Flow

### Step 1: Establish Node Connection
1. Node A creates an invitation to Node B (internal)
2. Node B accepts the invitation
3. System generates `clientId` and `clientSecret` for the connection
4. Credentials are stored encrypted in the `connections` table

### Step 2: Request Access Token
```bash
curl -X POST "http://localhost:3010/api/internal/5/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=abc123&client_secret=secret456"
```

### Step 3: Access Protected Endpoints
```bash
curl -X GET "http://localhost:3010/api/internal/5/footprints" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## JWT Token Structure

**Payload:**
```json
{
  "nodeId": 5,
  "connectionId": 12,
  "organizationId": 3,
  "sub": "5",
  "iss": "http://localhost:3010",
  "aud": "node:5",
  "iat": 1625097600,
  "exp": 1625101200
}
```

**Claims:**
- `nodeId`: The requesting (from) node ID
- `connectionId`: The connection ID in database
- `organizationId`: The requesting organization ID
- `sub`: Subject (node ID as string)
- `iss`: Issuer (directory service URL)
- `aud`: Audience (target node)
- `iat`: Issued at timestamp
- `exp`: Expiry timestamp (1 hour)

## Security Considerations

### Current Implementation
- JWT tokens signed with `JWT_SECRET` from config
- Connection credentials verified against database
- Token audience validated to match target node
- Only **accepted** connections can generate tokens
- Only **internal** nodes can issue tokens

### Production Improvements Needed
1. **Credential Encryption**: Replace base64 with proper AES encryption
2. **Secret Comparison**: Use `crypto.timingSafeEqual()` for constant-time comparison
3. **Rate Limiting**: Add rate limiting to auth endpoint
4. **Token Rotation**: Implement refresh tokens for long-lived sessions
5. **Audit Logging**: Log all authentication attempts
6. **mTLS Support**: Add mutual TLS for transport-level security

## Mock Data

### Available Footprints (v3)

1. **Laptop Model X**
   - ID: `d9be4477-e351-45b3-acd9-e1da05e6f633`
   - Company: Example Company Inc.
   - Geography: US
   - PCF: 120.5 kg CO2e
   - Classification: CPC 452 (Electronic Computing Equipment)

2. **EcoSteel Beam A500**
   - ID: `f8c3d912-7b4e-4a2c-b567-8e9f0a1b2c3d`
   - Company: Green Materials Corp
   - Geography: DE (Europe)
   - PCF: 450.8 kg CO2e (excluding biogenic)
   - Classification: CPC 412 (Iron and Steel Products)

3. **EcoContainer 500**
   - ID: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
   - Company: BioPack Solutions
   - Geography: NL
   - PCF: 0.85 kg CO2e (carbon negative including biogenic)
   - Classification: CPC 893 (Plastic Articles)

## Testing

### Manual Testing

```bash
# 1. Create two internal nodes
NODE_A_ID=1
NODE_B_ID=2

# 2. Create connection invitation from Node A to Node B
curl -X POST "http://localhost:3010/api/directory/node-invitations" \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{"fromNodeId": 1, "targetNodeId": 2, "message": "Test connection"}'

# 3. Accept invitation (returns credentials)
curl -X POST "http://localhost:3010/api/directory/node-invitations/1/accept" \
  -H "Authorization: Bearer <user_token>"
# Response: {"clientId": "...", "clientSecret": "..."}

# 4. Generate access token
curl -X POST "http://localhost:3010/api/internal/2/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=<clientId>&client_secret=<clientSecret>"

# 5. Access footprints
curl -X GET "http://localhost:3010/api/internal/2/footprints?limit=5" \
  -H "Authorization: Bearer <access_token>"
```

### Automated Testing

```bash
cd apps/api
npm test internal-node
```

## Integration with Node Management

The virtual PACT API integrates with the existing node connection system:

- **Node Creation**: Internal nodes automatically get virtual API capability
- **Connection Management**: Use existing invitation/acceptance workflow
- **Credential Storage**: Credentials stored in `connections` table
- **Organization Scoping**: Nodes belong to organizations with proper access control

## Future Enhancements

### Phase 4: External Node Proxy Service
- Proxy requests to real external PACT APIs
- Cache responses for performance
- Handle authentication with external systems
- Failover and retry logic

### Phase 5: Dynamic Data Management
- Admin UI to add/edit mock footprints per node
- Database storage for footprints
- Import from CSV/JSON
- Custom data per organization
- Support for multiple PACT versions if needed

### Phase 6: Event Webhooks
- Implement PACT Events API
- Webhook notifications for footprint updates
- Event subscription management

### Phase 7: Advanced Features
- Action API for requesting new PCF data
- Search and filtering improvements
- Data quality indicators
- Assurance information

## References

- **PACT Network**: https://www.carbon-transparency.com/
- **PACT Technical Specifications v3**: https://wbcsd.github.io/tr/2024/data-exchange-protocol-20240410/
- **Demo API Reference**: https://github.com/wbcsd/pact-demo-api-ts
- **Node Connection Management**: See `docs/node-connection-management.md`

## Troubleshooting

### Error: "Invalid client credentials"
- Verify clientId and clientSecret match database
- Ensure connection status is "accepted"
- Check connection targets the correct nodeId

### Error: "Authentication only available for internal nodes"
- Verify the node type is "internal" not "external"
- Check node exists in database

### Error: "Invalid or expired token"
- Token expired (1 hour lifetime)
- Wrong audience (nodeId mismatch)
- JWT_SECRET changed since token generation

### Error: "Node not found"
- NodeId in URL doesn't exist
- Check node wasn't deleted

## Contributing

When adding new mock footprints:
1. Follow PACT v3 specification exactly
2. Add to `data/mock-footprints-v3.ts`
3. Include diverse industries and geographies
4. Use proper `productClassifications` with CPC codes
5. Include nested `referencePeriod` and `geography` objects
6. Update documentation with new examples
