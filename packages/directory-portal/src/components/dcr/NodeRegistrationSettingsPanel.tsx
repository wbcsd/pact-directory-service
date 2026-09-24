import React from "react";
import { Callout, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import CopyableValue from "../CopyableValue";
import { RegistrationSettings } from "../../types/dcr";

interface NodeRegistrationSettingsPanelProps {
  settings: RegistrationSettings | null;
}

const NodeRegistrationSettingsPanel: React.FC<NodeRegistrationSettingsPanelProps> = ({
  settings,
}) => (
  <Card size="3">
    <Flex direction="column" gap="4">
      <Flex direction="column" gap="1">
        <Heading size="4">Registration endpoint</Heading>
        <Text size="2" color="gray">
          Where other nodes register to obtain credentials for this one.
        </Text>
      </Flex>

      <Callout.Root color="blue" size="1">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          Share these two URLs with a partner node. Everything else — the token endpoint, the
          supported grant types, the credentials themselves — is discovered and issued
          automatically.
        </Callout.Text>
      </Callout.Root>

      {settings && (
        <Flex direction="column" gap="3">
          <CopyableValue label="Registration endpoint" value={settings.registrationEndpoint} />
          <CopyableValue label="Discovery document" value={settings.discoveryEndpoint} />
        </Flex>
      )}
    </Flex>
  </Card>
);

export default NodeRegistrationSettingsPanel;
