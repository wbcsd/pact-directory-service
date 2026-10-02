import React, { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  CheckboxGroup,
  Flex,
  Popover,
  ScrollArea,
  Separator,
  Text,
  TextField,
} from "@radix-ui/themes";
import {
  ChevronDownIcon,
  Cross2Icon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";

export interface MultiSelectOption {
  value: number | string;
  label: string;
  description?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: (number | string)[];
  onChange: (value: (number | string)[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

/**
 * Radix Themes has no combobox, so this pairs a Popover with a CheckboxGroup
 * and a client-side filter.
 */
const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No matches",
  disabled = false,
  "aria-label": ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // CheckboxGroup only speaks strings, so map ids in and out.
  const isNumeric = options.some((o) => typeof o.value === "number");
  const selected = useMemo(() => value.map(String), [value]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(term) ||
        option.description?.toLowerCase().includes(term)
    );
  }, [options, search]);

  const selectedOptions = useMemo(
    () => options.filter((option) => selected.includes(String(option.value))),
    [options, selected]
  );

  const emit = (next: string[]) =>
    onChange(isNumeric ? next.map(Number) : next);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <Popover.Trigger>
        <Button
          type="button"
          variant="surface"
          color="gray"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Flex align="center" gap="1" wrap="wrap" style={{ minWidth: 0 }}>
            {selectedOptions.length === 0 ? (
              <Text color="gray">{placeholder}</Text>
            ) : (
              selectedOptions.map((option) => (
                <Badge key={option.value} color="indigo" variant="soft">
                  {option.label}
                </Badge>
              ))
            )}
          </Flex>
          <ChevronDownIcon />
        </Button>
      </Popover.Trigger>

      <Popover.Content width="360px" maxWidth="100%">
        <TextField.Root
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          mb="2"
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>

        <ScrollArea style={{ maxHeight: 260 }}>
          {filtered.length === 0 ? (
            <Text size="2" color="gray">
              {emptyMessage}
            </Text>
          ) : (
            <CheckboxGroup.Root value={selected} onValueChange={emit}>
              <Flex direction="column" gap="2" pr="3">
                {filtered.map((option) => (
                  <CheckboxGroup.Item
                    key={option.value}
                    value={String(option.value)}
                  >
                    <Box>
                      <Text size="2">{option.label}</Text>
                      {option.description && (
                        <Text as="p" size="1" color="gray">
                          {option.description}
                        </Text>
                      )}
                    </Box>
                  </CheckboxGroup.Item>
                ))}
              </Flex>
            </CheckboxGroup.Root>
          )}
        </ScrollArea>

        {selected.length > 0 && (
          <>
            <Separator size="4" my="2" />
            <Flex justify="between" align="center">
              <Text size="1" color="gray">
                {selected.length} selected
              </Text>
              <Button
                type="button"
                size="1"
                variant="ghost"
                color="gray"
                onClick={() => emit([])}
              >
                <Cross2Icon /> Clear all
              </Button>
            </Flex>
          </>
        )}
      </Popover.Content>
    </Popover.Root>
  );
};

export { MultiSelect };
export type { MultiSelectProps };
