import React from "react";
import * as Form from "@radix-ui/react-form";
import { Text } from "@radix-ui/themes";

interface FormFieldProps {
  name: string;
  label: string;
  required?: boolean;
  description?: React.ReactNode;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  required = false,
  description,
  children,
}) => {
  const childArray = React.Children.toArray(children);
  const control = childArray.at(0);
  const messages = childArray.slice(1);

  return (
  <Form.Field name={name} className="form-field">
    <Form.Label>
        {label}
        {required && <span >*</span>}
    </Form.Label>
    {description && (
      <Text as="p" size="1" color="gray" style={{ marginBottom: "1em" }}>{description}</Text>
    )}
    <Form.Control asChild required={required}>
      {control}
    </Form.Control>
    { required ? 
    <Form.Message match="valueMissing" className="form-error">
      {label} is required
    </Form.Message>
    : null}
    {messages.map((message, index) => (
      <Form.Message asChild className="form-error" key={index}>{message}</Form.Message>
    ))}
  </Form.Field>
  );
}

export { FormField };
export type { FormFieldProps };