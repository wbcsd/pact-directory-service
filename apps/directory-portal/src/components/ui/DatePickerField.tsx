import React from "react";
import * as Form from "@radix-ui/react-form";
import { FormField } from "./FormField";
import { TooltipIcon } from "./TooltipIcon";
import styles from "./DatePickerField.module.css";

interface DatePickerFieldProps {
  name: string;
  label: string;
  required?: boolean;
  value: string;
  min?: string;
  max?: string;
  placeholder?: string;
  description?: React.ReactNode;
  tooltip?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const DatePickerField: React.FC<DatePickerFieldProps> = ({
  name,
  label,
  required = false,
  value,
  min,
  max,
  placeholder,
  description,
  tooltip,
  onChange,
}) => (
  <FormField name={name} label={label} required={required} description={description}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Form.Control asChild>
        <input
          type="date"
          name={name}
          value={value}
          required={required}
          min={min}
          max={max}
          placeholder={placeholder}
          onChange={onChange}
          className={styles.input}
        />
      </Form.Control>
      {tooltip && <TooltipIcon text={tooltip} />}
    </div>
  </FormField>
);

export { DatePickerField };
export type { DatePickerFieldProps };
