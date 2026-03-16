import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DatePickerField } from "../DatePickerField";
import { withForm } from "./decorators";

const meta: Meta<typeof DatePickerField> = {
  title: "UI/DatePickerField",
  component: DatePickerField,
  decorators: [withForm],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DatePickerField>;

const ControlledDatePicker = (
  props: Omit<React.ComponentProps<typeof DatePickerField>, "onChange">
) => {
  const [value, setValue] = useState(props.value ?? "");
  return (
    <DatePickerField
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
};

export const Default: Story = {
  render: () => (
    <ControlledDatePicker name="startDate" label="Start Date" value="" />
  ),
};

export const Required: Story = {
  render: () => (
    <ControlledDatePicker
      name="deadline"
      label="Deadline"
      value=""
      required
    />
  ),
};

export const WithMinMax: Story = {
  render: () => (
    <ControlledDatePicker
      name="appointment"
      label="Appointment"
      value=""
      min="2026-01-01"
      max="2026-12-31"
      description="Select a date in 2026."
    />
  ),
};

export const WithTooltip: Story = {
  render: () => (
    <ControlledDatePicker
      name="expiresAt"
      label="Expiration Date"
      value=""
      tooltip="The date when this credential will expire."
    />
  ),
};

export const Prefilled: Story = {
  render: () => (
    <ControlledDatePicker
      name="birthDate"
      label="Birth Date"
      value="1990-06-15"
    />
  ),
};
