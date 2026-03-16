import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { SelectField } from "../SelectField";
import { withForm } from "./decorators";

const meta: Meta<typeof SelectField> = {
  title: "UI/SelectField",
  component: SelectField,
  decorators: [withForm],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SelectField>;

const countries = [
  { value: "", label: "Select a country…" },
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "jp", label: "Japan" },
];

const ControlledSelectField = (
  props: Omit<React.ComponentProps<typeof SelectField>, "onChange">
) => {
  const [, setVal] = useState(props.defaultValue ?? "");
  return <SelectField {...props} onChange={(e) => setVal(e.target.value)} />;
};

export const Default: Story = {
  render: () => (
    <ControlledSelectField
      name="country"
      label="Country"
      options={countries}
    />
  ),
};

export const Required: Story = {
  render: () => (
    <ControlledSelectField
      name="country"
      label="Country"
      required
      options={countries}
    />
  ),
};

export const WithDescription: Story = {
  render: () => (
    <ControlledSelectField
      name="country"
      label="Country"
      options={countries}
      description="Select the country where your organization is registered."
    />
  ),
};

export const WithDefaultValue: Story = {
  render: () => (
    <ControlledSelectField
      name="country"
      label="Country"
      options={countries}
      defaultValue="de"
    />
  ),
};
