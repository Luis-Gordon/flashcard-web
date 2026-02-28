import { describe, test, expect } from "vitest";
import type { Card, LibraryCard } from "@/types/cards";

// ── Test Fixtures ──────────────────────────────────────────────

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "test-id-1",
    front: "What is 2+2?",
    back: "4",
    card_type: "basic",
    tags: ["math", "arithmetic"],
    notes: "Simple addition",
    source_quote: "",
    confidence_scores: { atomicity: 0.9, self_contained: 0.95 },
    ...overrides,
  };
}

function makeLibraryCard(overrides: Partial<LibraryCard> = {}): LibraryCard {
  return {
    id: "lib-id-1",
    user_id: "user-1",
    generation_request_id: "req-1",
    front: "What is the capital of France?",
    back: "Paris",
    card_type: "basic",
    tags: ["geography"],
    notes: "",
    source_quote: "",
    domain: "general",
    metadata: {},
    confidence_scores: { atomicity: 0.9, self_contained: 0.95 },
    is_deleted: false,
    created_at: "2026-02-27T00:00:00Z",
    updated_at: "2026-02-27T00:00:00Z",
    ...overrides,
  };
}

// ── CSV Formatter ──────────────────────────────────────────────

describe("exportCsv", () => {
  // Import lazily so tests fail at the right step
  const importCsv = () => import("@/lib/export/csv");

  test("includes UTF-8 BOM for Excel compatibility", async () => {
    const { exportCsv } = await importCsv();
    const result = exportCsv([makeCard()], {});
    expect(result.content).toMatch(/^\uFEFF/);
  });

  test("uses tab separator when specified", async () => {
    const { exportCsv } = await importCsv();
    const result = exportCsv([makeCard()], { separator: "tab" });
    const lines = (result.content as string).split("\n");
    // Header line uses tab
    expect(lines[0]).toContain("\t");
    expect(lines[0]).not.toContain(",");
  });

  test("escapes commas in field values", async () => {
    const { exportCsv } = await importCsv();
    const card = makeCard({ front: "A, B, and C" });
    const result = exportCsv([card], {});
    // Field with comma should be double-quoted
    expect(result.content).toContain('"A, B, and C"');
  });

  test("escapes double quotes by doubling them", async () => {
    const { exportCsv } = await importCsv();
    const card = makeCard({ front: 'He said "hello"' });
    const result = exportCsv([card], {});
    expect(result.content).toContain('"He said ""hello"""');
  });

  test("escapes newlines in field values", async () => {
    const { exportCsv } = await importCsv();
    const card = makeCard({ front: "Line 1\nLine 2" });
    const result = exportCsv([card], {});
    expect(result.content).toContain('"Line 1\nLine 2"');
  });

  test("joins tags with semicolons", async () => {
    const { exportCsv } = await importCsv();
    const card = makeCard({ tags: ["math", "algebra", "beginner"] });
    const result = exportCsv([card], { includeTags: true });
    expect(result.content).toContain("math;algebra;beginner");
  });

  test("excludes tags column when includeTags is false", async () => {
    const { exportCsv } = await importCsv();
    const result = exportCsv([makeCard()], { includeTags: false });
    const header = (result.content as string).split("\n")[0]!;
    expect(header).not.toContain("tags");
  });

  test("excludes notes column when includeNotes is false", async () => {
    const { exportCsv } = await importCsv();
    const result = exportCsv([makeCard()], { includeNotes: false });
    const header = (result.content as string).split("\n")[0]!;
    expect(header).not.toContain("notes");
  });

  test("strips HTML from front and back fields", async () => {
    const { exportCsv } = await importCsv();
    const card = makeCard({
      front: '<div class="fc-front"><span class="fc-word">Hello</span></div>',
      back: '<div class="fc-back"><p>World</p></div>',
    });
    const result = exportCsv([card], {});
    const content = result.content as string;
    expect(content).not.toContain("<div");
    expect(content).not.toContain("<span");
    expect(content).not.toContain("fc-");
    expect(content).toContain("Hello");
    expect(content).toContain("World");
  });

  test("returns correct filename and mimeType", async () => {
    const { exportCsv } = await importCsv();
    const result = exportCsv([makeCard()], {});
    expect(result.mimeType).toBe("text/csv;charset=utf-8");
    expect(result.filename).toMatch(/\.csv$/);
  });
});

// ── Markdown Formatter ─────────────────────────────────────────

describe("exportMarkdown", () => {
  const importMd = () => import("@/lib/export/markdown");

  test("uses Obsidian SR format: Q / ? / A", async () => {
    const { exportMarkdown } = await importMd();
    const result = exportMarkdown([makeCard()], { deckName: "Test Deck" });
    const content = result.content as string;
    // Check Obsidian SR format: question, then ?, then answer
    expect(content).toContain("What is 2+2?");
    expect(content).toContain("?");
    expect(content).toContain("4");
    // Question line followed by ? line
    const lines = content.split("\n");
    const qIdx = lines.findIndex((l) => l.includes("What is 2+2?"));
    expect(lines[qIdx + 1]).toBe("?");
  });

  test("strips HTML from card content", async () => {
    const { exportMarkdown } = await importMd();
    const card = makeCard({
      front: '<div class="fc-front"><span class="fc-word">Hello</span></div>',
      back: '<div class="fc-back"><p>World</p></div>',
    });
    const result = exportMarkdown([card], { deckName: "Test" });
    const content = result.content as string;
    expect(content).not.toContain("<div");
    expect(content).not.toContain("fc-");
    expect(content).toContain("Hello");
    expect(content).toContain("World");
  });

  test("includes tags as HTML comment", async () => {
    const { exportMarkdown } = await importMd();
    const card = makeCard({ tags: ["math", "algebra"] });
    const result = exportMarkdown([card], { deckName: "Test" });
    expect(result.content).toContain("<!--tags: math, algebra-->");
  });

  test("separates cards with ---", async () => {
    const { exportMarkdown } = await importMd();
    const cards = [makeCard(), makeCard({ id: "2", front: "Q2", back: "A2" })];
    const result = exportMarkdown(cards, { deckName: "Test" });
    expect(result.content).toContain("\n---\n");
  });
});

// ── JSON Formatter ─────────────────────────────────────────────

describe("exportJson", () => {
  const importJson = () => import("@/lib/export/json");

  test("exports clean card objects with only useful fields", async () => {
    const { exportJson } = await importJson();
    const result = exportJson([makeCard()], {});
    const parsed = JSON.parse(result.content as string);
    const card = parsed[0];
    expect(card).toHaveProperty("front");
    expect(card).toHaveProperty("back");
    expect(card).toHaveProperty("tags");
    expect(card).toHaveProperty("notes");
    expect(card).toHaveProperty("card_type");
  });

  test("strips internal fields from LibraryCard", async () => {
    const { exportJson } = await importJson();
    const result = exportJson([makeLibraryCard()], {});
    const parsed = JSON.parse(result.content as string);
    const card = parsed[0];
    // Internal fields should be stripped
    expect(card).not.toHaveProperty("user_id");
    expect(card).not.toHaveProperty("generation_request_id");
    expect(card).not.toHaveProperty("is_deleted");
    expect(card).not.toHaveProperty("created_at");
    expect(card).not.toHaveProperty("updated_at");
    expect(card).not.toHaveProperty("metadata");
    expect(card).not.toHaveProperty("confidence_scores");
    expect(card).not.toHaveProperty("source_quote");
    expect(card).not.toHaveProperty("id");
    // But keeps domain
    expect(card).toHaveProperty("domain", "general");
  });

  test("pretty prints when specified", async () => {
    const { exportJson } = await importJson();
    const result = exportJson([makeCard()], { prettyPrint: true });
    const content = result.content as string;
    // Pretty printed JSON has newlines and indentation
    expect(content).toContain("\n");
    expect(content).toMatch(/^\[\n\s+{/);
  });

  test("minified by default", async () => {
    const { exportJson } = await importJson();
    const result = exportJson([makeCard()], {});
    const content = result.content as string;
    // Minified JSON has no leading whitespace indentation
    expect(content).not.toMatch(/^\[\n\s+{/);
  });
});

// ── APKG Schema Helpers ────────────────────────────────────────

describe("APKG schema helpers", () => {
  const importSchema = () => import("@/lib/apkg/schema");

  test("generateGuid produces 10-character strings", async () => {
    const { generateGuid } = await importSchema();
    const guid = generateGuid();
    expect(guid).toHaveLength(10);
  });

  test("generateGuid produces unique values", async () => {
    const { generateGuid } = await importSchema();
    const guids = new Set(Array.from({ length: 100 }, () => generateGuid()));
    // With 90-char alphabet and 10 chars, collisions are astronomically unlikely
    expect(guids.size).toBe(100);
  });

  test("fieldChecksum is deterministic", async () => {
    const { fieldChecksum } = await importSchema();
    const a = fieldChecksum("Hello, world!");
    const b = fieldChecksum("Hello, world!");
    expect(a).toBe(b);
  });

  test("fieldChecksum produces distinct values for different inputs", async () => {
    const { fieldChecksum } = await importSchema();
    const a = fieldChecksum("Hello");
    const b = fieldChecksum("World");
    expect(a).not.toBe(b);
  });

  test("generateId produces unique values", async () => {
    const { generateId } = await importSchema();
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  test("generateId produces strictly increasing values", async () => {
    const { generateId } = await importSchema();
    const ids = Array.from({ length: 100 }, () => generateId());
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1]!);
    }
  });
});
