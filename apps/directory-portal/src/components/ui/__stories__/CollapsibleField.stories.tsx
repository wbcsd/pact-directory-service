import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CollapsibleField } from "../CollapsibleField";

const meta: Meta<typeof CollapsibleField> = {
  title: "UI/CollapsibleField",
  component: CollapsibleField,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CollapsibleField>;

export const Default: Story = {
  args: {
    label: "Advanced Settings",
    children: (
      <div style={{ padding: "12px 0", color: "#555", fontSize: 14 }}>
        <p>These are the advanced configuration options that are hidden by default.</p>
        <p style={{ marginTop: 8 }}>You can place any content here — form fields, text, tables, etc.</p>
      </div>
    ),
  },
};

export const DefaultOpen: Story = {
  args: {
    label: "Connection Details",
    defaultOpen: true,
    children: (
      <div style={{ padding: "12px 0", color: "#555", fontSize: 14 }}>
        <p><strong>Client ID:</strong> abc123def456</p>
        <p style={{ marginTop: 4 }}><strong>Status:</strong> Active</p>
        <p style={{ marginTop: 4 }}><strong>Created:</strong> 2026-01-15</p>
      </div>
    ),
  },
};

const ControlledCollapsible = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p style={{ marginBottom: 12, fontSize: 14, color: "#666" }}>
        State: <strong>{open ? "Open" : "Closed"}</strong>
      </p>
      <CollapsibleField label="Controlled Section" open={open} onOpenChange={setOpen}>
        <div style={{ padding: "12px 0", color: "#555", fontSize: 14 }}>
          This section is controlled externally. Toggle it using the trigger.
        </div>
      </CollapsibleField>
    </div>
  );
};

export const Controlled: Story = {
  render: () => <ControlledCollapsible />,
};

export const NestedContent: Story = {
  args: {
    label: "Credentials",
    defaultOpen: true,
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0" }}>
        <input placeholder="Client ID" style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 4 }} />
        <input placeholder="Client Secret" type="password" style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 4 }} />
      </div>
    ),
  },
};
