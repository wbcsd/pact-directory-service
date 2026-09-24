import React, { useState } from "react";
import { Badge, Button, Code, Flex, Text } from "@radix-ui/themes";
import { CheckIcon, CopyIcon, EyeClosedIcon, EyeOpenIcon } from "@radix-ui/react-icons";

interface CopyableValueProps {
  label: string;
  value: string;
  /** Masks the value behind a reveal toggle. Use for secrets and tokens. */
  secret?: boolean;
  /** Characters shown before truncating with an ellipsis. */
  maxLength?: number;
}

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

/**
 * Label + monospace value + copy button, with an optional reveal toggle for
 * secrets. Copy confirmation resets itself after a moment.
 */
const CopyableValue: React.FC<CopyableValueProps> = ({
  label,
  value,
  secret = false,
  maxLength = 48,
}) => {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!secret);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayed = revealed ? truncate(value, maxLength) : "•".repeat(24);

  return (
    <Flex direction="column" gap="1">
      <Text size="1" color="gray" weight="medium">
        {label}
      </Text>
      <Flex align="center" gap="2" wrap="wrap">
        <Code size="2" variant="soft" title={revealed ? value : undefined}>
          {displayed}
        </Code>
        {secret && (
          <Button
            size="1"
            variant="ghost"
            onClick={() => setRevealed((prev) => !prev)}
            aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`}
          >
            {revealed ? <EyeClosedIcon /> : <EyeOpenIcon />}
          </Button>
        )}
        <Button size="1" variant="soft" onClick={handleCopy} aria-label={`Copy ${label}`}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy"}
        </Button>
        {copied && (
          <Badge color="green" variant="soft" size="1">
            Copied to clipboard
          </Badge>
        )}
      </Flex>
    </Flex>
  );
};

export default CopyableValue;
