import React, { useState, useCallback } from "react";
import { FormField } from "./FormField";
import styles from "./JsonEditorField.module.css";

interface JsonEditorFieldProps {
  name: string;
  label: string;
  required?: boolean;
  value: string;
  description?: React.ReactNode;
  minHeight?: number;
  onChange: (value: string) => void;
}

const JsonEditorField: React.FC<JsonEditorFieldProps> = ({
  name,
  label,
  required = false,
  value,
  description,
  minHeight = 200,
  onChange,
}) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const validate = useCallback(
    (text: string) => {
      if (!text.trim()) {
        setIsValid(null);
        return;
      }
      try {
        JSON.parse(text);
        setIsValid(true);
      } catch {
        setIsValid(false);
      }
    },
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    onChange(next);
    validate(next);
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
      setIsValid(true);
    } catch {
      setIsValid(false);
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(value);
      const minified = JSON.stringify(parsed);
      onChange(minified);
      setIsValid(true);
    } catch {
      setIsValid(false);
    }
  };

  return (
    <FormField name={name} label={label} required={required} description={description}>
      <textarea
        name={name}
        value={value}
        required={required}
        onChange={handleChange}
        spellCheck={false}
        className={styles.textarea}
        style={{ minHeight }}
      />
      <div className={styles.toolbar}>
        {isValid === true && <span className={styles.validBadge}>✓ Valid JSON</span>}
        {isValid === false && <span className={styles.invalidBadge}>✗ Invalid JSON</span>}
        <button type="button" onClick={handleFormat} className={styles.toolbarButton}>
          Format
        </button>
        <button type="button" onClick={handleMinify} className={styles.toolbarButton}>
          Minify
        </button>
      </div>
    </FormField>
  );
};

export { JsonEditorField };
export type { JsonEditorFieldProps };
