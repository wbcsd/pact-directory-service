import React from "react";
import { Tooltip } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";

interface TooltipIconProps {
  text: string;
}

const TooltipIcon: React.FC<TooltipIconProps> = ({ text }) => (
  <Tooltip content={text} side="right" delayDuration={0}>
    <InfoCircledIcon
      width={20}
      height={20}
      color="var(--accent-12)"
      style={{ cursor: "help" }}
    />
  </Tooltip>
);

export { TooltipIcon };
