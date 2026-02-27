import type { Card, LibraryCard } from "@/types/cards";
import type { ExportResult } from "./types";
import { stripHtml } from "./html";

export interface MarkdownOptions {
  deckName: string;
}

/**
 * Export cards in Obsidian Spaced Repetition plugin format.
 *
 * Format per card:
 *   Question text
 *   ?
 *   Answer text
 *   <!--tags: tag1, tag2-->
 *   ---
 */
export function exportMarkdown(
  cards: (Card | LibraryCard)[],
  options: MarkdownOptions,
): ExportResult {
  const { deckName } = options;

  const sections: string[] = [];
  sections.push(`# ${deckName}`);
  sections.push("#flashcards");
  sections.push("");

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]!;
    const front = stripHtml(card.front);
    const back = stripHtml(card.back);

    sections.push(front);
    sections.push("?");
    sections.push(back);

    if (card.tags.length > 0) {
      sections.push(`<!--tags: ${card.tags.join(", ")}-->`);
    }

    if (i < cards.length - 1) {
      sections.push("---");
    }
  }

  const content = sections.join("\n") + "\n";

  // Sanitize deck name for filename
  const safeName = deckName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);

  return {
    content,
    mimeType: "text/markdown;charset=utf-8",
    filename: `${safeName}.md`,
  };
}
