"""Python SDK for the PACT Data Exchange Protocol.

Bundles the PACT data model (Pydantic models generated from the OpenAPI specs)
and a thin HTTP client for PACT-conformant nodes.

    from pact_api_client import PactApiClient

    client = PactApiClient("https://partner.example.com/pact", "id", "secret")
    for footprint in client.list_footprints(status="Active"):
        print(footprint.id)
"""

from .client import EventTypes, PactApiClient
from .models.v3_0 import ProductFootprint

__version__ = "1.0.0"

__all__ = ["PactApiClient", "EventTypes", "ProductFootprint", "__version__"]
