import type { Meta, StoryObj } from "@storybook/react";
import { FormField } from "../FormField";
import { withForm } from "./decorators";

const meta: Meta<typeof FormField> = {
  title: "UI/FormField",
  component: FormField,
  decorators: [withForm],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {
  args: {
    name: "example",
    label: "Example Field",
    children: <input placeholder="Child input goes here" style={{ width: "100%", padding: 8 }} />,
  },
};

export const Required: Story = {
  args: {
    name: "required-field",
    label: "Required Field",
    required: true,
    children: <input placeholder="This field is required" style={{ width: "100%", padding: 8 }} />,
  },
};

export const WithDescription: Story = {
  args: {
    name: "described-field",
    label: "Described Field",
    description: "This is a helpful description that appears below the label.",
    children: <input placeholder="Type something…" style={{ width: "100%", padding: 8 }} />,
  },
};

export const WithCustomErrors: Story = {
  args: {
    name: "custom-errors",
    label: "Custom Errors",
    required: true,
    customErrors: (
      <div style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>
        Custom validation error message
      </div>
    ),
    children: <input placeholder="Try submitting empty" style={{ width: "100%", padding: 8 }} />,
  },
};
