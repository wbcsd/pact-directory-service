
import React, { useRef, useState, useCallback } from "react";
import {
  Box,
  Button,
  Callout,
  Flex,
  Spinner,
  Text,
  TextField,
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
  const [dragging, setDragging] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [loadingUrl, setLoadingUrl] = useState(false);

  const resetState = useCallback(() => {
    setParseError(null);
    setParsedItems(null);
    setResult(null);
    setSubmitError(null);
  }, []);

  const parseJson = useCallback((text: string, source: string) => {
    try {
      const json = JSON.parse(text);
      const items = Array.isArray(json) ? json : json?.data ?? json?.footprints;
      if (!Array.isArray(items)) {
        setParseError(
          "JSON must be an array of footprint objects, or an object with a \"data\" or \"footprints\" array."
        );
        return;
      }
      setParsedItems(items);
      setFileName(source);
    } catch {
      setParseError("Invalid JSON. Please provide a valid JSON file or URL.");
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    resetState();
    const reader = new FileReader();
    reader.onload = (event) => {
      parseJson(event.target?.result as string, file.name);
    };
    reader.readAsText(file);
  }, [resetState, parseJson]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
      return;
    }
    const text = e.dataTransfer.getData("text/plain");
    if (text) {
      setUrlValue(text);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleLoadUrl = useCallback(async (url?: string) => {
    const trimmed = (url ?? urlValue).trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setParseError("Please enter a valid URL.");
      return;
    }

    resetState();
    setLoadingUrl(true);
    try {
      const response = await fetch(trimmed);
      if (!response.ok) {
        setParseError(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        return;
      }
      const text = await response.text();
      parseJson(text, trimmed);
    } catch {
      setParseError("Failed to fetch the URL. Check the URL and try again.");
    } finally {
      setLoadingUrl(false);
    }
  }, [urlValue, resetState, parseJson]);

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
          Drop a JSON file or paste a URL containing PACT-conformant Product
          Carbon Footprint records. The source should be an array of PCF objects
          (or an object with a <code>data</code> or <code>footprints</code>{" "}
          array). Each record is validated against the PACT v3.0 schema before
          import.
        </Text>

        {/* Drop area + URL input */}
        <Box mb="4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <Box
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "var(--accent-9)" : "var(--gray-6)"}`,
              borderRadius: "var(--radius-2)",
              padding: "var(--space-5)",
              textAlign: "center",
              cursor: "pointer",
              background: dragging ? "var(--accent-2)" : "var(--gray-2)",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <UploadIcon width="24" height="24" style={{ marginBottom: 4, color: "var(--gray-9)" }} />
            <Text as="p" size="2" color="gray">
              {fileName
                ? fileName
                : "Drag & drop a JSON file here, or click to browse"}
            </Text>
          </Box>

          <Flex gap="2" align="center" mt="3">
            <Box style={{ flex: 1 }}>
              <TextField.Root
                placeholder="Or paste a URL to a JSON file…"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLoadUrl();
                  }
                }}
              />
            </Box>
            <Button
              type="button"
              variant="soft"
              disabled={!urlValue.trim() || loadingUrl}
              onClick={() => handleLoadUrl()}
            >
              {loadingUrl ? <Spinner /> : "Load"}
            </Button>
          </Flex>

          {/* Sample data sets */}
          <Box mt="3">
            <Text as="p" size="2" color="gray" mb="2">
              Or load a sample data set:
            </Text>
            <Flex gap="2" wrap="wrap">
              {[
                { label: "Electronics", url: "https://raw.githubusercontent.com/wbcsd/pact-directory-service/refs/heads/feat/251-sample-data-sets/packages/pact-data-model/samples/electronics_sample.json" },
                { label: "Cosmetics", url: "https://raw.githubusercontent.com/wbcsd/pact-directory-service/refs/heads/feat/251-sample-data-sets/packages/pact-data-model/samples/cosmetics_sample.json" },
                { label: "Textile", url: "https://raw.githubusercontent.com/wbcsd/pact-directory-service/refs/heads/feat/251-sample-data-sets/packages/pact-data-model/samples/textile_sample.json" },
              ].map((sample) => (
                <Button
                  key={sample.label}
                  type="button"
                  variant="outline"
                  size="1"
                  disabled={loadingUrl}
                  onClick={() => handleLoadUrl(sample.url)}
                >
                  {sample.label}
                </Button>
              ))}
            </Flex>
          </Box>
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
