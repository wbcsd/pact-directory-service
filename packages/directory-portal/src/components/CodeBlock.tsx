import React from "react";

interface CodeBlockProps {
  children: string;
  language?: "json" | "bash" | "text";
}

const formatJson = (raw: string): string => {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

const detectLanguage = (code: string): "json" | "bash" | "text" => {
  const trimmed = code.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (trimmed.startsWith("curl ")) return "bash";
  return "text";
};

const tokenizeJson = (code: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  // Match JSON strings, numbers, booleans, null, and property keys
  const regex = /("(?:\\.|[^"\\])*")\s*(:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|(true|false)|(null)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(code.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // String or key
      if (match[2]) {
        // Property key (followed by colon)
        parts.push(<span key={match.index} style={{ color: "var(--blue-11, #3b82f6)" }}>{match[1]}</span>);
        parts.push(match[2]);
      } else {
        // String value
        parts.push(<span key={match.index} style={{ color: "var(--green-11, #16a34a)" }}>{match[1]}</span>);
      }
    } else if (match[3] !== undefined) {
      // Number
      parts.push(<span key={match.index} style={{ color: "var(--orange-11, #ea580c)" }}>{match[3]}</span>);
    } else if (match[4] !== undefined) {
      // Boolean
      parts.push(<span key={match.index} style={{ color: "var(--purple-11, #9333ea)" }}>{match[4]}</span>);
    } else if (match[5] !== undefined) {
      // Null
      parts.push(<span key={match.index} style={{ color: "var(--red-11, #dc2626)" }}>{match[5]}</span>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < code.length) {
    parts.push(code.slice(lastIndex));
  }

  return parts;
};

const tokenizeBash = (code: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  // Match command name, flags, quoted strings, URLs
  const regex = /(curl)\b|(--?\w[\w-]*)|(["'](?:\\.|[^"'\\])*["'])|(https?:\/\/\S+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(code.slice(lastIndex, match.index));
    }

    if (match[1]) {
      parts.push(<span key={match.index} style={{ color: "var(--blue-11, #3b82f6)" }}>{match[1]}</span>);
    } else if (match[2]) {
      parts.push(<span key={match.index} style={{ color: "var(--orange-11, #ea580c)" }}>{match[2]}</span>);
    } else if (match[3]) {
      parts.push(<span key={match.index} style={{ color: "var(--green-11, #16a34a)" }}>{match[3]}</span>);
    } else if (match[4]) {
      parts.push(<span key={match.index} style={{ color: "var(--purple-11, #9333ea)", textDecoration: "underline" }}>{match[4]}</span>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < code.length) {
    parts.push(code.slice(lastIndex));
  }

  return parts;
};

const CodeBlock: React.FC<CodeBlockProps> = ({ children, language }) => {
  const lang = language ?? detectLanguage(children);
  const formatted = lang === "json" ? formatJson(children) : children;

  let highlighted: React.ReactNode;
  if (lang === "json") {
    highlighted = tokenizeJson(formatted);
  } else if (lang === "bash") {
    highlighted = tokenizeBash(formatted);
  } else {
    highlighted = formatted;
  }

  return (
    <pre
      style={{
        backgroundColor: "var(--gray-2, #f5f5f5)",
        fontSize: "var(--font-size-1)",
        padding: "var(--space-3, 12px)",
        borderRadius: "var(--radius-2, 6px)",
        marginTop: "20px",
        maxHeight: "300px",
        overflowY: "auto",
        overflowX: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        margin: 0,
        marginBottom: "8px",
      }}
    >
      <code>{highlighted}</code>
    </pre>
  );
};

export default CodeBlock;
