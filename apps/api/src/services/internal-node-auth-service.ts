import jwt from "jsonwebtoken";
import config from "../common/config";
import { BadRequestError, UnauthorizedError } from "../common/errors";
import { NodeService } from "./node-service";
import { NodeConnectionService } from "./node-connection-service";

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
  constructor(
    private nodeService: NodeService,
    private nodeConnectionService: NodeConnectionService
  ) {}

  /**
   * Generate access token for internal node using client credentials
   */
  async generateToken(
    nodeId: number,
    clientId: string,
    clientSecret: string
  ): Promise<TokenResponse> {
    // Validate node exists and is internal type
    const node = await this.nodeService.getById(nodeId);
    if (node.type !== "internal") {
      throw new BadRequestError("Authentication only available for internal nodes");
    }

    // Verify credentials and get connection
    const connection = await this.nodeConnectionService.verifyConnectionCredentials(
      nodeId, clientId, clientSecret
    );
    if (!connection) {
      throw new UnauthorizedError("Invalid client credentials");
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
}
