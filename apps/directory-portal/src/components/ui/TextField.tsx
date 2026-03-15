import React from "react";
import * as Form from "@radix-ui/react-form";
import { TextField as RadixTextField } from "@radix-ui/themes";
import { FormField } from "./FormField";
import { TooltipIcon } from "./TooltipIcon";
import styles from "./TextField.module.css";

type InputType =
  | "text" | "email" | "password" | "number" | "search"
  | "tel" | "url" | "date" | "datetime-local" | "month"
  | "time" | "week" | "hidden";

interface TextFieldProps {
  name: string;
  label: string;
  required?: boolean;
  value: string;
  type?: InputType;
  placeholder?: string;
  description?: React.ReactNode;
  tooltip?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TextField: React.FC<TextFieldProps> = ({
  name,
  label,
  required = false,
  value,
  type,
  placeholder,
  description,
  tooltip,
  onChange,
}) => (
  <FormField name={name} label={label} required={required} description={description}>
    <Form.Control asChild>
      <RadixTextField.Root
        name={name}
        value={value}
        type={type}
        required={required}
        placeholder={placeholder}
        onChange={onChange}
        className={styles.input}
      >
        {tooltip && (
          <RadixTextField.Slot side="right">
            <TooltipIcon text={tooltip} />
          </RadixTextField.Slot>
        )}
      </RadixTextField.Root>
    </Form.Control>
  </FormField>
);

export { TextField };
export type { TextFieldProps };
