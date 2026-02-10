/**
 * PACT API Client - Single HTTP Implementation
 * 
 * This client provides a unified HTTP-based interface for communicating with
 * both internal and external PACT nodes. All requests flow through Express
 * middleware for consistent security, logging, and rate limiting.
 * 
 * Key Design Decisions:
 * - Single HTTP implementation for all node types (internal + external)
 * - Internal nodes call themselves via HTTP (localhost)
 * - All requests authenticated via OAuth2 Client Credentials + JWT
 * - Token caching per base URL to minimize auth overhead
 * - Stateless design enables horizontal scaling
 */

import {
  PactApiClient,
  TokenResponse,
  PactApiResponse,
  PactApiListResponse,
  FootprintFilters,
  PaginationParams,
} from './pact-api-client.interface';
import { ProductFootprintV3 } from '../../models/pact-v3/product-footprint';
import { CloudEvent } from '../../models/pact-v3/events';

export class PactApiClientImpl implements PactApiClient {
  private baseUrl: string;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  /**
   * Create a PACT API client
   * 
   * Always provide both nodeId and apiUrl. The client will use apiUrl if provided (external node),
   * otherwise construct the URL dynamically from nodeId and internalApiBaseUrl (internal node).
   * 
   * @param nodeId - Node ID (used for internal nodes)
   * @param apiUrl - Full API URL (used for external nodes, or null for internal)
   * @param internalApiBaseUrl - Base URL for internal API (optional, defaults to env var)
   * 
   * @example
   * // External node - apiUrl is provided
   * const client = new PactApiClientImpl(nodeId, 'https://partner.com/pact');
   * 
   * @example
   * // Internal node - apiUrl is null, URL constructed from nodeId
   * const client = new PactApiClientImpl(nodeId, null, 'http://localhost:3010');
   */
  constructor(
    nodeId: number,
    apiUrl: string | null,
    internalApiBaseUrl?: string
  ) {
    if (apiUrl) {
      // External node: use provided API URL
      this.baseUrl = apiUrl.replace(/\/$/, '');
    } else {
      // Internal node: construct URL dynamically
      if (!internalApiBaseUrl) {
        throw new Error('internalApiBaseUrl is required for internal nodes (when apiUrl is null)');
      }
      this.baseUrl = `${internalApiBaseUrl}/api/nodes/${nodeId}`;
    }
  }

  /**
   * Authenticate with the PACT node using OAuth2 Client Credentials flow
   */
  async authenticate(clientId: string, clientSecret: string): Promise<TokenResponse> {
    const url = `${this.baseUrl}/auth/token`;
    
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
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
    const accessToken = data.access_token;
    const expiresIn = data.expires_in || 3600; // Default 1 hour if not specified

    // Cache token with 5-minute buffer before expiration
    this.tokenCache = {
      token: accessToken,
      expiresAt: Date.now() + (expiresIn - 300) * 1000,
    };

    return {
      accessToken,
      tokenType: data.token_type || 'Bearer',
      expiresIn,
    };
  }

  /**
   * Get a valid access token from cache, throws if not authenticated
   */
  private getAccessToken(): string {
    if (!this.tokenCache || this.tokenCache.expiresAt <= Date.now()) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }
    return this.tokenCache.token;
  }

  /**
   * List footprints from the PACT node
   */
  async listFootprints(
    filters?: FootprintFilters,
    pagination?: PaginationParams
  ): Promise<PactApiListResponse<ProductFootprintV3>> {
    const token = this.getAccessToken();
    
    // Build query string from filters
    const queryParams = new URLSearchParams();
    
    if (pagination?.limit) {
      queryParams.set('limit', pagination.limit.toString());
    }
    if (pagination?.offset) {
      queryParams.set('offset', pagination.offset.toString());
    }
    
    // Build $filter parameter from filters object
    if (filters) {
      const filterParts: string[] = [];
      if (filters.productId) filterParts.push(`productId eq '${filters.productId}'`);
      if (filters.companyId) filterParts.push(`companyId eq '${filters.companyId}'`);
      if (filters.geography) filterParts.push(`geography eq '${filters.geography}'`);
      if (filters.classification) filterParts.push(`classification eq '${filters.classification}'`);
      if (filters.status) filterParts.push(`status eq '${filters.status}'`);
      if (filters.validOn) filterParts.push(`validOn eq '${filters.validOn}'`);
      if (filters.validAfter) filterParts.push(`validAfter gt '${filters.validAfter}'`);
      if (filters.validBefore) filterParts.push(`validBefore lt '${filters.validBefore}'`);
      
      if (filterParts.length > 0) {
        queryParams.set('$filter', filterParts.join(' and '));
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
  async getFootprint(id: string): Promise<PactApiResponse<ProductFootprintV3>> {
    const token = this.getAccessToken();
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
   * Send an event to the PACT node
   */
  async sendEvent(event: CloudEvent): Promise<void> {
    const token = this.getAccessToken();
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
   * Clear cached token (useful for testing or forcing re-authentication)
   */
  clearTokenCache(): void {
    this.tokenCache = null;
  }
}
