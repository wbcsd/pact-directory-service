/**
 * Types for OAuth 2.0 Dynamic Client Registration (RFC 7591) and Authorization
 * Server Metadata (RFC 8414), as they will be exposed by an internal node.
 *
 * Field names deliberately use the snake_case of the RFCs rather than the
 * camelCase used elsewhere in the portal, so payloads shown to users in the
 * walkthrough match the wire format they will actually implement against.
 */

/** RFC 8414 §2 — the subset an internal node needs to advertise. */
export interface AuthServerMetadata {
  issuer: string;
  token_endpoint: string;
  registration_endpoint: string;
  grant_types_supported: string[];
  token_endpoint_auth_methods_supported: string[];
}

/** RFC 7591 §2 — client metadata a partner node sends when registering. */
export interface ClientMetadata {
  client_name: string;
  client_uri?: string;
  contacts?: string[];
  grant_types: string[];
  token_endpoint_auth_method: string;
  scope?: string;
  software_id?: string;
  software_version?: string;
}

export type RegisteredClientStatus = "active" | "expired" | "revoked";

/** RFC 7591 §3.2.1 — what the authorization server stores and returns. */
export interface RegisteredClient extends ClientMetadata {
  client_id: string;
  client_id_issued_at: number;
  client_secret_expires_at: number;
  registration_client_uri: string;
  status: RegisteredClientStatus;
}

/**
 * Registration response. The secret and the registration access token are
 * returned once, at creation, and never again.
 */
export interface ClientRegistrationResponse extends RegisteredClient {
  client_secret: string;
  registration_access_token: string;
}

export interface RegistrationSettings {
  nodeId: number;
  registrationEndpoint: string;
  discoveryEndpoint: string;
}

/** RFC 7591 §3.2.2 error response. */
export interface DcrError {
  error: string;
  error_description: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope?: string;
}

export interface FootprintsResponse {
  data: Array<Record<string, unknown>>;
}

export type StepStatus = "idle" | "running" | "done" | "error";

/** One row of the registration walkthrough. */
export interface WalkthroughStep {
  id: string;
  title: string;
  /** Human-readable summary of what happens, shown under the title. */
  description: string;
  /** The HTTP call this step represents, e.g. "POST /api/nodes/12/register". */
  request: string;
  status: StepStatus;
  /** Pretty-printed JSON of the request body, when the step sends one. */
  requestPayload?: string;
  /** Pretty-printed JSON of the response, populated once the step settles. */
  responsePayload?: string;
  errorMessage?: string;
}
