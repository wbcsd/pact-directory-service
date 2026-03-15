import React from "react";
import * as Form from "@radix-ui/react-form";
import { FormField } from "./FormField";
import styles from "./SelectField.module.css";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  options: SelectOption[];
  description?: React.ReactNode;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const SelectField: React.FC<SelectFieldProps> = ({
  name,
  label,
  required = false,
  defaultValue,
  options,
  description,
  onChange,
}) => (
  <FormField name={name} label={label} required={required} description={description}>
    <Form.Control asChild>
      <select
        name={name}
        onChange={onChange}
        required={required}
        defaultValue={defaultValue}
        className={styles.select}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </Form.Control>
  </FormField>
);

export { SelectField };
