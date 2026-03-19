import React from "react";
import * as Form from "@radix-ui/react-form";
import { Text } from "@radix-ui/themes";

interface FormFieldProps {
  name: string;
  label: string;
  required?: boolean;
  description?: React.ReactNode;
  customErrors?: React.ReactNode;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  required = false,
  description,
  customErrors,
  children,
}) => {
  const childArray = React.Children.toArray(children);
  const control = childArray.find(c => (c as React.ReactElement).props.className !== 'FormMessage');;
  const messages = childArray.filter(c => (c as React.ReactElement).props.className === 'FormMessage');
  console.warn(childArray.filter(c => (c as React.ReactElement).props.className === 'FormMessage'));

  return (
  <Form.Field name={name}>
    <Form.Label>
        {label}
        {required && <span >*</span>}
    </Form.Label>
    {description && (
      <Text as="p" size="1" color="gray" style={{ marginBottom: "1em" }}>{description}</Text>
    )}
    <Form.Control asChild>
      {control}
    </Form.Control>
    { required ? 
    <Form.Message match="valueMissing">
      {label} is required
    </Form.Message> 
    : null}
    {messages}
    {customErrors}
  </Form.Field>
  );
}

export { FormField };
export type { FormFieldProps };