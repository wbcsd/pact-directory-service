import React, { useCallback, useEffect, useState } from "react";
import { Flex } from "@radix-ui/themes";
import NodeRegistrationSettingsPanel from "./NodeRegistrationSettingsPanel";
import RegisteredClientsTable from "./RegisteredClientsTable";
import {
  getRegistrationSettings,
  listRegisteredClients,
  revokeClient,
} from "../../mocking/dcr-mock";
import { RegisteredClient, RegistrationSettings } from "../../types/dcr";

interface NodeRegistrationSectionProps {
  nodeId: number;
}

/**
 * Inbound side of dynamic client registration: where partners register with this
 * node, and which ones already have.
 */
const NodeRegistrationSection: React.FC<NodeRegistrationSectionProps> = ({ nodeId }) => {
  const [settings, setSettings] = useState<RegistrationSettings | null>(null);
  const [clients, setClients] = useState<RegisteredClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  const refreshClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      setClients(await listRegisteredClients(nodeId));
    } finally {
      setClientsLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedSettings, loadedClients] = await Promise.all([
        getRegistrationSettings(nodeId),
        listRegisteredClients(nodeId),
      ]);
      if (cancelled) return;
      setSettings(loadedSettings);
      setClients(loadedClients);
      setClientsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [nodeId]);

  const handleRevokeClient = async (clientId: string) => {
    await revokeClient(nodeId, clientId);
    await refreshClients();
  };

  return (
    <Flex direction="column" gap="4">
      <NodeRegistrationSettingsPanel settings={settings} />
      <RegisteredClientsTable
        clients={clients}
        isLoading={clientsLoading}
        onRevoke={handleRevokeClient}
      />
    </Flex>
  );
};

export default NodeRegistrationSection;
