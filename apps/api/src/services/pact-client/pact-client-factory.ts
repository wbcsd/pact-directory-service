/**
 * PACT API Client Factory
 * 
 * Factory for creating the appropriate PACT client based on node type.
 * This is the single point where we decide whether to use internal or
 * external communication, following the Open/Closed principle.
 */

import { PactApiClient } from "./pact-api-client.interface";
import { InternalNodePactClient } from "./internal-node-client";
import { ExternalNodePactClient } from "./external-node-client";
import { InternalNodeAuthService } from "../internal-node-auth-service";
import { InternalNodePactService } from "../internal-node-pact-service";

/**
 * Node information needed to create a client
 */
export interface NodeInfo {
  id: number;
  type: "internal" | "external";
  apiUrl?: string;
}

/**
 * Services required for internal node communication
 */
export interface InternalNodeServices {
  internalNodeAuth: InternalNodeAuthService;
  internalNodePact: InternalNodePactService;
}

/**
 * Factory class for creating PACT API clients
 */
export class PactApiClientFactory {
  /**
   * Create a PACT API client for the given node
   * 
   * @param node - Node information (type, id, apiUrl)
   * @param services - Required services (only needed for internal nodes)
   * @returns PactApiClient implementation (internal or external)
   * 
   * @example
   * // Create client for internal node
   * const client = PactApiClientFactory.create(internalNode, { internalNodeAuth, internalNodePact });
   * 
   * @example
   * // Create client for external node
   * const client = PactApiClientFactory.create(externalNode);
   */
  static create(node: NodeInfo, services?: InternalNodeServices): PactApiClient {
    if (node.type === "internal") {
      if (!services) {
        throw new Error("Services are required for internal node communication");
      }

      return new InternalNodePactClient(
        node.id,
        services.internalNodeAuth,
        services.internalNodePact
      );
    } else if (node.type === "external") {
      if (!node.apiUrl) {
        throw new Error("API URL is required for external node communication");
      }

      return new ExternalNodePactClient(node.apiUrl);
    } else {
      throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }
}
