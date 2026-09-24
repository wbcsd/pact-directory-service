import React from "react";
import { Badge, Button, Callout, Card, Flex, Separator, Text } from "@radix-ui/themes";
import { CheckCircledIcon, InfoCircledIcon, MagicWandIcon } from "@radix-ui/react-icons";
import RegistrationStepList from "./RegistrationStepList";
import { useConnectionRegistration } from "../../hooks/useConnectionRegistration";

interface ConnectionRegistrationFlowProps {
  targetNodeId: number;
  targetNodeName: string;
}

/**
 * Obtains credentials from a directory-hosted node via RFC 7591 instead of the
 * issue-and-copy handover. Only offered for internal targets — external nodes
 * are third-party systems with no registration endpoint to call.
 */
const ConnectionRegistrationFlow: React.FC<ConnectionRegistrationFlowProps> = ({
  targetNodeId,
  targetNodeName,
}) => {
  const { steps, running, outcome, register, reset } = useConnectionRegistration(
    targetNodeId,
    targetNodeName
  );

  const hasStarted = steps.some((step) => step.status !== "idle");

  return (
    <Card size="2" mb="4">
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Flex align="center" gap="2">
            <MagicWandIcon />
            <Text weight="bold" size="3">
              Credentials
            </Text>
            {outcome && (
              <Badge color="green" variant="soft">
                Issued automatically
              </Badge>
            )}
          </Flex>
          {hasStarted && !outcome && (
            <Button size="1" variant="soft" color="gray" onClick={reset} disabled={running}>
              Start over
            </Button>
          )}
        </Flex>

        {!hasStarted && (
          <Callout.Root variant="soft" size="1">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              <strong>{targetNodeName}</strong> is hosted by the directory, so this node can
              register with it directly and be issued credentials — no secret is shown, copied or
              emailed.
            </Callout.Text>
          </Callout.Root>
        )}

        {hasStarted && (
          <>
            <Separator size="4" />
            <RegistrationStepList steps={steps} />
          </>
        )}

        {outcome && (
          <Callout.Root color="green" size="1">
            <Callout.Icon>
              <CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Credentials issued and verified against {targetNodeName}.
            </Callout.Text>
          </Callout.Root>
        )}

        {!outcome && (
          <Flex>
            <Button type="button" onClick={() => void register()} loading={running} disabled={running}>
              {hasStarted ? "Try again" : "Get credentials automatically"}
            </Button>
          </Flex>
        )}
      </Flex>
    </Card>
  );
};

export default ConnectionRegistrationFlow;
