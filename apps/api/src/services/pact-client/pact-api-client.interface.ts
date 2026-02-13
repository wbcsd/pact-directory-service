/**
 * PACT API Client Interface
 * 
 * Unified interface for communicating with both internal and external PACT nodes.
 * This abstraction allows the same code to work with internal nodes (direct service calls)
 * and external nodes (HTTP calls) without conditional logic.
 */

import { ProductFootprintV3 } from "../../models/pact-v3/product-footprint";
import { CloudEvent } from "../../models/pact-v3/events";
import { FootprintFilters, PaginationParams, PagedResponse } from "../../models/pact-v3/types";

// Re-export for convenience
export type { FootprintFilters, PaginationParams };

/**
 * OAuth2 token response
 */
export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

/**
 * PACT API response with data wrapper
 */
export interface PactApiResponse<T> {
  data: T;
}

/**
 * PACT API list response with pagination
 */
export type PactApiListResponse<T> = PagedResponse<T>;

/**
 * Abstract interface for PACT API communication
 * 
 * Implementations:
 * - InternalNodePactClient: Calls internal services directly
 * - ExternalNodePactClient: Makes HTTP requests to external APIs
 */
export interface PactApiClient {
  /**
   * Authenticate using OAuth2 Client Credentials flow
   * @param clientId - OAuth2 client ID
   * @param clientSecret - OAuth2 client secret
   * @returns Token response with access token
   */
  authenticate(clientId: string, clientSecret: string): Promise<TokenResponse>;

  /**
   * List product footprints with optional filtering and pagination
   * @param filters - Filter criteria
   * @param pagination - Pagination parameters
   * @returns List of product footprints with pagination links
   */
  listFootprints(
    filters?: FootprintFilters,
    pagination?: PaginationParams
  ): Promise<PactApiListResponse<ProductFootprintV3>>;

  /**
   * Get a single product footprint by ID
   * @param id - Footprint ID
   * @returns Single product footprint
   */
  getFootprint(id: string): Promise<PactApiResponse<ProductFootprintV3>>;

  /**
   * Send a PACT event (CloudEvents format)
   * @param event - CloudEvent to send
   */
  sendEvent(event: CloudEvent): Promise<void>;
}
