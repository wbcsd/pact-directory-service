import { Box, Button, Flex, IconButton, Text, TextField } from "@radix-ui/themes";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { EmissionFactorSource } from "pact-data-model/v3_0";

interface EmissionFactorSourcesInputProps {
  value: EmissionFactorSource[];
  onChange: (value: EmissionFactorSource[]) => void;
  disabled?: boolean;
}

/**
 * Repeatable editor for `CarbonFootprint.secondaryEmissionFactorSources`, an
 * array of `{ name, version }` pairs referencing secondary emission-factor
 * databases (e.g. ecoinvent 3.9.1). In read-only mode the sources are rendered
 * as plain text.
 */
export function EmissionFactorSourcesInput({
  value,
  onChange,
  disabled = false,
}: EmissionFactorSourcesInputProps) {
  const rows = value ?? [];

  const updateRow = (index: number, patch: Partial<EmissionFactorSource>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => onChange([...rows, { name: "", version: "" }]);

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  if (disabled) {
    if (rows.length === 0) {
      return (
        <Text size="2" color="gray">
          —
        </Text>
      );
    }
    return (
      <Flex direction="column" gap="1">
        {rows.map((row, i) => (
          <Text key={i} size="2">
            {row.name || "—"}
            {row.version ? ` · v${row.version}` : ""}
          </Text>
        ))}
      </Flex>
    );
  }

  return (
    <Box>
      {rows.length > 0 && (
        <Flex direction="column" gap="2" mb="2">
          {rows.map((row, i) => (
            <Flex key={i} gap="2" align="center">
              <Box style={{ flex: 2 }}>
                <TextField.Root
                  placeholder="Database name (e.g. ecoinvent)"
                  value={row.name}
                  onChange={(e) => updateRow(i, { name: e.target.value })}
                />
              </Box>
              <Box style={{ flex: 1 }}>
                <TextField.Root
                  placeholder="Version (e.g. 3.9.1)"
                  value={row.version}
                  onChange={(e) => updateRow(i, { version: e.target.value })}
                />
              </Box>
              <IconButton
                type="button"
                variant="soft"
                color="red"
                aria-label="Remove source"
                onClick={() => removeRow(i)}
              >
                <TrashIcon />
              </IconButton>
            </Flex>
          ))}
        </Flex>
      )}
      <Button type="button" variant="soft" size="1" onClick={addRow}>
        <PlusIcon /> Add source
      </Button>
    </Box>
  );
}
