import React from "react";
import * as Checkbox from "@radix-ui/react-checkbox";
import { CheckIcon } from "@radix-ui/react-icons";
import styles from "./CheckboxField.module.css";

interface CheckboxFieldProps {
  name: string;
  label: string;
  checked: boolean;
  description?: React.ReactNode;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const CheckboxField: React.FC<CheckboxFieldProps> = ({
  name,
  label,
  checked,
  description,
  disabled = false,
  onCheckedChange,
}) => (
  <div style={{ marginBottom: 20 }}>
    <div className={styles.wrapper}>
      <Checkbox.Root
        id={name}
        name={name}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(val) => onCheckedChange(val === true)}
        className={styles.checkbox}
      >
        <Checkbox.Indicator className={styles.indicator}>
          <CheckIcon width={14} height={14} />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <label htmlFor={name} className={styles.label}>
        {label}
      </label>
    </div>
    {description && (
      <div style={{ marginTop: 4, marginLeft: 28, color: "#888", fontSize: 13 }}>
        {description}
      </div>
    )}
  </div>
);

export { CheckboxField };
export type { CheckboxFieldProps };
