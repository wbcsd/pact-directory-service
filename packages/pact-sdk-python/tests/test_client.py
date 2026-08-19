"""Tests for PactApiClient using respx to mock HTTP."""

import httpx
import respx

from pact_api_client import PactApiClient

BASE = "https://node.example.com/pact"
TOKEN_URL = f"{BASE}/auth/token"


def _mock_auth(router):
    router.get(f"{BASE}/.well-known/openid-configuration").mock(
        return_value=httpx.Response(404)
    )
    return router.post(TOKEN_URL).mock(
        return_value=httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
    )


@respx.mock
def test_list_footprints_sends_filters_and_parses_data():
    _mock_auth(respx)
    route = respx.get(f"{BASE}/3/footprints").mock(
        return_value=httpx.Response(200, json={"data": []})
    )

    client = PactApiClient(BASE, "id", "secret")
    result = client.list_footprints(status="Active", limit=10)

    assert result == []
    assert route.called
    request = route.calls.last.request
    assert request.url.params["status"] == "Active"
    assert request.url.params["limit"] == "10"
    assert request.headers["Authorization"] == "Bearer tok"


@respx.mock
def test_request_footprint_posts_cloudevent():
    _mock_auth(respx)
    route = respx.post(f"{BASE}/3/events").mock(return_value=httpx.Response(200))

    client = PactApiClient(BASE, "id", "secret")
    event_id = client.request_footprint(["urn:gtin:123"], comment="please")

    assert route.called
    body = route.calls.last.request.read()
    import json

    payload = json.loads(body)
    assert payload["type"] == "org.wbcsd.pact.ProductFootprint.RequestCreatedEvent.3"
    assert payload["id"] == event_id
    assert payload["data"] == {"productId": ["urn:gtin:123"], "comment": "please"}


@respx.mock
def test_token_is_cached_across_calls():
    token_route = _mock_auth(respx)
    respx.get(f"{BASE}/3/footprints").mock(
        return_value=httpx.Response(200, json={"data": []})
    )

    client = PactApiClient(BASE, "id", "secret")
    client.list_footprints()
    client.list_footprints()

    assert token_route.call_count == 1
