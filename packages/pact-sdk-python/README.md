# pact-api-client (Python)

Python SDK for the [PACT Data Exchange Protocol](https://docs.carbon-transparency.org/tr/data-exchange-protocol/latest/).
Bundles the PACT data model (Pydantic models) and a thin HTTP client.

## Install

```bash
pip install pact-api-client
```

## Usage

```python
from pact_api_client import PactApiClient

client = PactApiClient("https://partner.example.com/pact", "client-id", "client-secret")

# List footprints (any PACT query parameter is accepted as a keyword)
for footprint in client.list_footprints(status="Active", limit=10):
    print(footprint.id, footprint.productDescription)

# Get one
footprint = client.get_footprint("f4b1225a-bd44-4c8e-861d-079e4e1dfd69")

# Events API
client.request_footprint(["urn:gtin:12345678"], comment="please share")
client.publish_footprint([footprint.id])
```

Authentication (OAuth2 client credentials with OpenID Connect discovery and
token caching) is handled automatically. Pass `auth_url=` if the token endpoint
lives on a different host.

## Data model

Models are generated from the OpenAPI specs shared with the TypeScript
`pact-data-model` package. Import a specific spec version directly:

```python
from pact_api_client.models.v3_0 import ProductFootprint
from pact_api_client.models import v2_3
```

## Development

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

python codegen.py   # regenerate models from ../pact-data-model/schemas
pytest
```
