import React from "react";
import * as Form from "@radix-ui/react-form";
import { Text } from "@radix-ui/themes";
import styles from "./FormField.module.css";

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
}) => (
  <Form.Field name={name} className={styles.field}>
    <Form.Label className={styles.label}>
      {label}
      {required && <span className={styles.required}>*</span>}
    </Form.Label>
    {description && (
      <div className={styles.description}>
        <Text size="1">{description}</Text>
      </div>
    )}
    {children}
    <Form.Message match="valueMissing" className={styles.error}>
      {label} is required
    </Form.Message>
    {customErrors}
  </Form.Field>
);

export { FormField };
export type { FormFieldProps };