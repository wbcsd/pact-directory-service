import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { RadioGroupField } from "../RadioGroupField";
import { withForm } from "./decorators";

const meta: Meta<typeof RadioGroupField> = {
  title: "UI/RadioGroupField",
  component: RadioGroupField,
  decorators: [withForm],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof RadioGroupField>;

const nodeTypes = [
  { value: "internal", label: "Internal" },
  { value: "external", label: "External" },
];

const protocols = [
  { value: "https", label: "HTTPS" },
  { value: "mtls", label: "Mutual TLS" },
  { value: "oauth", label: "OAuth 2.0" },
];

const ControlledRadioGroup = (
  props: Omit<React.ComponentProps<typeof RadioGroupField>, "onValueChange">
) => {
  const [value, setValue] = useState(props.value);
  return (
    <RadioGroupField {...props} value={value} onValueChange={setValue} />
  );
};

export const Default: Story = {
  render: () => (
    <ControlledRadioGroup
      name="nodeType"
      label="Node Type"
      value="internal"
      options={nodeTypes}
    />
  ),
};

export const Required: Story = {
  render: () => (
    <ControlledRadioGroup
      name="protocol"
      label="Protocol"
      value=""
      required
      options={protocols}
    />
  ),
};

export const WithDescription: Story = {
  render: () => (
    <ControlledRadioGroup
      name="nodeType"
      label="Node Type"
      value="internal"
      options={nodeTypes}
      description="Internal nodes are managed by the PACT directory. External nodes connect via API."
    />
  ),
};

export const ManyOptions: Story = {
  render: () => (
    <ControlledRadioGroup
      name="region"
      label="Region"
      value="eu"
      options={[
        { value: "us", label: "US East" },
        { value: "eu", label: "EU West" },
        { value: "ap", label: "Asia Pacific" },
        { value: "sa", label: "South America" },
        { value: "af", label: "Africa" },
      ]}
    />
  ),
};
