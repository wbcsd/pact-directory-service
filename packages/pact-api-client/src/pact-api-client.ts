/**
 * PACT API Client - Single HTTP Implementation
 * 
 * This client provides a unified HTTP-based interface for communicating with
 * PACT conformant API implementations. All requests flow through Express
 * middleware for consistent security, logging, and rate limiting.
 * 
 * Key Design Decisions:
 * - Single HTTP implementation for all node types (internal + external)
 * - Internal nodes call themselves via HTTP (localhost)
 * - Credentials provided at construction time; authentication is automatic
 * - Token caching with automatic refresh to minimize auth overhead
 * - Stateless design enables horizontal scaling
 */

import { 
  ProductFootprint,
  BaseEvent,
  RequestCreatedEvent,
  RequestFulfilledEvent,
  RequestRejectedEvent,
  PublishedEvent,
  EventTypes,
} from 'pact-data-model/v3_0';
export { EventTypes } from 'pact-data-model/v3_0';


/**
 * Pagination parameters for listing footprints
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Filter parameters for footprints (PACT v3 spec)
 * Per https://docs.carbon-transparency.org/tr/data-exchange-protocol/latest/#parameters
 * productId, companyId, geography and classification are arrays of strings
 */
export interface FootprintFilters {
  productId?: string[];
  companyId?: string[];
  geography?: string[]; // Can match geographyCountry, geographyRegionOrSubregion, or geographyCountrySubdivision
  classification?: string[]; // Match against productClassifications array
  status?: string; // Active or Deprecated
  validOn?: string; // ISO 8601 date - footprint valid on this date
  validAfter?: string; // ISO 8601 date - footprint valid after this date
  validBefore?: string; // ISO 8601 date - footprint valid before this date
}

/**
 * Paginated response structure (PACT v3 spec)
 */
export interface PagedResponse<T> {
  data: T[];
  links?: {
    first?: string;
    last?: string;
    prev?: string;
    next?: string;
  };
}

export type PactApiListResponse<T> = PagedResponse<T>;

export class PactApiClient {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly source: string;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  /**
   * Create a PACT API client
   * 
   * @param baseUrl - Base URL of the PACT node API
   * @param clientId - OAuth2 client ID for authentication
   * @param clientSecret - OAuth2 client secret for authentication
   * @param source - Source URI used in outgoing CloudEvents (defaults to baseUrl)
   * 
   * @example
   * // External node
   * const client = new PactApiClientImpl('https://partner.com/pact', clientId, clientSecret);
   * 
   * @example
   * // Internal node — construct the URL before passing it in
   * const baseUrl = `${internalApiBaseUrl}/api/nodes/${nodeId}`;
   * const client = new PactApiClientImpl(baseUrl, clientId, clientSecret);
   */
  constructor(
    baseUrl: string,
    clientId: string,
    clientSecret: string,
    source?: string
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.source = source ?? this.baseUrl;
  }

  /**
   * Authenticate with the PACT node using OAuth2 Client Credentials flow
   * and cache the resulting token.
   */
  private async authenticate(): Promise<void> {
    const url = `${this.baseUrl}/auth/token`;
    
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Authentication failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    const expiresIn = data.expires_in || 3600; // Default 1 hour if not specified

    // Cache token with 5-minute buffer before expiration
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (expiresIn - 300) * 1000,
    };
  }

  /**
   * Return a valid access token, authenticating or refreshing automatically if needed.
   */
  private async ensureAuthenticated(): Promise<string> {
    if (!this.tokenCache || this.tokenCache.expiresAt <= Date.now()) {
      await this.authenticate();
    }
    return this.tokenCache!.token;
  }

  /**
   * List footprints from the PACT node
   */
  async listFootprints(
    filters?: FootprintFilters,
    pagination?: PaginationParams
  ): Promise<PactApiListResponse<ProductFootprint>> {
    const token = await this.ensureAuthenticated();
    
    // Build query string from filters
    const queryParams = new URLSearchParams();
    
    if (pagination?.limit) {
      queryParams.set('limit', pagination.limit.toString());
    }
    if (pagination?.offset) {
      queryParams.set('offset', pagination.offset.toString());
    }
    
    // Array parameters - add multiple times for each value
    if (filters) {
      if (filters.productId) {
        filters.productId.forEach((id: string) => queryParams.append('productId', id));
      }
      if (filters.companyId) {
        filters.companyId.forEach((id: string) => queryParams.append('companyId', id));
      }
      if (filters.geography) {
        filters.geography.forEach((geo: string) => queryParams.append('geography', geo));
      }
      if (filters.classification) {
        filters.classification.forEach((cls: string) => queryParams.append('classification', cls));
      }
      if (filters.status) {
        queryParams.set('status', filters.status);
      }
      if (filters.validOn) {
        queryParams.set('validOn', filters.validOn);
      }
      if (filters.validAfter) {
        queryParams.set('validAfter', filters.validAfter);
      }
      if (filters.validBefore) {
        queryParams.set('validBefore', filters.validBefore);
      }
    }
    
    const queryString = queryParams.toString();
    const url = `${this.baseUrl}/2/footprints${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `List footprints failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    
    // Parse Link header for pagination
    const links: { first?: string; prev?: string; next?: string; last?: string } = {};
    const linkHeader = response.headers.get('Link');
    if (linkHeader) {
      const linkParts = linkHeader.split(',');
      for (const part of linkParts) {
        const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
        if (match) {
          const [, url, rel] = match;
          if (rel === 'first' || rel === 'prev' || rel === 'next' || rel === 'last') {
            links[rel] = url;
          }
        }
      }
    }

    return {
      data: data.data || [],
      links: Object.keys(links).length > 0 ? links : undefined,
    };
  }

  /**
   * Get a specific footprint by ID
   */
  async getFootprint(id: string): Promise<{ data: ProductFootprint }> {
    const token = await this.ensureAuthenticated();
    const url = `${this.baseUrl}/2/footprints/${encodeURIComponent(id)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Get footprint failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    return data;
  }

  /**
   * Send a CloudEvent to the PACT node's events endpoint.
   */
  private async sendEvent(event: BaseEvent): Promise<void> {
    const token = await this.ensureAuthenticated();
    const url = `${this.baseUrl}/2/events`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Send event failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }
  }

  /**
   * Request one or more product footprints from the data owner.
   */
  async requestFootprint(productIds: string[], comment?: string): Promise<void> {
    await this.sendEvent({
      type: EventTypes.RequestCreated,
      specversion: '1.0',
      id: crypto.randomUUID(),
      source: this.source,
      time: new Date().toISOString(),
      data: { productId: productIds, ...(comment !== undefined ? { comment } : {}) },
    } as RequestCreatedEvent);
  }

  /**
   * Notify a data recipient that their footprint request has been fulfilled.
   */
  async fulfillFootprint(requestEventId: string, footprints: ProductFootprint[]): Promise<void> {
    await this.sendEvent({
      type: EventTypes.RequestFulfilled,
      specversion: '1.0',
      id: crypto.randomUUID(),
      source: this.source,
      time: new Date().toISOString(),
      data: { requestEventId, pfs: footprints },
    } as RequestFulfilledEvent);
  }

  /**
   * Notify a data recipient that their footprint request has been rejected.
   */
  async rejectFootprint(requestEventId: string, error: { code: string; message: string }): Promise<void> {
    await this.sendEvent({
      type: EventTypes.RequestRejected,
      specversion: '1.0',
      id: crypto.randomUUID(),
      source: this.source,
      time: new Date().toISOString(),
      data: { requestEventId, error },
    } as RequestRejectedEvent);
  }

  /**
   * Notify data recipients that a footprint has been published or updated.
   */
  async publishFootprint(pfIds: string[]): Promise<void> {
    await this.sendEvent({
      type: EventTypes.Published,
      specversion: '1.0',
      id: crypto.randomUUID(),
      source: this.source,
      time: new Date().toISOString(),
      data: { pfIds },
    } as PublishedEvent);
  }
}
