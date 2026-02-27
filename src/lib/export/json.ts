import type { Card, LibraryCard } from "@/types/cards";
import type { ExportResult } from "./types";

export interface JsonOptions {
  prettyPrint?: boolean;
}

/** Pick only the user-facing fields from a card. */
function cleanCard(card: Card | LibraryCard): Record<string, unknown> {
  const clean: Record<string, unknown> = {
    front: card.front,
    back: card.back,
    card_type: card.card_type,
    tags: card.tags,
    notes: card.notes,
  };

  // Keep domain if present (LibraryCard has it, useful for re-import)
  if ("domain" in card && typeof card.domain === "string") {
    clean.domain = card.domain;
  }

  return clean;
}

/** Export cards as JSON with optional pretty printing. */
export function exportJson(
  cards: (Card | LibraryCard)[],
  options: JsonOptions,
): ExportResult {
  const cleaned = cards.map(cleanCard);
  const indent = options.prettyPrint ? 2 : undefined;
  const content = JSON.stringify(cleaned, null, indent);

  return {
    content,
    mimeType: "application/json",
    filename: "flashcards.json",
  };
}
