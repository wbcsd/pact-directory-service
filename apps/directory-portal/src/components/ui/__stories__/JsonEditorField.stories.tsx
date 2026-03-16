import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { JsonEditorField } from "../JsonEditorField";
import { withForm } from "./decorators";

const meta: Meta<typeof JsonEditorField> = {
  title: "UI/JsonEditorField",
  component: JsonEditorField,
  decorators: [withForm],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof JsonEditorField>;

const sampleJson = JSON.stringify(
  {
    specversion: "2.3.0",
    id: "urn:example:footprint:123",
    companyName: "Acme Corp",
    productIds: ["urn:gtin:1234567890"],
    pcf: {
      declaredUnit: "kilogram",
      unitaryProductAmount: "1.0",
      fossilGhgEmissions: "0.5",
    },
  },
  null,
  2
);

const ControlledJsonEditor = (
  props: Omit<React.ComponentProps<typeof JsonEditorField>, "onChange"> & { value: string }
) => {
  const [value, setValue] = useState(props.value);
  return <JsonEditorField {...props} value={value} onChange={setValue} />;
};

export const Default: Story = {
  render: () => (
    <ControlledJsonEditor
      name="payload"
      label="JSON Payload"
      value=""
      description="Enter a valid JSON document."
    />
  ),
};

export const WithContent: Story = {
  render: () => (
    <ControlledJsonEditor
      name="footprint"
      label="Product Footprint"
      value={sampleJson}
    />
  ),
};

export const Required: Story = {
  render: () => (
    <ControlledJsonEditor
      name="config"
      label="Configuration"
      value=""
      required
    />
  ),
};

export const InvalidJson: Story = {
  render: () => (
    <ControlledJsonEditor
      name="broken"
      label="Broken JSON"
      value='{ "key": value }'
      description="This JSON is intentionally invalid — click Format to see the validation."
    />
  ),
};

export const CustomHeight: Story = {
  render: () => (
    <ControlledJsonEditor
      name="large"
      label="Large Editor"
      value={sampleJson}
      minHeight={400}
    />
  ),
};
