import React, { useState } from "react";
import { AlertDialog, Badge, Button, Card, Code, Flex, Heading, Text } from "@radix-ui/themes";
import DataTable, { Column } from "../DataTable";
import PolicyGuard from "../PolicyGuard";
import { RegisteredClient, RegisteredClientStatus } from "../../types/dcr";

interface RegisteredClientsTableProps {
  clients: RegisteredClient[];
  isLoading: boolean;
  onRevoke: (clientId: string) => Promise<void>;
}

const STATUS_COLORS: Record<RegisteredClientStatus, "green" | "gray" | "red"> = {
  active: "green",
  expired: "gray",
  revoked: "red",
};

const formatDate = (epochSeconds: number) =>
  epochSeconds === 0
    ? "Never"
    : new Date(epochSeconds * 1000).toLocaleDateString(undefined, { dateStyle: "medium" });

const RegisteredClientsTable: React.FC<RegisteredClientsTableProps> = ({
  clients,
  isLoading,
  onRevoke,
}) => {
  const [pendingRevoke, setPendingRevoke] = useState<RegisteredClient | null>(null);
  const [revoking, setRevoking] = useState(false);

  const handleConfirmRevoke = async () => {
    if (!pendingRevoke) return;
    setRevoking(true);
    try {
      await onRevoke(pendingRevoke.client_id);
      setPendingRevoke(null);
    } finally {
      setRevoking(false);
    }
  };

  const columns: Column<RegisteredClient>[] = [
    {
      key: "client_name",
      header: "Client",
      sortable: true,
      sortValue: (row) => row.client_name,
      render: (row) => (
        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            {row.client_name}
          </Text>
          <Code size="1" variant="ghost" color="gray">
            {row.client_id}
          </Code>
        </Flex>
      ),
    },
    {
      key: "software_id",
      header: "Software",
      render: (row) => (
        <Flex direction="column" gap="1">
          <Text size="1" color="gray">
            {row.software_id ?? "—"}
          </Text>
          {row.software_version && (
            <Text size="1" color="gray">
              v{row.software_version}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      key: "client_id_issued_at",
      header: "Registered",
      sortable: true,
      sortValue: (row) => row.client_id_issued_at,
      render: (row) => <Text size="1">{formatDate(row.client_id_issued_at)}</Text>,
    },
    {
      key: "client_secret_expires_at",
      header: "Secret expires",
      sortable: true,
      sortValue: (row) => row.client_secret_expires_at,
      render: (row) => <Text size="1">{formatDate(row.client_secret_expires_at)}</Text>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row) => row.status,
      render: (row) => (
        <Badge color={STATUS_COLORS[row.status]} variant="soft">
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) =>
        row.status === "revoked" ? null : (
          <PolicyGuard
            policies={["manage-connections-own-nodes", "manage-connections-all-nodes"]}
            predicate="or"
          >
            <Button
              size="1"
              variant="soft"
              color="red"
              onClick={() => setPendingRevoke(row)}
              aria-label={`Revoke ${row.client_name}`}
            >
              Revoke
            </Button>
          </PolicyGuard>
        ),
    },
  ];

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="1">
          <Heading size="4">Registered clients</Heading>
          <Text size="2" color="gray">
            Partner nodes holding credentials for this node. Revoking one immediately stops it from
            obtaining new access tokens.
          </Text>
        </Flex>

        <DataTable<RegisteredClient>
          idColumnName="client_id"
          data={clients}
          columns={columns}
          isLoading={isLoading}
          emptyState={{
            title: "No registered clients",
            description:
              "Partner nodes appear here once they complete registration against this node.",
          }}
        />
      </Flex>

      <AlertDialog.Root
        open={pendingRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRevoke(null);
        }}
      >
        <AlertDialog.Content maxWidth="460px">
          <AlertDialog.Title>Revoke {pendingRevoke?.client_name}?</AlertDialog.Title>
          <AlertDialog.Description size="2">
            This client will no longer be able to obtain access tokens for this node. Any existing
            token stays valid until it expires. The partner must register again to regain access.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <Button color="red" onClick={handleConfirmRevoke} loading={revoking}>
              Revoke client
            </Button>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Card>
  );
};

export default RegisteredClientsTable;
