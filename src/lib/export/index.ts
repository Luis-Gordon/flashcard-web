import type { Card, LibraryCard, ExportFormat } from "@/types/cards";
import type { ExportFormatConfig, ExportResult } from "./types";
import { exportCsv } from "./csv";
import { exportMarkdown } from "./markdown";
import { exportJson } from "./json";

/** Registry of all export formats with metadata and dynamic options. */
export const EXPORT_FORMATS: ExportFormatConfig[] = [
  {
    id: "apkg",
    label: "Anki Package",
    description: "Import directly into Anki desktop or mobile",
    extension: ".apkg",
    icon: "Package",
    options: [
      { key: "deckName", label: "Deck name", type: "text", defaultValue: "Memogenesis Export" },
    ],
  },
  {
    id: "csv",
    label: "CSV",
    description: "Spreadsheets, Anki import, or other flashcard apps",
    extension: ".csv",
    icon: "Table",
    options: [
      {
        key: "separator",
        label: "Separator",
        type: "select",
        defaultValue: "comma",
        choices: [
          { value: "comma", label: "Comma" },
          { value: "tab", label: "Tab" },
        ],
      },
      { key: "includeTags", label: "Include tags", type: "boolean", defaultValue: true },
      { key: "includeNotes", label: "Include notes", type: "boolean", defaultValue: true },
    ],
  },
  {
    id: "markdown",
    label: "Markdown",
    description: "Obsidian Spaced Repetition plugin format",
    extension: ".md",
    icon: "FileText",
    options: [
      { key: "deckName", label: "Deck name", type: "text", defaultValue: "Memogenesis Export" },
    ],
  },
  {
    id: "json",
    label: "JSON",
    description: "Developer-friendly format for custom processing",
    extension: ".json",
    icon: "Braces",
    options: [
      { key: "prettyPrint", label: "Pretty print", type: "boolean", defaultValue: false },
    ],
  },
];

/**
 * Dispatch export to the correct formatter based on format ID.
 * APKG is lazy-imported for code splitting (it pulls in sql.js + jszip).
 */
export async function dispatchExport(
  format: ExportFormat,
  cards: (Card | LibraryCard)[],
  options: Record<string, unknown>,
  callbacks?: { onProgress?: (fraction: number) => void; signal?: AbortSignal },
): Promise<ExportResult> {
  switch (format) {
    case "apkg": {
      const { exportApkg } = await import("./apkg");
      return exportApkg(cards, {
        deckName: (options as { deckName: string }).deckName,
        onProgress: callbacks?.onProgress,
        signal: callbacks?.signal,
      });
    }
    case "csv":
      return exportCsv(cards, options as { separator?: "comma" | "tab"; includeTags?: boolean; includeNotes?: boolean });
    case "markdown":
      return exportMarkdown(cards, options as { deckName: string });
    case "json":
      return exportJson(cards, options as { prettyPrint?: boolean });
    default: {
      const _exhaustive: never = format;
      throw new Error(`Unknown export format: ${_exhaustive}`);
    }
  }
}
