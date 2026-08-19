import React, { useEffect, useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Button, Callout, Dialog, Flex } from "@radix-ui/themes";
import { ExclamationTriangleIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import { FormField, TextField } from "./ui";
import { NodeConnection } from "./NodeConnectionsManager";
import "./NodeForm.css";

interface EditConnectionCredentialsDialogProps {
  /** The connection whose operator-issued credentials are being edited, or null when closed. */
  connection: NodeConnection | null;
  /** Name of the external node the credentials belong to. */
  targetNodeName?: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Edits the credentials an external node's operator issued for one connection.
 * The stored secret is never returned by the API, so leaving the field blank
 * keeps it.
 */
const EditConnectionCredentialsDialog: React.FC<EditConnectionCredentialsDialogProps> = ({
  connection,
  targetNodeName,
  onClose,
  onSaved,
}) => {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setClientId(connection?.clientId ?? "");
    setClientSecret("");
    setErrorMessage("");
  }, [connection]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!connection) return;

    if (!clientId.trim()) {
      setErrorMessage("Client ID is required");
      return;
    }
    if (!clientSecret.trim() && !connection.hasCredentials) {
      setErrorMessage("Client secret is required");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      const response = await fetchWithAuth(
        `/node-connections/${connection.id}/credentials`,
        {
          method: "PUT",
          body: JSON.stringify({
            clientId: clientId.trim(),
            // Blank keeps the stored secret
            clientSecret: clientSecret.trim(),
          }),
        }
      );

      if (!response?.ok) {
        const error = await response?.json().catch(() => null);
        setErrorMessage(error?.message || "Failed to update credentials");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setErrorMessage("An error occurred while updating the credentials");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root
      open={connection !== null}
      onOpenChange={(open) => { if (!open) onClose(); }}
    >
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>Connection Credentials</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          The credentials this connection uses to authenticate against{" "}
          <strong>{targetNodeName ?? "the external node"}</strong>.
        </Dialog.Description>

        <Callout.Root variant="soft" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            These are issued by the external node's operator. To replace them, request
            new credentials from them and enter them here.
          </Callout.Text>
        </Callout.Root>

        {errorMessage && (
          <Callout.Root color="bronze" highContrast variant="surface" mb="4">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{errorMessage}</Callout.Text>
          </Callout.Root>
        )}

        <Form.Root autoComplete="off" onSubmit={handleSubmit}>
          <FormField name="clientId" label="Client ID" required>
            <TextField
              required
              value={clientId}
              placeholder="OAuth2 client ID"
              tooltip="The OAuth2 client ID issued to you by the external node's operator."
              onChange={(event) => setClientId(event.target.value)}
            />
          </FormField>

          <FormField
            name="clientSecret"
            label="Client Secret"
            required={!connection?.hasCredentials}
            description="Stored encrypted; it is never shown again."
          >
            <TextField
              required={!connection?.hasCredentials}
              type="password"
              value={clientSecret}
              placeholder={
                connection?.hasCredentials
                  ? "Leave blank to keep current secret"
                  : "OAuth2 client secret"
              }
              tooltip="The OAuth2 client secret issued to you by the external node's operator."
              onChange={(event) => setClientSecret(event.target.value)}
            />
          </FormField>

          <Flex justify="end" gap="3" mt="4">
            <Button type="button" color="jade" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Form.Submit asChild>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Credentials"}
              </Button>
            </Form.Submit>
          </Flex>
        </Form.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default EditConnectionCredentialsDialog;
