import React from "react";
import { Flex, Box } from "@radix-ui/themes";

interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode;
  subtitle?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, actions, subtitle }) => {
  return (
    <Flex className="header">
      <Box flexGrow="1">
        <h2>{title}</h2>
        {subtitle && <p style={{ margin: "5px 0 0 0", color: "#666" }}>{subtitle}</p>}
      </Box>
      {actions && 
      <Box>
        {actions}
      </Box>}
    </Flex>
  );
};

export default PageHeader;