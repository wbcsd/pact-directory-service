import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TextField } from "../TextField";
import { withForm } from "./decorators";

const meta: Meta<typeof TextField> = {
  title: "UI/TextField",
  component: TextField,
  decorators: [withForm],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TextField>;

/* ------------------------------------------------------------------ */
/*  We need controlled wrappers so state updates on change             */
/* ------------------------------------------------------------------ */

const ControlledTextField = (props: Omit<React.ComponentProps<typeof TextField>, "onChange">) => {
  const [value, setValue] = useState(props.value ?? "");
  return <TextField {...props} value={value} onChange={(e) => setValue(e.target.value)} />;
};

export const Default: Story = {
  render: () => (
    <ControlledTextField
      name="username"
      label="Username"
      value=""
      placeholder="Enter your username"
    />
  ),
};

export const Required: Story = {
  render: () => (
    <ControlledTextField
      name="email"
      label="Email"
      value=""
      type="email"
      required
      placeholder="you@example.com"
    />
  ),
};

export const WithTooltip: Story = {
  render: () => (
    <ControlledTextField
      name="org"
      label="Organization Name"
      value=""
      placeholder="Acme Corp"
      tooltip="The full registered/legal name of your organization."
    />
  ),
};

export const WithDescription: Story = {
  render: () => (
    <ControlledTextField
      name="apiKey"
      label="API Key"
      value=""
      placeholder="sk-…"
      description="You can find your API key in the developer settings."
    />
  ),
};

export const Password: Story = {
  render: () => (
    <ControlledTextField
      name="password"
      label="Password"
      value=""
      type="password"
      required
      minLength={6}
      placeholder="At least 6 characters"
      tooltip="Your password must be at least 6 characters long."
    />
  ),
};
