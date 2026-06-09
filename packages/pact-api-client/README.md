# @wbcsd/pact-api-client

HTTP client for the [PACT Data Exchange Protocol](https://docs.carbon-transparency.org/tr/data-exchange-protocol/latest/). Authenticates via OpenID Connect Client Credentials, discovers the token endpoint automatically, and caches tokens with automatic refresh.

## Installation

```bash
npm install @wbcsd/pact-api-client
```

## Usage

```ts
import { PactApiClient } from '@wbcsd/pact-api-client';

const client = new PactApiClient(
  'https://partner.example.com/pact', // PACT node base URL
  'my-client-id',
  'my-client-secret'
);

// List footprints
const response = await client.listFootprints();
console.log(response.data); // ProductFootprint[]

// List with filters and pagination
const filtered = await client.listFootprints(
  { productId: ['urn:gtin:12345678'] },
  { limit: 10 }
);

// Get a single footprint
const footprint = await client.getFootprint('uuid-here');

// Send a CloudEvent
await client.sendRequestCreated({ ... });
```

### Custom auth endpoint

If the token endpoint is not at `/.well-known/openid-configuration`, pass an `authBaseUrl`:

```ts
const client = new PactApiClient(baseUrl, clientId, clientSecret, undefined, {
  authBaseUrl: 'https://auth.example.com',
  scope: 'openid',
});
```

## License

MIT
