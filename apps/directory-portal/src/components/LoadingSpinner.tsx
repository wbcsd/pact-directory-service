import React from "react";
import { Flex, Spinner as RadixSpinner, Text } from "@radix-ui/themes";

interface LoadingSpinnerProps {
  loadingText?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  loadingText = "Loading data...",
}) => {
  return (
    <Flex direction="column" align="center" justify="center" gap="3">
      <RadixSpinner size="3" />
      <Text size="2">
        {loadingText}
      </Text>
    </Flex>
  );
};

export default LoadingSpinner;
