import { useCallback, useState } from "react";
import {
  DcrApiError,
  callFootprints,
  getAuthServerMetadata,
  registerClient,
  requestToken,
} from "../mocking/dcr-mock";
import { ClientMetadata, ClientRegistrationResponse, WalkthroughStep } from "../types/dcr";

export interface RegistrationOutcome {
  clientId: string;
  clientSecret: string;
}

const buildSteps = (targetName: string): WalkthroughStep[] => [
  {
    id: "discover",
    title: "Find the partner's endpoints",
    description: `Reads ${targetName}'s discovery document to locate its registration and token endpoints.`,
    request: "GET /.well-known/oauth-authorization-server",
    status: "idle",
  },
  {
    id: "register",
    title: "Register this node as a client",
    description:
      "Sends this node's details and receives a client ID and secret. The secret is stored on the connection and never shown.",
    request: "POST /register",
    status: "idle",
  },
  {
    id: "token",
    title: "Obtain an access token",
    description: "Exchanges the new credentials for a short-lived token, proving they work.",
    request: "POST /auth/token",
    status: "idle",
  },
  {
    id: "verify",
    title: "Verify access",
    description: "Reads footprints from the partner to confirm the connection is usable.",
    request: "GET /3/footprints",
    status: "idle",
  },
];

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

export interface ConnectionRegistrationState {
  steps: WalkthroughStep[];
  running: boolean;
  /** Credentials obtained from the partner, ready to store on the connection. */
  outcome: RegistrationOutcome | null;
  failed: boolean;
  register: () => Promise<RegistrationOutcome | null>;
  reset: () => void;
}

/**
 * Obtains OAuth credentials from a partner node via RFC 7591, replacing the
 * manual client ID / secret handover. Step statuses drive the progress UI.
 */
export function useConnectionRegistration(
  targetNodeId: number,
  targetNodeName: string
): ConnectionRegistrationState {
  const [steps, setSteps] = useState<WalkthroughStep[]>(() => buildSteps(targetNodeName));
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<RegistrationOutcome | null>(null);
  const [failed, setFailed] = useState(false);

  const patchStep = useCallback((id: string, patch: Partial<WalkthroughStep>) => {
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  }, []);

  const reset = useCallback(() => {
    setSteps(buildSteps(targetNodeName));
    setOutcome(null);
    setFailed(false);
  }, [targetNodeName]);

  const register = useCallback(async () => {
    setSteps(buildSteps(targetNodeName));
    setOutcome(null);
    setFailed(false);
    setRunning(true);

    const metadata: ClientMetadata = {
      client_name: `PACT Directory connection to ${targetNodeName}`,
      grant_types: ["client_credentials"],
      token_endpoint_auth_method: "client_secret_basic",
      scope: "footprint:read",
    };

    try {
      patchStep("discover", { status: "running" });
      const discovery = await getAuthServerMetadata(targetNodeId);
      patchStep("discover", { status: "done", responsePayload: pretty(discovery) });

      patchStep("register", { status: "running", requestPayload: pretty(metadata) });
      const registration: ClientRegistrationResponse = await registerClient(
        targetNodeId,
        metadata
      );
      patchStep("register", {
        status: "done",
        responsePayload: pretty({
          ...registration,
          client_secret: "•••• stored on the connection ••••",
        }),
      });

      patchStep("token", { status: "running" });
      const token = await requestToken(
        targetNodeId,
        registration.client_id,
        registration.client_secret
      );
      patchStep("token", {
        status: "done",
        responsePayload: pretty({ ...token, access_token: "••••" }),
      });

      patchStep("verify", { status: "running" });
      const footprints = await callFootprints(targetNodeId, token.access_token);
      patchStep("verify", {
        status: "done",
        responsePayload: pretty({ footprintsReturned: footprints.data.length }),
      });

      const result = {
        clientId: registration.client_id,
        clientSecret: registration.client_secret,
      };
      setOutcome(result);
      return result;
    } catch (error) {
      const message =
        error instanceof DcrApiError
          ? `${error.body.error}: ${error.body.error_description}`
          : "Could not complete automatic registration with this node.";

      setSteps((prev) => {
        const failingIndex = prev.findIndex((step) => step.status === "running");
        if (failingIndex === -1) return prev;
        return prev.map((step, index) =>
          index === failingIndex ? { ...step, status: "error", errorMessage: message } : step
        );
      });
      setFailed(true);
      return null;
    } finally {
      setRunning(false);
    }
  }, [targetNodeId, targetNodeName, patchStep]);

  return { steps, running, outcome, failed, register, reset };
}
