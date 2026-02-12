import jwt from "jsonwebtoken";
import { Kysely } from "kysely";
import { Database } from "../database/types";
import config from "../common/config";
import { UnauthorizedError } from "../common/errors";

/**
 * Token payload for internal node authentication
 */
export interface InternalNodeTokenPayload {
  nodeId: number;
  connectionId: number;
  organizationId: number;
  sub: string; // Subject (node ID as string)
  iss: string; // Issuer
  aud: string; // Audience
  iat: number; // Issued at
  exp: number; // Expiry
}

/**
 * OAuth2 token response
 */
export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
}

/**
 * Service for handling Internal Node OAuth2 authentication
 * Implements OAuth2 Client Credentials flow for node-to-node communication
 */
export class InternalNodeAuthService {
  constructor(private db: Kysely<Database>) {}

  /**
   * Validate that a node exists and is an internal node type
   * @param nodeId - The node ID to validate
   * @throws NotFoundError if node doesn't exist
   * @throws BadRequestError if node is not internal type
   */
  async validateInternalNode(nodeId: number): Promise<void> {
    const node = await this.db
      .selectFrom("nodes")
      .select(["id", "type"])
      .where("id", "=", nodeId)
      .executeTakeFirst();

    if (!node) {
      const { NotFoundError } = await import("../common/errors");
      throw new NotFoundError("Node not found");
    }

    if (node.type !== "internal") {
      const { BadRequestError } = await import("../common/errors");
      throw new BadRequestError("Authentication only available for internal nodes");
    }
  }

  /**
   * Generate access token for internal node using client credentials
   * @param nodeId - The node ID requesting access
   * @param clientId - The client ID from connection credentials
   * @param clientSecret - The client secret from connection credentials
   * @returns Token response with JWT access token
   */
  async generateToken(
    nodeId: number,
    clientId: string,
    clientSecret: string
  ): Promise<TokenResponse> {
    // Validate node exists and is internal type
    await this.validateInternalNode(nodeId);

    // Verify credentials and get connection
    const connection = await this.verifyCredentials(
      nodeId,
      clientId,
      clientSecret
    );

    if (!connection) {
      throw new UnauthorizedError("Invalid client credentials");
    }

    // Check connection is accepted
    if (connection.status !== "accepted") {
      throw new UnauthorizedError("Connection is not accepted");
    }

    // Generate JWT token
    const expiresIn = 3600; // 1 hour
    const issuer = process.env.BASE_URL || "http://localhost:3010";
    const payload: InternalNodeTokenPayload = {
      nodeId: connection.fromNodeId,
      connectionId: connection.id,
      organizationId: connection.fromNodeOrganizationId,
      sub: connection.fromNodeId.toString(),
      iss: issuer,
      aud: `node:${nodeId}`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    };

    const token = jwt.sign(payload, config.JWT_SECRET, {
      algorithm: "HS256",
    });

    return {
      access_token: token,
      token_type: "Bearer",
      expires_in: expiresIn,
    };
  }

  /**
   * Verify JWT token and return payload
   * @param token - The JWT token to verify
   * @param nodeId - The node ID that should be the audience
   * @returns Token payload if valid
   */
  async verifyToken(
    token: string,
    nodeId: number
  ): Promise<InternalNodeTokenPayload> {
    try {
      const issuer = process.env.BASE_URL || "http://localhost:3010";
      const decoded = jwt.verify(token, config.JWT_SECRET, {
        algorithms: ["HS256"],
        audience: `node:${nodeId}`,
        issuer: issuer,
      }) as InternalNodeTokenPayload;

      return decoded;
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }
  }

  /**
   * Verify client credentials against stored connection credentials
   * @param nodeId - The target node ID
   * @param clientId - The client ID to verify
   * @param clientSecret - The client secret to verify
   * @returns Connection if credentials are valid, null otherwise
   */
  private async verifyCredentials(
    nodeId: number,
    clientId: string,
    clientSecret: string
  ) {
    // Find connection where:
    // - targetNodeId matches the requested nodeId
    // - clientId matches the credentials
    const connection = await this.db
      .selectFrom("connections")
      .innerJoin("nodes as fromNode", "connections.fromNodeId", "fromNode.id")
      .innerJoin(
        "organizations as fromOrg",
        "fromNode.organizationId",
        "fromOrg.id"
      )
      .select([
        "connections.id",
        "connections.fromNodeId",
        "connections.targetNodeId",
        "connections.status",
        "connections.clientId",
        "connections.clientSecret",
        "fromOrg.id as fromNodeOrganizationId",
      ])
      .where("connections.targetNodeId", "=", nodeId)
      .where("connections.clientId", "=", clientId)
      .where("connections.status", "=", "accepted")
      .executeTakeFirst();

    if (!connection) {
      return null;
    }

    // Verify client secret (in production, use proper comparison)
    // TODO: Use secure comparison (crypto.timingSafeEqual)
    const secretMatches = connection.clientSecret === clientSecret;

    if (!secretMatches) {
      return null;
    }

    return connection;
  }
}
