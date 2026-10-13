"""PACT API client — a thin HTTP client for PACT-conformant nodes.

Handles OAuth2 client-credentials authentication (with OpenID Connect token
endpoint discovery and token caching) and exposes the footprints and events
endpoints of the PACT Data Exchange Protocol.
"""

from __future__ import annotations

import base64
import time
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

import httpx

from .models.v3_0 import ProductFootprint

__all__ = ["PactApiClient", "EventTypes"]


class EventTypes(str, Enum):
    """PACT v3 CloudEvent ``type`` identifiers."""

    REQUEST_CREATED = "org.wbcsd.pact.ProductFootprint.RequestCreatedEvent.3"
    REQUEST_FULFILLED = "org.wbcsd.pact.ProductFootprint.RequestFulfilledEvent.3"
    REQUEST_REJECTED = "org.wbcsd.pact.ProductFootprint.RequestRejectedEvent.3"
    PUBLISHED = "org.wbcsd.pact.ProductFootprint.PublishedEvent.3"


class PactApiClient:
    """Client for a PACT-conformant node.

    Example::

        client = PactApiClient(
            "https://partner.example.com/pact", "client-id", "client-secret"
        )
        for footprint in client.list_footprints(status="Active"):
            print(footprint.id)
    """

    def __init__(
        self,
        base_url: str,
        client_id: str,
        client_secret: str,
        source: Optional[str] = None,
        auth_url: Optional[str] = None,
        timeout: float = 30.0,
    ) -> None:
        self._base = base_url.rstrip("/")
        self._client_id = client_id
        self._client_secret = client_secret
        self._source = source or self._base
        self._auth_base = (auth_url or self._base).rstrip("/")
        self._http = httpx.Client(timeout=timeout)

        self._token: Optional[str] = None
        self._token_expires_at = 0.0

    def __enter__(self) -> "PactApiClient":
        return self

    def __exit__(self, *exc) -> None:
        self._http.close()

    # -- authentication --------------------------------------------------

    def _token_endpoint(self) -> str:
        """Discover the token endpoint via OIDC, falling back to /auth/token."""
        try:
            resp = self._http.get(f"{self._auth_base}/.well-known/openid-configuration")
            if resp.status_code == 200:
                endpoint = resp.json().get("token_endpoint")
                if endpoint:
                    return endpoint
        except httpx.HTTPError:
            pass
        return f"{self._auth_base}/auth/token"

    def _access_token(self) -> str:
        if self._token and self._token_expires_at > time.time():
            return self._token

        credentials = base64.b64encode(
            f"{self._client_id}:{self._client_secret}".encode()
        ).decode()
        resp = self._http.post(
            self._token_endpoint(),
            data={"grant_type": "client_credentials"},
            headers={"Authorization": f"Basic {credentials}"},
        )
        resp.raise_for_status()
        payload = resp.json()
        self._token = payload["access_token"]
        # Refresh a minute before expiry to avoid using a stale token.
        self._token_expires_at = time.time() + payload.get("expires_in", 3600) - 60
        return self._token

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._access_token()}"}

    # -- footprints ------------------------------------------------------

    def list_footprints(self, **filters) -> list[ProductFootprint]:
        """List footprints.

        Accepts any PACT query parameter as a keyword argument, e.g.
        ``list_footprints(status="Active", limit=10)`` or
        ``list_footprints(productId=["urn:..."])``. List values are sent as
        repeated query parameters.
        """
        params = {k: v for k, v in filters.items() if v is not None}
        resp = self._http.get(
            f"{self._base}/3/footprints", params=params, headers=self._headers()
        )
        resp.raise_for_status()
        return [ProductFootprint.model_validate(pf) for pf in resp.json()["data"]]

    def get_footprint(self, footprint_id: str) -> ProductFootprint:
        """Retrieve a single footprint by id."""
        resp = self._http.get(
            f"{self._base}/3/footprints/{footprint_id}", headers=self._headers()
        )
        resp.raise_for_status()
        return ProductFootprint.model_validate(resp.json()["data"])

    # -- events ----------------------------------------------------------

    def _send_event(self, event_type: EventTypes, data: dict) -> str:
        event_id = str(uuid.uuid4())
        self._http.post(
            f"{self._base}/3/events",
            json={
                "type": event_type.value,
                "specversion": "1.0",
                "id": event_id,
                "source": self._source,
                "time": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "data": data,
            },
            headers=self._headers(),
        ).raise_for_status()
        return event_id

    def request_footprint(self, product_ids: list[str], comment: Optional[str] = None) -> str:
        """Request one or more footprints from the data owner."""
        data = {"productId": product_ids}
        if comment is not None:
            data["comment"] = comment
        return self._send_event(EventTypes.REQUEST_CREATED, data)

    def fulfill_footprint(self, request_event_id: str, footprints: list[ProductFootprint]) -> str:
        """Notify a data recipient that their request has been fulfilled."""
        pfs = [pf.model_dump(mode="json", exclude_none=True) for pf in footprints]
        return self._send_event(
            EventTypes.REQUEST_FULFILLED, {"requestEventId": request_event_id, "pfs": pfs}
        )

    def reject_footprint(self, request_event_id: str, code: str, message: str) -> str:
        """Notify a data recipient that their request has been rejected."""
        return self._send_event(
            EventTypes.REQUEST_REJECTED,
            {"requestEventId": request_event_id, "error": {"code": code, "message": message}},
        )

    def publish_footprint(self, pf_ids: list[str]) -> str:
        """Notify data recipients that footprints have been published or updated."""
        return self._send_event(EventTypes.PUBLISHED, {"pfIds": pf_ids})
