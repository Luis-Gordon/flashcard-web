import type { Card, LibraryCard } from "@/types/cards";
import type { ExportResult } from "./types";

export interface ApkgExportOptions {
  deckName: string;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/**
 * Export cards as .apkg (Anki package).
 * Lazy-imports the APKG builder for code splitting (sql.js + jszip).
 */
export async function exportApkg(
  cards: (Card | LibraryCard)[],
  options: ApkgExportOptions,
): Promise<ExportResult> {
  const { generateApkg } = await import("@/lib/apkg/builder");

  const apkgCards = cards.map((card) => ({
    front: card.front,
    back: card.back,
    tags: card.tags.length > 0 ? card.tags : undefined,
  }));

  const result = await generateApkg({
    deckName: options.deckName,
    cards: apkgCards,
    onProgress: options.onProgress,
    signal: options.signal,
  });

  // Sanitize deck name for filename
  const safeName = options.deckName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);

  return {
    content: result.data,
    mimeType: "application/octet-stream",
    filename: `${safeName}.apkg`,
  };
}
