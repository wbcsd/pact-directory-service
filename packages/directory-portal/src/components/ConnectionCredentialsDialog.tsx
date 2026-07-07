import React from "react";
import { Box, Button, Callout, Dialog, Flex } from "@radix-ui/themes";
import { CheckIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { ConnectionCredentials } from "../pages/NodeDashboardPage.types";

interface ConnectionCredentialsDialogProps {
  credentials: ConnectionCredentials | null;
  onClose: () => void;
  onCopy: (value: string) => void;
  truncateCredential: (value: string) => string;
}

const ConnectionCredentialsDialog: React.FC<ConnectionCredentialsDialogProps> = ({
  credentials,
  onClose,
  onCopy,
  truncateCredential,
}) => {
  return (
    <Dialog.Root
      open={credentials !== null}
      onOpenChange={(open) => { if (!open) onClose(); }}
    >
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>Connection Accepted</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Save these credentials securely. They are used by the requesting node to authenticate against this node.
        </Dialog.Description>
        {credentials && (
          <>
            <Box mb="4" p="3" style={{ background: 'var(--gray-a3)', borderRadius: 'var(--radius-2)', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.8' }}>
              <div><strong>Connection ID:</strong> {credentials.connectionId}</div>
              <Flex align="center" gap="2">
                <strong>Client ID:</strong> {truncateCredential(credentials.clientId)}
                <Button size="1" variant="soft" onClick={() => onCopy(credentials.clientId)}>
                  Copy
                </Button>
              </Flex>
              <Flex align="center" gap="2">
                <strong>Client Secret:</strong> {truncateCredential(credentials.clientSecret)}
                <Button size="1" variant="soft" onClick={() => onCopy(credentials.clientSecret)}>
                  Copy
                </Button>
              </Flex>
            </Box>
            <Callout.Root color="yellow" mb="4">
              <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
              <Callout.Text>The client secret will only be shown once. Make sure to copy and store it securely before closing this dialog.</Callout.Text>
            </Callout.Root>
            <Callout.Root color="blue" mb="4">
              <Callout.Icon><CheckIcon /></Callout.Icon>
              <Callout.Text>
                Register this client ID and client secret in the <strong>{credentials.requestingNodeName ?? "requesting"}</strong> node configuration.
                {credentials.requestingNodeType === "external" && " If that node is managed in external software, open that software and add these credentials there."}
              </Callout.Text>
            </Callout.Root>
          </>
        )}
        <Flex justify="end">
          <Dialog.Close>
            <Button variant="soft">Close</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default ConnectionCredentialsDialog;
