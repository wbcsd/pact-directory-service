import React from "react";
import { Badge, Box, Flex, HoverCard, Text } from "@radix-ui/themes";
import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import {
  computePcfLevel,
  PcfLevelResult,
  TierStatus,
} from "../utils/pcf-level";
import { ProductFootprint } from "pact-data-model/v3_0";

type FootprintLike =
  | Partial<ProductFootprint>
  | Record<string, unknown>
  | null
  | undefined;

interface PcfLevelBadgeProps {
  /** The footprint to evaluate. Ignored when `result` is provided. */
  footprint?: FootprintLike;
  /** Pre-computed level result (avoids recomputation when already available). */
  result?: PcfLevelResult;
  size?: "1" | "2" | "3";
  /** Show the tier breakdown on hover. Defaults to true. */
  withDetails?: boolean;
}

function TierRow({ status }: { status: TierStatus }) {
  return (
    <Flex align="center" justify="between" gap="3">
      <Flex align="center" gap="2">
        {status.complete ? (
          <CheckCircledIcon color="var(--green-9)" />
        ) : (
          <CrossCircledIcon color="var(--gray-8)" />
        )}
        <Text size="2" weight={status.complete ? "medium" : "regular"}>
          Level {status.tier.level} · {status.tier.title}
        </Text>
      </Flex>
      <Text size="1" color="gray">
        {status.populatedCount}/{status.totalCount}
      </Text>
    </Flex>
  );
}

/**
 * Visual indicator for the PCF Usability Model level (1/2/3).
 * Renders a coloured badge; on hover it reveals the per-tier completion
 * breakdown and the fields still missing for the next level.
 */
const PcfLevelBadge: React.FC<PcfLevelBadgeProps> = ({
  footprint,
  result,
  size = "2",
  withDetails = true,
}) => {
  const level = result ?? computePcfLevel(footprint);

  const badge = (
    <Badge
      color={level.color}
      size={size}
      variant="soft"
      data-testid="pcf-level-badge"
      data-level={level.level}
      style={{ cursor: withDetails ? "help" : "default" }}
    >
      {level.label}
    </Badge>
  );

  if (!withDetails) return badge;

  const nextIncomplete = level.tiers.find((t) => !t.complete);

  return (
    <HoverCard.Root>
      <HoverCard.Trigger>
        <span>{badge}</span>
      </HoverCard.Trigger>
      <HoverCard.Content size="2" maxWidth="340px">
        <Flex direction="column" gap="3">
          <Box>
            <Text as="div" size="2" weight="bold">
              PCF Usability Level
            </Text>
            <Text as="div" size="1" color="gray">
              Reflects which categorised disclosure fields are populated.
            </Text>
          </Box>

          <Flex direction="column" gap="2">
            {level.tiers.map((status) => (
              <TierRow key={status.tier.key} status={status} />
            ))}
          </Flex>

          {nextIncomplete && (
            <Box>
              <Text as="div" size="1" weight="medium" mb="1">
                Missing for Level {nextIncomplete.tier.level}:
              </Text>
              <Text as="div" size="1" color="gray">
                {nextIncomplete.missingFields
                  .map((field) => field.label)
                  .join(", ")}
              </Text>
            </Box>
          )}
        </Flex>
      </HoverCard.Content>
    </HoverCard.Root>
  );
};

interface PcfLevelPanelProps {
  footprint?: FootprintLike;
  result?: PcfLevelResult;
}

/**
 * Inline panel summarising the PCF Usability Model level, intended for the
 * read-only footprint detail view. Shows the achieved level plus a checklist
 * of each tier's completion.
 */
export const PcfLevelPanel: React.FC<PcfLevelPanelProps> = ({
  footprint,
  result,
}) => {
  const level = result ?? computePcfLevel(footprint);

  return (
    <Box
      p="3"
      mb="2"
      style={{
        border: "1px solid var(--gray-4)",
        borderRadius: "var(--radius-3)",
        background: "var(--gray-1)",
      }}
    >
      <Flex align="center" justify="between" gap="3" mb="3" wrap="wrap">
        <Flex align="center" gap="2">
          <Text size="2" weight="bold">
            PCF Usability Level
          </Text>
          <PcfLevelBadge result={level} withDetails={false} />
        </Flex>
        <Text size="1" color="gray">
          Derived from which categorised disclosure fields are populated.
        </Text>
      </Flex>

      <Flex direction="column" gap="2">
        {level.tiers.map((status) => (
          <Flex key={status.tier.key} align="center" justify="between" gap="3">
            <Flex align="center" gap="2">
              {status.complete ? (
                <CheckCircledIcon color="var(--green-9)" />
              ) : (
                <CrossCircledIcon color="var(--gray-8)" />
              )}
              <Box>
                <Text as="div" size="2" weight={status.complete ? "medium" : "regular"}>
                  Level {status.tier.level} · {status.tier.title}
                </Text>
                <Text as="div" size="1" color="gray">
                  {status.tier.description}
                </Text>
              </Box>
            </Flex>
            <Text size="1" color={status.complete ? "green" : "gray"}>
              {status.populatedCount}/{status.totalCount}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
};

export default PcfLevelBadge;
