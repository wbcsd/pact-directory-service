import React from "react";
import { TextField as BaseTextField } from "@radix-ui/themes";
import { TooltipIcon } from "./TooltipIcon";

type InputType =
  | "text" | "email" | "password" | "number" | "search"
  | "tel" | "url" | "date" | "datetime-local" | "month"
  | "time" | "week" | "hidden";

interface TextFieldProps {
  name?: string;
  required?: boolean;
  value: string;
  type?: InputType;
  placeholder?: string;
  tooltip?: string;
  minLength?: number;
  disabled?: boolean;
  readOnly?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ tooltip, ...rest }, ref) => (
      <BaseTextField.Root radius="large"
        ref={ref}
        {...rest}
      >
        {tooltip && (
          <BaseTextField.Slot side="right">
            <TooltipIcon text={tooltip} />
          </BaseTextField.Slot>
        )}
      </BaseTextField.Root>
  )
);

export { TextField };
export type { TextFieldProps };
