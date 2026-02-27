import type { Card, LibraryCard } from "@/types/cards";
import type { ExportResult } from "./types";
import { stripHtml } from "./html";

export interface CsvOptions {
  separator?: "comma" | "tab";
  includeTags?: boolean;
  includeNotes?: boolean;
}

/** Escape a field value for CSV: quote if it contains separator, quotes, or newlines. */
function escapeField(value: string, sep: string): string {
  if (value.includes('"') || value.includes(sep) || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Export cards as CSV with BOM, escaping, and configurable columns. */
export function exportCsv(
  cards: (Card | LibraryCard)[],
  options: CsvOptions,
): ExportResult {
  const sep = options.separator === "tab" ? "\t" : ",";
  const includeTags = options.includeTags !== false;
  const includeNotes = options.includeNotes !== false;

  // Build header
  const headers = ["front", "back"];
  if (includeTags) headers.push("tags");
  if (includeNotes) headers.push("notes");

  const rows: string[] = [headers.join(sep)];

  for (const card of cards) {
    const fields: string[] = [
      escapeField(stripHtml(card.front), sep),
      escapeField(stripHtml(card.back), sep),
    ];
    if (includeTags) {
      fields.push(escapeField(card.tags.join(";"), sep));
    }
    if (includeNotes) {
      fields.push(escapeField(card.notes, sep));
    }
    rows.push(fields.join(sep));
  }

  const content = "\uFEFF" + rows.join("\n");

  return {
    content,
    mimeType: "text/csv;charset=utf-8",
    filename: "flashcards.csv",
  };
}
