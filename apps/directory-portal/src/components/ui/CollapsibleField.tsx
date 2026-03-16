import React from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import styles from "./CollapsibleField.module.css";

interface CollapsibleFieldProps {
  label: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const CollapsibleField: React.FC<CollapsibleFieldProps> = ({
  label,
  defaultOpen = false,
  open,
  onOpenChange,
  children,
}) => (
  <Collapsible.Root
    defaultOpen={defaultOpen}
    open={open}
    onOpenChange={onOpenChange}
    style={{ marginBottom: 20 }}
  >
    <Collapsible.Trigger className={styles.trigger}>
      {label}
      <ChevronDownIcon
        width={18}
        height={18}
        className={styles.chevron}
      />
    </Collapsible.Trigger>
    <Collapsible.Content className={styles.content}>
      {children}
    </Collapsible.Content>
  </Collapsible.Root>
);

export { CollapsibleField };
export type { CollapsibleFieldProps };
