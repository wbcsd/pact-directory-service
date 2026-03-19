import React from "react";
import { Select as BaseSelect} from "@radix-ui/themes";

interface SelectFieldProps extends BaseSelect.RootProps {
  options: { value: string; label: string }[]
}

const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({
  name,
  value,
  required = false,
  defaultValue,
  options,
  onValueChange,
  children
  }, _ref) => (
    <BaseSelect.Root 
      name={name} 
      value={value} 
      onValueChange={onValueChange}
      defaultValue={defaultValue}
      required={required}>
      <BaseSelect.Trigger/>
      <BaseSelect.Content>
        {options.map((opt) => (
          <BaseSelect.Item key={opt.value} value={opt.value}>
            {opt.label}
          </BaseSelect.Item>
        ))} 
        { children }
      </BaseSelect.Content>
    </BaseSelect.Root>
  )
);

export { SelectField };
