import React from "react";
import * as Form from "@radix-ui/react-form";

/**
 * Decorator that wraps stories in a Radix Form.Root.
 * Required for components that use Form.Field / Form.Control internally.
 */
export const withForm = (Story: React.FC) => (
  <Form.Root onSubmit={(e) => e.preventDefault()}>
    <Story />
  </Form.Root>
);
