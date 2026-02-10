/**
 * PACT API Client Factory
 * 
 * Factory for creating PACT API clients with appropriate base URLs.
 * Simplified to use a single HTTP-based client implementation for all node types.
 * 
 * Key Design:
 * - Single HTTP client for both internal and external nodes
 * - Internal nodes call themselves via HTTP (localhost)
 * - All requests flow through Express middleware for security
 */

import { PactApiClient } from "./pact-api-client.interface";
import { PactApiClientImpl } from "./pact-api-client";

/**
 * Node information needed to create a client
 */
export interface NodeInfo {
  id: number;
  type: "internal" | "external";
  apiUrl?: string;
}

/**
 * Configuration for client factory
 */
export interface ClientFactoryConfig {
  /** Base URL for internal API (e.g., http://localhost:3010 or https://your-company.com) */
  internalApiBaseUrl: string;
}

/**
 * Factory class for creating PACT API clients
 */
export class PactApiClientFactory {
  /**
   * Create a PACT API client for the given node
   * 
   * @param node - Node information (type, id, apiUrl)
   * @param config - Configuration including internal API base URL
   * @returns PactApiClient implementation (single HTTP-based client)
   * 
   * @example
   * // Create client for internal node (calls via HTTP)
   * const client = PactApiClientFactory.create(
   *   internalNode, 
   *   { internalApiBaseUrl: 'http://localhost:3010' }
   * );
   * 
   * @example
   * // Create client for external node
   * const client = PactApiClientFactory.create(
   *   externalNode,
   *   { internalApiBaseUrl: 'http://localhost:3010' }
   * );
   */
  static create(node: NodeInfo, config: ClientFactoryConfig): PactApiClient {
    let baseUrl: string;

    if (node.type === "external") {
      // External node: use provided API URL
      if (!node.apiUrl) {
        throw new Error("API URL is required for external node communication");
      }
      baseUrl = node.apiUrl;
    } else {
      // Internal node: construct URL from base + node ID
      baseUrl = `${config.internalApiBaseUrl}/api/nodes/${node.id}`;
    }

    return new PactApiClientImpl(baseUrl);
  }
}
