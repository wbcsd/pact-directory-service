import React from "react";
import { Flex, Box, Heading, Text } from "@radix-ui/themes";

interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode;
  subtitle?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, actions, subtitle }) => {
  return (
    <Flex className="header">
      <Box flexGrow="1">
        <Heading as="h2" mt="0">{title}</Heading>
        <Text as="p" size="3" mb="6">{subtitle}</Text>
      </Box>
      {actions && 
      <Flex gap="2">
        {actions}
      </Flex>}
    </Flex>
  );
};

export default PageHeader;