import type { ExportFormat } from "@/types/cards";

/** Result returned by every export formatter. */
export interface ExportResult {
  /** File content as string (CSV/Markdown/JSON) or ArrayBuffer (APKG). */
  content: string | ArrayBuffer;
  /** MIME type for the download. */
  mimeType: string;
  /** Suggested filename including extension. */
  filename: string;
}

/** An option field rendered dynamically in the Export page options panel. */
export interface ExportOptionField {
  key: string;
  label: string;
  type: "text" | "boolean" | "select";
  defaultValue: string | boolean;
  /** Only for type "select" — available choices. */
  choices?: { value: string; label: string }[];
}

/** Configuration for a single export format, used in the format registry. */
export interface ExportFormatConfig {
  id: ExportFormat;
  label: string;
  description: string;
  extension: string;
  icon: string;
  options: ExportOptionField[];
}
