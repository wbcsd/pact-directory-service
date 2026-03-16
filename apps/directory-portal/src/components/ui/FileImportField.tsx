import React, { useRef, useState, useCallback } from "react";
import { UploadIcon, Cross2Icon } from "@radix-ui/react-icons";
import { FormField } from "./FormField";
import styles from "./FileImportField.module.css";

interface FileImportFieldProps {
  name: string;
  label: string;
  required?: boolean;
  accept?: string;
  multiple?: boolean;
  description?: React.ReactNode;
  onChange: (files: File[]) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FileImportField: React.FC<FileImportFieldProps> = ({
  name,
  label,
  required = false,
  accept,
  multiple = false,
  description,
  onChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      const next = Array.from(incoming);
      setFiles(next);
      onChange(next);
    },
    [onChange]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <FormField name={name} label={label} required={required} description={description}>
      <div
        className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon width={24} height={24} color="#71717a" />
        <span className={styles.hint}>
          Drag & drop {multiple ? "files" : "a file"} here, or{" "}
          <span className={styles.browseLink}>browse</span>
        </span>
        {accept && (
          <span style={{ fontSize: 12, color: "#a1a1aa" }}>
            Accepted: {accept}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        className={styles.hidden}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {files.map((file, idx) => (
        <div key={`${file.name}-${idx}`} className={styles.fileInfo}>
          <span className={styles.fileName}>{file.name}</span>
          <span className={styles.fileSize}>{formatSize(file.size)}</span>
          <button
            type="button"
            className={styles.removeButton}
            onClick={() => handleRemove(idx)}
            aria-label={`Remove ${file.name}`}
          >
            <Cross2Icon width={14} height={14} />
          </button>
        </div>
      ))}
    </FormField>
  );
};

export { FileImportField };
export type { FileImportFieldProps };
