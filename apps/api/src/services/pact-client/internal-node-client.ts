/**
 * Internal Node PACT API Client
 * 
 * Implementation for internal nodes that makes direct service calls
 * without HTTP overhead. This provides the same interface as external
 * nodes but with better performance for internal communication.
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
import { InternalNodeAuthService } from "../internal-node-auth-service";
import { InternalNodePactService } from "../internal-node-pact-service";
import logger from "../../common/logger";

export class InternalNodePactClient implements PactApiClient {
  private accessToken?: string;

  constructor(
    private readonly nodeId: number,
    private readonly authService: InternalNodeAuthService,
    private readonly pactService: InternalNodePactService
  ) {}

  /**
   * Authenticate using OAuth2 Client Credentials flow (internal)
   */
  async authenticate(clientId: string, clientSecret: string): Promise<TokenResponse> {
    logger.debug({ nodeId: this.nodeId, clientId }, "Internal node authentication");

    const token = await this.authService.generateToken(this.nodeId, clientId, clientSecret);

    // Store token for subsequent requests
    this.accessToken = token.access_token;

    return {
      accessToken: token.access_token,
      tokenType: token.token_type,
      expiresIn: token.expires_in,
    };
  }

  /**
   * List product footprints (internal service call)
   */
  async listFootprints(
    filters?: FootprintFilters,
    pagination?: PaginationParams
  ): Promise<PactApiListResponse<ProductFootprintV3>> {
    logger.debug({ nodeId: this.nodeId, filters, pagination }, "Internal node list footprints");

    // Direct service call - no HTTP needed
    const result = this.pactService.getFootprints(filters || {}, pagination || {});

    return {
      data: result.data,
      links: result.links,
    };
  }

  /**
   * Get a single product footprint by ID (internal service call)
   */
  async getFootprint(id: string): Promise<PactApiResponse<ProductFootprintV3>> {
    logger.debug({ nodeId: this.nodeId, footprintId: id }, "Internal node get footprint");

    const footprint = this.pactService.getFootprintById(id);

    if (!footprint) {
      throw new Error(`Product footprint not found: ${id}`);
    }

    return {
      data: footprint,
    };
  }

  /**
   * Send a PACT event (internal - logged for now)
   */
  async sendEvent(event: CloudEvent): Promise<void> {
    logger.info(
      {
        nodeId: this.nodeId,
        eventType: event.type,
        eventId: event.id,
        eventSource: event.source,
      },
      "Internal node received PACT event"
    );

    // In a full implementation, this would trigger internal workflows
    // For now, just log the event
  }
}
