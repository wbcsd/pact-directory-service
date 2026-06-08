import React from "react";
import { Button, Callout, Dialog, Flex, Text, TextField } from "@radix-ui/themes";
import { ExclamationTriangleIcon, TrashIcon } from "@radix-ui/react-icons";
import { NodeData } from "../pages/NodeDashboardPage.types";

interface DeleteNodeDialogsProps {
  nodeData: NodeData | null;
  deleteDialogOpen: boolean;
  onDeleteDialogOpenChange: (open: boolean) => void;
  deleteNameInput: string;
  onDeleteNameInputChange: (value: string) => void;
  crossOrgDialogOpen: boolean;
  onCrossOrgDialogOpenChange: (open: boolean) => void;
  onConfirmDeleteName: () => void;
  onPerformDelete: () => void;
}

const DeleteNodeDialogs: React.FC<DeleteNodeDialogsProps> = ({
  nodeData,
  deleteDialogOpen,
  onDeleteDialogOpenChange,
  deleteNameInput,
  onDeleteNameInputChange,
  crossOrgDialogOpen,
  onCrossOrgDialogOpenChange,
  onConfirmDeleteName,
  onPerformDelete,
}) => {
  return (
    <>
      {/* Delete node — step 1: confirm by typing the node name */}
      <Dialog.Root
        open={deleteDialogOpen}
        onOpenChange={(open) => { if (!open) onDeleteDialogOpenChange(false); }}
      >
        <Dialog.Content maxWidth="460px">
          <Dialog.Title>Delete node</Dialog.Title>
          <Dialog.Description size="2" color="gray" mb="4">
            This action <Text weight="bold">cannot be undone</Text>. Type the node name{" "}
            <Text weight="bold">{nodeData?.name}</Text> to confirm deletion.
          </Dialog.Description>
          <TextField.Root
            placeholder={nodeData?.name ?? ""}
            value={deleteNameInput}
            onChange={(e) => onDeleteNameInputChange(e.target.value)}
            autoFocus
          />
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
            <Button
              color="red"
              disabled={deleteNameInput !== nodeData?.name}
              onClick={onConfirmDeleteName}
            >
              <TrashIcon /> Delete node
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Delete node — step 2 (root only): cross-org warning */}
      <Dialog.Root
        open={crossOrgDialogOpen}
        onOpenChange={(open) => { if (!open) onCrossOrgDialogOpenChange(false); }}
      >
        <Dialog.Content maxWidth="460px">
          <Dialog.Title>Delete node from another organization</Dialog.Title>
          <Dialog.Description size="2" color="gray" mb="4">
            You are logged in as root and are about to delete node{" "}
            <Text weight="bold">{nodeData?.name}</Text> which belongs to{" "}
            <Text weight="bold">{nodeData?.organizationName}</Text>, not your own organization.
            This action <Text weight="bold">cannot be undone</Text>.
          </Dialog.Description>
          <Callout.Root color="red" mb="4">
            <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
            <Callout.Text>You are modifying data that belongs to another organization.</Callout.Text>
          </Callout.Root>
          <Flex gap="3" mt="2" justify="end">
            <Button variant="soft" color="gray" onClick={() => onCrossOrgDialogOpenChange(false)}>Cancel</Button>
            <Button color="red" onClick={onPerformDelete}>
              <TrashIcon /> Confirm deletion
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
};

export default DeleteNodeDialogs;
