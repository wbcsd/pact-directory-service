import React from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { FormField } from "./FormField";
import styles from "./RadioGroupField.module.css";

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupFieldProps {
  name: string;
  label: string;
  required?: boolean;
  value: string;
  options: RadioOption[];
  description?: React.ReactNode;
  onValueChange: (value: string) => void;
}

const RadioGroupField: React.FC<RadioGroupFieldProps> = ({
  name,
  label,
  required = false,
  value,
  options,
  description,
  onValueChange,
}) => (
  <FormField name={name} label={label} required={required} description={description}>
    <RadioGroup.Root
      name={name}
      value={value}
      onValueChange={onValueChange}
      className={styles.group}
    >
      {options.map((opt) => (
        <div key={opt.value} className={styles.item}>
          <RadioGroup.Item
            id={`${name}-${opt.value}`}
            value={opt.value}
            className={styles.radio}
          >
            <RadioGroup.Indicator className={styles.indicator} />
          </RadioGroup.Item>
          <label htmlFor={`${name}-${opt.value}`} className={styles.label}>
            {opt.label}
          </label>
        </div>
      ))}
    </RadioGroup.Root>
  </FormField>
);

export { RadioGroupField };
export type { RadioGroupFieldProps, RadioOption };
