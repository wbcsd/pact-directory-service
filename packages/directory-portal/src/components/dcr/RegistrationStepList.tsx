import React, { useState } from "react";
import { Badge, Box, Button, Callout, Card, Code, Flex, Spinner, Text } from "@radix-ui/themes";
import {
  CheckCircledIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import CodeBlock from "../CodeBlock";
import { StepStatus, WalkthroughStep } from "../../types/dcr";

interface RegistrationStepListProps {
  steps: WalkthroughStep[];
}

const statusBadge: Record<StepStatus, { label: string; color: "gray" | "blue" | "green" | "red" }> =
  {
    idle: { label: "Waiting", color: "gray" },
    running: { label: "In progress", color: "blue" },
    done: { label: "Done", color: "green" },
    error: { label: "Failed", color: "red" },
  };

const StatusIcon: React.FC<{ status: StepStatus }> = ({ status }) => {
  if (status === "running") return <Spinner size="2" />;
  if (status === "done") return <CheckCircledIcon color="var(--green-9)" width="20" height="20" />;
  if (status === "error") return <CrossCircledIcon color="var(--red-9)" width="20" height="20" />;
  return <Box width="20px" height="20px" />;
};

const StepRow: React.FC<{ step: WalkthroughStep; index: number }> = ({ step, index }) => {
  const [expanded, setExpanded] = useState(false);
  const badge = statusBadge[step.status];
  const hasPayload = Boolean(step.requestPayload || step.responsePayload);

  return (
    <Card
      variant={step.status === "idle" ? "surface" : "classic"}
      data-testid={`dcr-step-${step.id}`}
      data-status={step.status}
    >
      <Flex gap="3" align="start">
        <Flex direction="column" align="center" gap="2" pt="1">
          <Badge
            radius="full"
            color={badge.color}
            variant={step.status === "idle" ? "soft" : "solid"}
            size="2"
          >
            {index + 1}
          </Badge>
          <StatusIcon status={step.status} />
        </Flex>

        <Flex direction="column" gap="2" flexGrow="1">
          <Flex align="center" justify="between" gap="3" wrap="wrap">
            <Text weight="bold" size="3" color={step.status === "idle" ? "gray" : undefined}>
              {step.title}
            </Text>
            <Badge color={badge.color} variant="soft">
              {badge.label}
            </Badge>
          </Flex>

          <Text size="2" color="gray">
            {step.description}
          </Text>

          <Code size="1" variant="ghost" color="gray">
            {step.request}
          </Code>

          {step.status === "error" && step.errorMessage && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{step.errorMessage}</Callout.Text>
            </Callout.Root>
          )}

          {hasPayload && (
            <Box>
              <Button
                size="1"
                variant="ghost"
                onClick={() => setExpanded((prev) => !prev)}
                aria-expanded={expanded}
              >
                {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                {expanded ? "Hide" : "Show"} payload
              </Button>
            </Box>
          )}

          {expanded && step.requestPayload && (
            <Box>
              <Text size="1" color="gray" weight="medium">
                Request body
              </Text>
              <CodeBlock language="json">{step.requestPayload}</CodeBlock>
            </Box>
          )}

          {expanded && step.responsePayload && (
            <Box>
              <Text size="1" color="gray" weight="medium">
                Response
              </Text>
              <CodeBlock language="json">{step.responsePayload}</CodeBlock>
            </Box>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};

/**
 * Renders the registration handshake as a vertical list of steps. Purely
 * presentational — progress is driven entirely by the `status` on each step.
 */
const RegistrationStepList: React.FC<RegistrationStepListProps> = ({ steps }) => (
  <Flex direction="column" gap="2">
    {steps.map((step, index) => (
      <StepRow key={step.id} step={step} index={index} />
    ))}
  </Flex>
);

export default RegistrationStepList;
