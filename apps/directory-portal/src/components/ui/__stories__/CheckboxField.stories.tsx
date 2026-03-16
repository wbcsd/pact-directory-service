import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CheckboxField } from "../CheckboxField";

const meta: Meta<typeof CheckboxField> = {
  title: "UI/CheckboxField",
  component: CheckboxField,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CheckboxField>;

const ControlledCheckbox = (
  props: Omit<React.ComponentProps<typeof CheckboxField>, "onCheckedChange">
) => {
  const [checked, setChecked] = useState(props.checked);
  return (
    <CheckboxField {...props} checked={checked} onCheckedChange={setChecked} />
  );
};

export const Default: Story = {
  render: () => (
    <ControlledCheckbox
      name="terms"
      label="I agree to the Terms of Service"
      checked={false}
    />
  ),
};

export const Checked: Story = {
  render: () => (
    <ControlledCheckbox
      name="newsletter"
      label="Subscribe to newsletter"
      checked={true}
    />
  ),
};

export const WithDescription: Story = {
  render: () => (
    <ControlledCheckbox
      name="notifications"
      label="Enable email notifications"
      checked={false}
      description="You'll receive an email when someone invites you to connect."
    />
  ),
};

export const Disabled: Story = {
  render: () => (
    <ControlledCheckbox
      name="locked"
      label="This option is locked"
      checked={true}
      disabled
    />
  ),
};
