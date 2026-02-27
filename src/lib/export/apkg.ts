import type { Card, LibraryCard } from "@/types/cards";
import type { ExportResult } from "./types";

export interface ApkgExportOptions {
  deckName: string;
}

/** Export cards as .apkg (Anki package). Stub — replaced in Task 7. */
export async function exportApkg(
  _cards: (Card | LibraryCard)[],
  _options: ApkgExportOptions,
): Promise<ExportResult> {
  throw new Error("APKG export not yet implemented");
}
