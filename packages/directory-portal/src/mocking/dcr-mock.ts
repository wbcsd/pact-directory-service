/**
 * In-memory stand-in for the RFC 7591 endpoints an internal node will expose.
 *
 * This exists so the identity-management UI can be built and demoed before any
 * backend work starts. Every exported function is shaped like the `fetchWithAuth`
 * call that will eventually replace it: async, resolving with the parsed body or
 * rejecting with a `DcrApiError` carrying the RFC error payload. Swapping to the
 * real API is therefore a per-call-site import change, not a rewrite.
 *
 * State lives in module scope and is deliberately not persisted — a page reload
 * resets the demo.
 */

import {
  AuthServerMetadata,
  ClientMetadata,
  ClientRegistrationResponse,
  DcrError,
  FootprintsResponse,
  RegisteredClient,
  RegistrationSettings,
  TokenResponse,
} from "../types/dcr";

/** Rejection carrying an RFC 7591 §3.2.2 error body alongside the HTTP status. */
export class DcrApiError extends Error {
  readonly status: number;
  readonly body: DcrError;

  constructor(status: number, error: string, description: string) {
    super(description);
    this.name = "DcrApiError";
    this.status = status;
    this.body = { error, error_description: description };
  }
}

interface NodeState {
  clients: ClientRegistrationResponse[];
}

const state = new Map<number, NodeState>();

let latencyMs = 450;
let counter = 0;

/** Test hook: removes artificial latency and resets the id counter for determinism. */
export function configureDcrMock(options: { latencyMs?: number }): void {
  if (options.latencyMs !== undefined) {
    latencyMs = options.latencyMs;
  }
}

/** Test hook: drops all in-memory state so each test starts from the seed. */
export function resetDcrMock(): void {
  state.clear();
  counter = 0;
}

const delay = () =>
  latencyMs > 0
    ? new Promise<void>((resolve) => setTimeout(resolve, latencyMs))
    : Promise.resolve();

const nextId = (prefix: string) => {
  counter += 1;
  return `${prefix}_${counter.toString().padStart(4, "0")}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
};

const nowSeconds = () => Math.floor(Date.now() / 1000);

const DAY_SECONDS = 24 * 60 * 60;

/** Base URL the node's endpoints are advertised under. Mirrors the real route shape. */
const nodeBaseUrl = (nodeId: number) =>
  `${import.meta.env.VITE_DIRECTORY_API ?? "https://api.pact.example"}/api/nodes/${nodeId}`;

function seedState(nodeId: number): NodeState {
  const issuedAt = nowSeconds() - 30 * DAY_SECONDS;
  return {
    clients: [
      {
        client_id: "c_seed_acme_7f31a9",
        client_secret: "s_seed_acme_not_retrievable",
        client_id_issued_at: issuedAt,
        client_secret_expires_at: issuedAt + 365 * DAY_SECONDS,
        registration_access_token: "rat_seed_acme",
        registration_client_uri: `${nodeBaseUrl(nodeId)}/register/c_seed_acme_7f31a9`,
        client_name: "Acme Steel PACT Node",
        client_uri: "https://pact.acme-steel.example",
        grant_types: ["client_credentials"],
        token_endpoint_auth_method: "client_secret_basic",
        scope: "footprint:read",
        software_id: "3f7c1a80-5d6e-4b2a-9c11-2a6d8c4b7e11",
        software_version: "2.4.1",
        status: "active",
      },
      {
        client_id: "c_seed_northwind_2b48c1",
        client_secret: "s_seed_northwind_not_retrievable",
        client_id_issued_at: issuedAt - 120 * DAY_SECONDS,
        client_secret_expires_at: nowSeconds() - 5 * DAY_SECONDS,
        registration_access_token: "rat_seed_northwind",
        registration_client_uri: `${nodeBaseUrl(nodeId)}/register/c_seed_northwind_2b48c1`,
        client_name: "Northwind Logistics",
        grant_types: ["client_credentials"],
        token_endpoint_auth_method: "client_secret_basic",
        scope: "footprint:read",
        software_id: "9b2e4d55-1c7f-4a03-8e6b-51d9a3c07f42",
        software_version: "1.0.0",
        status: "expired",
      },
    ],
  };
}

function getState(nodeId: number): NodeState {
  let existing = state.get(nodeId);
  if (!existing) {
    existing = seedState(nodeId);
    state.set(nodeId, existing);
  }
  return existing;
}

/** Secrets are never returned after creation, matching the real endpoint. */
function toPublicClient(client: ClientRegistrationResponse): RegisteredClient {
  return {
    client_id: client.client_id,
    client_id_issued_at: client.client_id_issued_at,
    client_secret_expires_at: client.client_secret_expires_at,
    registration_client_uri: client.registration_client_uri,
    status: client.status,
    client_name: client.client_name,
    client_uri: client.client_uri,
    contacts: client.contacts,
    grant_types: client.grant_types,
    token_endpoint_auth_method: client.token_endpoint_auth_method,
    scope: client.scope,
    software_id: client.software_id,
    software_version: client.software_version,
  };
}

function effectiveStatus(client: ClientRegistrationResponse): RegisteredClient["status"] {
  if (client.status === "revoked") return "revoked";
  if (client.client_secret_expires_at !== 0 && client.client_secret_expires_at < nowSeconds()) {
    return "expired";
  }
  return "active";
}

export async function getAuthServerMetadata(nodeId: number): Promise<AuthServerMetadata> {
  await delay();
  const base = nodeBaseUrl(nodeId);
  return {
    issuer: base,
    token_endpoint: `${base}/auth/token`,
    registration_endpoint: `${base}/register`,
    grant_types_supported: ["client_credentials"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
  };
}

export async function getRegistrationSettings(nodeId: number): Promise<RegistrationSettings> {
  await delay();
  const base = nodeBaseUrl(nodeId);
  return {
    nodeId,
    registrationEndpoint: `${base}/register`,
    discoveryEndpoint: `${base}/.well-known/oauth-authorization-server`,
  };
}

/**
 * RFC 7591 §3.1/§3.2. Rejects metadata this node cannot honour, then issues credentials.
 */
export async function registerClient(
  nodeId: number,
  metadata: ClientMetadata
): Promise<ClientRegistrationResponse> {
  await delay();
  const nodeState = getState(nodeId);

  if (!metadata.client_name?.trim()) {
    throw new DcrApiError(400, "invalid_client_metadata", "client_name is required.");
  }
  if (!metadata.grant_types.includes("client_credentials")) {
    throw new DcrApiError(
      400,
      "invalid_client_metadata",
      "This node only supports the client_credentials grant type."
    );
  }
  if (
    !["client_secret_basic", "client_secret_post"].includes(metadata.token_endpoint_auth_method)
  ) {
    throw new DcrApiError(
      400,
      "invalid_client_metadata",
      `Unsupported token_endpoint_auth_method: ${metadata.token_endpoint_auth_method}`
    );
  }

  const issuedAt = nowSeconds();
  const clientId = `c_${nextId("id")}`;
  const record: ClientRegistrationResponse = {
    ...metadata,
    client_id: clientId,
    client_secret: `s_${nextId("secret")}`,
    client_id_issued_at: issuedAt,
    client_secret_expires_at: issuedAt + 365 * DAY_SECONDS,
    registration_access_token: `rat_${nextId("rat")}`,
    registration_client_uri: `${nodeBaseUrl(nodeId)}/register/${clientId}`,
    status: "active",
  };
  nodeState.clients.unshift(record);
  return record;
}

export async function listRegisteredClients(nodeId: number): Promise<RegisteredClient[]> {
  await delay();
  return getState(nodeId).clients.map((client) =>
    toPublicClient({ ...client, status: effectiveStatus(client) })
  );
}

export async function revokeClient(nodeId: number, clientId: string): Promise<void> {
  await delay();
  const client = getState(nodeId).clients.find((c) => c.client_id === clientId);
  if (!client) {
    throw new DcrApiError(404, "invalid_client_id", "No such client registered on this node.");
  }
  client.status = "revoked";
}

/** OAuth 2.0 client credentials grant against the node's token endpoint. */
export async function requestToken(
  nodeId: number,
  clientId: string,
  clientSecret: string
): Promise<TokenResponse> {
  await delay();
  const client = getState(nodeId).clients.find((c) => c.client_id === clientId);
  if (!client || client.client_secret !== clientSecret) {
    throw new DcrApiError(401, "invalid_client", "Client authentication failed.");
  }
  if (effectiveStatus(client) !== "active") {
    throw new DcrApiError(
      401,
      "invalid_client",
      `This client is ${effectiveStatus(client)} and can no longer obtain tokens.`
    );
  }
  return {
    access_token: `eyJhbGciOiJIUzI1NiJ9.${nextId("jwt")}.sig`,
    token_type: "Bearer",
    expires_in: 3600,
    scope: client.scope,
  };
}

/** Stands in for the node's PACT v3 footprints endpoint, to prove the token works. */
export async function callFootprints(
  nodeId: number,
  accessToken: string
): Promise<FootprintsResponse> {
  await delay();
  if (!accessToken) {
    throw new DcrApiError(401, "invalid_token", "Missing bearer token.");
  }
  return {
    data: [
      {
        id: "d9be4477-e351-45b3-acd9-e1da05e6f633",
        specVersion: "3.0.0",
        dataSource: nodeBaseUrl(nodeId),
        productNameCompany: "Hot Rolled Coil",
        pcf: { pCfExcludingBiogenic: 1.84, unit: "kgCO2e/kg" },
      },
      {
        id: "1b4f0e98-77c2-4f1b-9a6d-0d3a2f5c91aa",
        specVersion: "3.0.0",
        dataSource: nodeBaseUrl(nodeId),
        productNameCompany: "Galvanised Sheet",
        pcf: { pCfExcludingBiogenic: 2.31, unit: "kgCO2e/kg" },
      },
    ],
  };
}
