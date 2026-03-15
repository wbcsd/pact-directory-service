import React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import styles from "./TooltipIcon.module.css";

interface TooltipIconProps {
  text: string;
}

const TooltipIcon: React.FC<TooltipIconProps> = ({ text }) => (
  <Tooltip.Provider delayDuration={0}>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <InfoCircledIcon
          width={20}
          height={20}
          color="#0A0552"
          className={styles.icon}
        />
      </Tooltip.Trigger>
      <Tooltip.Content
        className={styles.content}
        side="right"
        align="center"
        sideOffset={5}
      >
        {text}
      </Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>
);

export { TooltipIcon };
