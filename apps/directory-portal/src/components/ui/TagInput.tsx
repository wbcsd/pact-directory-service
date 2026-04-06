import { useRef, useState, KeyboardEvent, ClipboardEvent } from "react";
import { Badge, Text, Box } from "@radix-ui/themes";
import { Cross2Icon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import "./TagInput.css";

const URN_REGEX = /^urn:[a-z0-9][a-z0-9-]{0,31}:[a-z0-9()+,\-.:=@;$_!*'%/?#]+$/i;

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  validate?: (urn: string) => boolean;
  placeholder?: string;
  disabled?: boolean;
}

interface Tag {
  value: string;
  valid: boolean;
}

export function TagInput({
  value,
  onChange,
  validate = (v) => URN_REGEX.test(v),
  placeholder = "urn:li:company:…",
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const tags: Tag[] = value.map((v) => ({ value: v, valid: validate(v) }));
  const hasInvalid = tags.some((t) => !t.valid);

  function commit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    // Avoid duplicates
    if (!value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue("");
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "Tab") {
      if (inputValue.trim()) {
        e.preventDefault();
        commit(inputValue);
      }
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    // Split on newlines, commas, or whitespace to bulk-add URNs
    const items = text.split(/[\n,\s]+/).map((s) => s.trim()).filter(Boolean);
    if (items.length > 1) {
      e.preventDefault();
      const next = [...value];
      for (const item of items) {
        if (!next.includes(item)) next.push(item);
      }
      onChange(next);
      setInputValue("");
    }
  }

  return (
    <Box>
      <div
        className={[
          "tag-input-wrap",
          disabled ? "tag-input-wrap--disabled" : "",
          hasInvalid ? "tag-input-wrap--invalid" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <Badge
            key={i}
            color={tag.valid ? "blue" : "red"}
            variant="soft"
            radius="full"
            className="tag-input-badge"
            title={tag.valid ? tag.value : `Invalid URN: ${tag.value}`}
          >
            <span className="tag-input-badge-text">{tag.value}</span>
            {!tag.valid && (
              <ExclamationTriangleIcon width={12} height={12} style={{ flexShrink: 0 }} />
            )}
            {!disabled && (
              <button
                type="button"
                className="tag-input-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
                aria-label={`Remove ${tag.value}`}
              >
                <Cross2Icon width={11} height={11} />
              </button>
            )}
          </Badge>
        ))}

        <input
          ref={inputRef}
          className="tag-input-field"
          value={inputValue}
          placeholder={tags.length === 0 ? placeholder : ""}
          disabled={disabled}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(inputValue)}
          onPaste={handlePaste}
          aria-label="Add company ID"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
        />
      </div>

      <Text as="p" size="1" color="gray" mt="1">
        Press{" "}
        <kbd className="tag-input-kbd">Enter</kbd> or{" "}
        <kbd className="tag-input-kbd">Tab</kbd> to add ·{" "}
        <kbd className="tag-input-kbd">Backspace</kbd> on empty input removes last ·
        paste multiple URNs separated by commas or newlines
      </Text>

      {hasInvalid && (
        <Text as="p" size="1" color="red" mt="1">
          Some values don't match the URN format and will be highlighted. Fix or remove them before saving.
        </Text>
      )}
    </Box>
  );
}