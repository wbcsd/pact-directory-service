/**
 * External Node PACT API Client
 * 
 * Implementation for external nodes that makes HTTP requests to external
 * PACT-compliant APIs. Provides the same interface as internal nodes but
 * communicates over HTTP.
 */

import {
  PactApiClient,
  TokenResponse,
  FootprintFilters,
  PaginationParams,
  PactApiResponse,
  PactApiListResponse,
} from "./pact-api-client.interface";
import { ProductFootprintV3 } from "../../models/pact-v3/product-footprint";
import { CloudEvent } from "../../models/pact-v3/events";
import logger from "../../common/logger";

export class ExternalNodePactClient implements PactApiClient {
  private accessToken?: string;

  constructor(private readonly baseUrl: string) {
    // Ensure baseUrl doesn't end with slash
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Authenticate using OAuth2 Client Credentials flow (HTTP)
   */
  async authenticate(clientId: string, clientSecret: string): Promise<TokenResponse> {
    logger.debug({ baseUrl: this.baseUrl, clientId }, "External node authentication");

    const response = await fetch(`${this.baseUrl}/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { baseUrl: this.baseUrl, status: response.status, error: errorText },
        "External node authentication failed"
      );
      throw new Error(`Authentication failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Store token for subsequent requests
    this.accessToken = data.access_token;

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
    };
  }

  /**
   * List product footprints (HTTP call)
   */
  async listFootprints(
    filters?: FootprintFilters,
    pagination?: PaginationParams
  ): Promise<PactApiListResponse<ProductFootprintV3>> {
    if (!this.accessToken) {
      throw new Error("Not authenticated. Call authenticate() first.");
    }

    logger.debug({ baseUrl: this.baseUrl, filters, pagination }, "External node list footprints");

    // Build query string from filters and pagination
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value);
        }
      });
    }
    if (pagination?.limit !== undefined) {
      params.append("limit", pagination.limit.toString());
    }
    if (pagination?.offset !== undefined) {
      params.append("offset", pagination.offset.toString());
    }

    const queryString = params.toString();
    const url = `${this.baseUrl}/3/footprints${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { baseUrl: this.baseUrl, status: response.status, error: errorText },
        "External node list footprints failed"
      );
      throw new Error(`List footprints failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Parse Link header for pagination
    const linkHeader = response.headers.get("Link");
    const links = linkHeader ? this.parseLinkHeader(linkHeader) : undefined;

    return {
      data: data.data,
      links,
    };
  }

  /**
   * Get a single product footprint by ID (HTTP call)
   */
  async getFootprint(id: string): Promise<PactApiResponse<ProductFootprintV3>> {
    if (!this.accessToken) {
      throw new Error("Not authenticated. Call authenticate() first.");
    }

    logger.debug({ baseUrl: this.baseUrl, footprintId: id }, "External node get footprint");

    const response = await fetch(`${this.baseUrl}/3/footprints/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { baseUrl: this.baseUrl, status: response.status, error: errorText },
        "External node get footprint failed"
      );
      throw new Error(`Get footprint failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return {
      data: data.data,
    };
  }

  /**
   * Send a PACT event (HTTP call)
   */
  async sendEvent(event: CloudEvent): Promise<void> {
    if (!this.accessToken) {
      throw new Error("Not authenticated. Call authenticate() first.");
    }

    logger.debug(
      { baseUrl: this.baseUrl, eventType: event.type, eventId: event.id },
      "External node send event"
    );

    const response = await fetch(`${this.baseUrl}/3/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/cloudevents+json",
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { baseUrl: this.baseUrl, status: response.status, error: errorText },
        "External node send event failed"
      );
      throw new Error(`Send event failed: ${response.status} ${errorText}`);
    }

    // 200 OK with no body expected
  }

  /**
   * Parse Link header into pagination links object
   */
  private parseLinkHeader(header: string): Record<string, string> {
    const links: Record<string, string> = {};
    const parts = header.split(",");

    for (const part of parts) {
      const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (match) {
        const [, url, rel] = match;
        links[rel] = url;
      }
    }

    return links;
  }
}
