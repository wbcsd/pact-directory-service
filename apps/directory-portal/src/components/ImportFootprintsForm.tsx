// SIMPLE
import React, { useRef, useState } from "react";
import {
  Box,
  Button,
  Callout,
  Flex,
  Spinner,
  Text,
} from "@radix-ui/themes";
import {
  CheckCircledIcon,
  ExclamationTriangleIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import "./NodeForm.css";

interface ImportError {
  index: number;
  errors: string[];
}

interface ImportResult {
  imported: number;
  failed: number;
  errors: ImportError[];
}

interface ImportFootprintsFormProps {
  nodeId: number;
  onCancel: () => void;
  onImported: () => void;
}

const ImportFootprintsForm: React.FC<ImportFootprintsFormProps> = ({
  nodeId,
  onCancel,
  onImported,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<unknown[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);
    setParsedItems(null);
    setResult(null);
    setSubmitError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        const items = Array.isArray(json) ? json : json?.data ?? json?.footprints;
        if (!Array.isArray(items)) {
          setParseError(
            "JSON must be an array of footprint objects, or an object with a \"data\" or \"footprints\" array."
          );
          return;
        }
        setParsedItems(items);
      } catch {
        setParseError("Invalid JSON file. Please upload a valid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedItems) return;

    setSubmitting(true);
    setSubmitError(null);
    setResult(null);

    try {
      const response = await fetchWithAuth(
        `/nodes/${nodeId}/footprints/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedItems),
        }
      );

      const data = await response?.json();

      if (!response?.ok && !data?.imported) {
        setSubmitError(data?.message ?? "Import failed. Please try again.");
        return;
      }

      setResult(data as ImportResult);

      if (data.imported > 0) {
        onImported();
      }
    } catch {
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box className="node-form">
        <Text as="p" size="2" color="gray" mb="4">
          Upload a JSON file containing PACT-conformant Product Carbon Footprint
          records. The file should be an array of PCF objects (or an object with
          a <code>data</code> or <code>footprints</code> array). Each record is
          validated against the PACT v3.0 schema before import.
        </Text>

        {/* File picker */}
        <Box mb="4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <Flex gap="3" align="center">
            <Button
              type="button"
              variant="soft"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon /> Choose JSON file
            </Button>
            {fileName && (
              <Text size="2" color="gray">
                {fileName}
              </Text>
            )}
          </Flex>
        </Box>

        {/* Parse error */}
        {parseError && (
          <Callout.Root color="red" mb="4">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{parseError}</Callout.Text>
          </Callout.Root>
        )}

        {/* Preview count */}
        {parsedItems && !parseError && (
          <Callout.Root color="blue" mb="4">
            <Callout.Icon>
              <CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              {parsedItems.length} footprint record
              {parsedItems.length !== 1 ? "s" : ""} ready to import.
            </Callout.Text>
          </Callout.Root>
        )}

        {/* Submit error */}
        {submitError && (
          <Callout.Root color="red" mb="4">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{submitError}</Callout.Text>
          </Callout.Root>
        )}

        {/* Import result */}
        {result && (
          <Box mb="4">
            {result.imported > 0 && (
              <Callout.Root color="green" mb="2">
                <Callout.Icon>
                  <CheckCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  Successfully imported {result.imported} record
                  {result.imported !== 1 ? "s" : ""}.
                </Callout.Text>
              </Callout.Root>
            )}
            {result.failed > 0 && (
              <Callout.Root color="orange" mb="2">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>
                  {result.failed} record{result.failed !== 1 ? "s" : ""} failed
                  validation:
                  <Box mt="2">
                    {result.errors.map((err) => (
                      <Box key={err.index} mb="1">
                        <Text size="1" weight="bold">
                          Record #{err.index + 1}:
                        </Text>{" "}
                        <Text size="1">{err.errors.join("; ")}</Text>
                      </Box>
                    ))}
                  </Box>
                </Callout.Text>
              </Callout.Root>
            )}
          </Box>
        )}

        {/* Actions */}
        <Flex gap="3" justify="end" mt="4">
          <Button type="button" variant="soft" color="gray" onClick={onCancel}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button
              type="submit"
              disabled={!parsedItems || submitting}
            >
              {submitting ? <Spinner /> : <UploadIcon />}
              Import
            </Button>
          )}
        </Flex>
      </Box>
    </form>
  );
};

export default ImportFootprintsForm;
