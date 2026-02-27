# Phase 3D: Export Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Export page with CSV/Markdown/JSON/APKG format support, preview, format-specific options, and the APKG builder ported from the backend spike — completing the full card generation-to-export pipeline.

**Architecture:** Export formatters are pure functions (`cards → ExportResult`) registered in an `EXPORT_FORMATS` registry. The APKG builder is lazy-imported (code-split) since it pulls in sql.js WASM (~1MB). Export.tsx is a controlled page that reads `exportCards` from the Zustand store (set by Library or Generate), lets the user pick format + options, shows a preview, and triggers browser download. The `triggerDownload` utility creates an object URL, clicks a hidden `<a>`, and revokes.

**Tech Stack:** React 19, Zustand 5, shadcn/ui (Tabs, RadioGroup, Input, Checkbox, Label), sql.js (WASM), JSZip, Vitest

---

## Context

Phase 3C completed the Library page (filters, undo delete, export selected, nav badge). Two entry points now feed into the Export page:

1. **Library**: "Export selected" button → `setExportCards(selectedLibraryCards)` → navigates to `/app/export`
2. **Generate**: "Export N" button in CardReview summary bar → `setExportCards(selectedPendingCards)` → navigates to `/app/export`

The Export page placeholder currently shows "Coming in Phase 3". The `exportCards` store field, `setExportCards`/`clearExportCards` actions, and `useExportCards` hook are already wired. The `recentDeckNames` + `addRecentDeckName` exist in the settings store.

The APKG spike code lives at `flashcard-backend/docs/spikes/apkg-code/` — `schema.ts` (DDL + helpers) and `generator.ts` (sql.js + JSZip). The spike used `sql-asm.js` for Workers; we'll use `sql-wasm.js` for the browser. The WASM binary is already at `public/sql-wasm.wasm` (copied by `postinstall` script).

## Files Overview

### New Files (9)
| File | Purpose |
|------|---------|
| `src/lib/export/types.ts` | `ExportResult`, `ExportFormatConfig`, `ExportOptionField` |
| `src/lib/export/csv.ts` | CSV formatter with escaping, BOM, separator options |
| `src/lib/export/markdown.ts` | Obsidian SR format with HTML stripping |
| `src/lib/export/json.ts` | Clean JSON export with field stripping |
| `src/lib/export/download.ts` | `triggerDownload()` — object URL → hidden `<a>` click |
| `src/lib/export/index.ts` | `EXPORT_FORMATS` registry + `exportCards()` dispatcher |
| `src/lib/apkg/schema.ts` | Anki SQLite schema (ported from spike) |
| `src/lib/apkg/builder.ts` | WASM generator (ported from spike, browser-adapted) |
| `tests/unit/export.test.ts` | Tests for CSV, Markdown, JSON formatters + APKG schema helpers |

### Modified Files (2)
| File | Change |
|------|--------|
| `src/routes/app/Export.tsx` | Replace placeholder with full export page |
| `src/lib/export/apkg.ts` | New: adapter that lazy-imports builder + maps Card/LibraryCard → ApkgCard |

---

## Task 1: Export types and download utility

**Files:**
- Create: `src/lib/export/types.ts`
- Create: `src/lib/export/download.ts`

**Step 1:** Create `src/lib/export/types.ts`:

```typescript
import type { ExportFormat } from "@/types/cards";

export interface ExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
}

export interface ExportOptionField {
  key: string;
  label: string;
  type: "text" | "select" | "boolean";
  defaultValue: string | boolean;
  choices?: { value: string; label: string }[];
}

export interface ExportFormatConfig {
  id: ExportFormat;
  label: string;
  description: string;
  extension: string;
  icon: string;
  options: ExportOptionField[];
}
```

**Step 2:** Create `src/lib/export/download.ts`:

```typescript
import type { ExportResult } from "./types";

export function triggerDownload(result: ExportResult): void {
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

**Step 3:** Run `npm run typecheck` to verify.

**Step 4:** Commit: `feat(export): add export types and download utility`

---

## Task 2: CSV formatter (TDD)

**Files:**
- Create: `src/lib/export/csv.ts`
- Create: `tests/unit/export.test.ts`

**Step 1: Write failing tests** in `tests/unit/export.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { exportCsv } from "@/lib/export/csv";

function mockCard(overrides: Record<string, unknown> = {}) {
  return {
    id: "1",
    front: "What is X?",
    back: "X is Y",
    card_type: "basic" as const,
    tags: ["tag1", "tag2"],
    notes: "A note",
    source_quote: "src",
    confidence_scores: { atomicity: 1, self_contained: 1 },
    ...overrides,
  };
}

describe("exportCsv", () => {
  it("exports basic cards with BOM and header", async () => {
    const result = await exportCsv([mockCard()], {});
    const text = await result.blob.text();
    expect(text.startsWith("\uFEFF")).toBe(true);
    expect(text).toContain("front,back,tags,notes");
    expect(text).toContain("What is X?");
    expect(result.mimeType).toBe("text/csv;charset=utf-8");
    expect(result.filename).toBe("flashcards.csv");
  });

  it("escapes fields containing commas", async () => {
    const result = await exportCsv([mockCard({ front: "A, B, C" })], {});
    const text = await result.blob.text();
    expect(text).toContain('"A, B, C"');
  });

  it("escapes fields containing double quotes", async () => {
    const result = await exportCsv([mockCard({ front: 'Say "hello"' })], {});
    const text = await result.blob.text();
    expect(text).toContain('"Say ""hello"""');
  });

  it("escapes fields containing newlines", async () => {
    const result = await exportCsv([mockCard({ front: "Line 1\nLine 2" })], {});
    const text = await result.blob.text();
    expect(text).toContain('"Line 1\nLine 2"');
  });

  it("joins tags with semicolons", async () => {
    const result = await exportCsv([mockCard({ tags: ["a", "b", "c"] })], {});
    const text = await result.blob.text();
    expect(text).toContain("a;b;c");
  });

  it("uses tab separator when configured", async () => {
    const result = await exportCsv([mockCard()], { separator: "tab" });
    const text = await result.blob.text();
    const lines = text.split("\n");
    expect(lines[0]).toContain("\t");
    expect(lines[0]).not.toContain(",");
  });

  it("excludes notes column when includNotes is false", async () => {
    const result = await exportCsv([mockCard()], { includeNotes: false });
    const text = await result.blob.text();
    const header = text.split("\n")[0]!;
    expect(header).not.toContain("notes");
  });

  it("excludes tags column when includeTags is false", async () => {
    const result = await exportCsv([mockCard()], { includeTags: false });
    const text = await result.blob.text();
    const header = text.split("\n")[0]!;
    expect(header).not.toContain("tags");
  });

  it("strips HTML tags from front and back", async () => {
    const result = await exportCsv(
      [mockCard({ front: "<b>Bold</b>", back: '<div class="fc-word">Word</div>' })],
      {},
    );
    const text = await result.blob.text();
    expect(text).toContain("Bold");
    expect(text).not.toContain("<b>");
    expect(text).toContain("Word");
    expect(text).not.toContain("fc-word");
  });
});
```

**Step 2:** Run `npm run test` — verify CSV tests fail.

**Step 3:** Create `src/lib/export/csv.ts`:

```typescript
import type { ExportResult } from "./types";
import type { Card, LibraryCard } from "@/types/cards";

interface CsvOptions {
  separator?: "comma" | "tab";
  includeNotes?: boolean;
  includeTags?: boolean;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function escapeCsvField(value: string, sep: string): string {
  if (value.includes(sep) || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportCsv(
  cards: (Card | LibraryCard)[],
  options: CsvOptions,
): Promise<ExportResult> {
  const sep = options.separator === "tab" ? "\t" : ",";
  const includeNotes = options.includeNotes !== false;
  const includeTags = options.includeTags !== false;

  const headers = ["front", "back"];
  if (includeTags) headers.push("tags");
  if (includeNotes) headers.push("notes");

  const rows = cards.map((card) => {
    const fields = [stripHtml(card.front), stripHtml(card.back)];
    if (includeTags) fields.push(card.tags.join(";"));
    if (includeNotes) fields.push(card.notes);
    return fields.map((f) => escapeCsvField(f, sep)).join(sep);
  });

  const content = "\uFEFF" + [headers.join(sep), ...rows].join("\n") + "\n";
  return {
    blob: new Blob([content], { type: "text/csv;charset=utf-8" }),
    filename: "flashcards.csv",
    mimeType: "text/csv;charset=utf-8",
  };
}
```

**Step 4:** Run `npm run test` — CSV tests pass.

**Step 5:** Commit: `feat(export): add CSV formatter with TDD tests`

---

## Task 3: Markdown formatter (TDD)

**Files:**
- Modify: `tests/unit/export.test.ts` (add Markdown tests)
- Create: `src/lib/export/markdown.ts`

**Step 1: Write failing tests** — append to `tests/unit/export.test.ts`:

```typescript
import { exportMarkdown } from "@/lib/export/markdown";

describe("exportMarkdown", () => {
  it("produces Obsidian SR format", async () => {
    const result = await exportMarkdown([mockCard()], { deckName: "My Deck" });
    const text = await result.blob.text();
    expect(text).toContain("# My Deck");
    expect(text).toContain("#flashcards");
    expect(text).toContain("What is X?");
    expect(text).toContain("?");
    expect(text).toContain("X is Y");
    expect(result.mimeType).toBe("text/markdown");
    expect(result.filename).toBe("My Deck.md");
  });

  it("strips HTML from content", async () => {
    const result = await exportMarkdown(
      [mockCard({ front: "<b>Bold</b>", back: "<em>Italic</em>" })],
      { deckName: "Test" },
    );
    const text = await result.blob.text();
    expect(text).toContain("Bold");
    expect(text).not.toContain("<b>");
  });

  it("includes tags as HTML comment", async () => {
    const result = await exportMarkdown([mockCard()], { deckName: "Test" });
    const text = await result.blob.text();
    expect(text).toContain("<!--tags: tag1, tag2-->");
  });

  it("separates cards with horizontal rules", async () => {
    const result = await exportMarkdown(
      [mockCard(), mockCard({ id: "2", front: "Q2", back: "A2" })],
      { deckName: "Test" },
    );
    const text = await result.blob.text();
    expect(text).toContain("---");
  });
});
```

**Step 2:** Run `npm run test` — Markdown tests fail.

**Step 3:** Create `src/lib/export/markdown.ts`:

```typescript
import type { ExportResult } from "./types";
import type { Card, LibraryCard } from "@/types/cards";

interface MarkdownOptions {
  deckName: string;
  includeNotes?: boolean;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export async function exportMarkdown(
  cards: (Card | LibraryCard)[],
  options: MarkdownOptions,
): Promise<ExportResult> {
  const includeNotes = options.includeNotes !== false;
  const lines: string[] = [`# ${options.deckName}`, "#flashcards", ""];

  cards.forEach((card, i) => {
    lines.push(stripHtml(card.front));
    lines.push("?");
    lines.push(stripHtml(card.back));

    if (card.tags.length > 0) {
      lines.push(`<!--tags: ${card.tags.join(", ")}-->`);
    }

    if (includeNotes && card.notes) {
      lines.push(`<!-- ${card.notes} -->`);
    }

    if (i < cards.length - 1) {
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  });

  lines.push("");
  const content = lines.join("\n");
  const safeName = options.deckName.replace(/[^a-zA-Z0-9\-_ ]/g, "");

  return {
    blob: new Blob([content], { type: "text/markdown" }),
    filename: `${safeName || "flashcards"}.md`,
    mimeType: "text/markdown",
  };
}
```

**Step 4:** Run `npm run test` — Markdown tests pass.

**Step 5:** Commit: `feat(export): add Markdown formatter (Obsidian SR format)`

---

## Task 4: JSON formatter (TDD)

**Files:**
- Modify: `tests/unit/export.test.ts` (add JSON tests)
- Create: `src/lib/export/json.ts`

**Step 1: Write failing tests** — append to `tests/unit/export.test.ts`:

```typescript
import { exportJson } from "@/lib/export/json";

describe("exportJson", () => {
  it("exports clean card objects", async () => {
    const result = await exportJson([mockCard()], {});
    const text = await result.blob.text();
    const parsed = JSON.parse(text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].front).toBe("What is X?");
    expect(parsed[0].back).toBe("X is Y");
    expect(parsed[0].tags).toEqual(["tag1", "tag2"]);
    expect(result.mimeType).toBe("application/json");
    expect(result.filename).toBe("flashcards.json");
  });

  it("strips internal fields", async () => {
    const libraryCard = {
      ...mockCard(),
      user_id: "u1",
      generation_request_id: "req1",
      is_deleted: false,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      metadata: {},
      domain: "general" as const,
    };
    const result = await exportJson([libraryCard], {});
    const text = await result.blob.text();
    const parsed = JSON.parse(text);
    expect(parsed[0].user_id).toBeUndefined();
    expect(parsed[0].generation_request_id).toBeUndefined();
    expect(parsed[0].is_deleted).toBeUndefined();
    expect(parsed[0].confidence_scores).toBeUndefined();
    // domain IS included (useful for re-import)
    expect(parsed[0].domain).toBe("general");
  });

  it("pretty prints with 2-space indent", async () => {
    const result = await exportJson([mockCard()], { prettyPrint: true });
    const text = await result.blob.text();
    expect(text).toContain("\n  ");
  });

  it("minifies by default", async () => {
    const result = await exportJson([mockCard()], {});
    const text = await result.blob.text();
    expect(text).not.toContain("\n  ");
  });
});
```

**Step 2:** Run `npm run test` — JSON tests fail.

**Step 3:** Create `src/lib/export/json.ts`:

```typescript
import type { ExportResult } from "./types";
import type { Card, LibraryCard } from "@/types/cards";

interface JsonOptions {
  prettyPrint?: boolean;
}

const STRIP_KEYS = new Set([
  "user_id",
  "generation_request_id",
  "is_deleted",
  "created_at",
  "updated_at",
  "metadata",
  "confidence_scores",
  "source_quote",
  "id",
]);

export async function exportJson(
  cards: (Card | LibraryCard)[],
  options: JsonOptions,
): Promise<ExportResult> {
  const cleaned = cards.map((card) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(card)) {
      if (!STRIP_KEYS.has(key)) {
        out[key] = value;
      }
    }
    return out;
  });

  const indent = options.prettyPrint ? 2 : undefined;
  const content = JSON.stringify(cleaned, null, indent);

  return {
    blob: new Blob([content], { type: "application/json" }),
    filename: "flashcards.json",
    mimeType: "application/json",
  };
}
```

**Step 4:** Run `npm run test` — JSON tests pass.

**Step 5:** Commit: `feat(export): add JSON formatter with field stripping`

---

## Task 5: Export registry and dispatcher

**Files:**
- Create: `src/lib/export/index.ts`

**Step 1:** Create `src/lib/export/index.ts`:

```typescript
import type { ExportFormat } from "@/types/cards";
import type { Card, LibraryCard } from "@/types/cards";
import type { ExportResult, ExportFormatConfig } from "./types";
import { exportCsv } from "./csv";
import { exportMarkdown } from "./markdown";
import { exportJson } from "./json";

export { triggerDownload } from "./download";
export type { ExportResult, ExportFormatConfig, ExportOptionField } from "./types";

export const EXPORT_FORMATS: ExportFormatConfig[] = [
  {
    id: "apkg",
    label: "Anki Package",
    description: "Import directly into Anki desktop or mobile",
    extension: ".apkg",
    icon: "package",
    options: [
      {
        key: "deckName",
        label: "Deck name",
        type: "text",
        defaultValue: "Memogenesis Export",
      },
    ],
  },
  {
    id: "csv",
    label: "CSV",
    description: "Spreadsheet-compatible, works with Excel and Anki import",
    extension: ".csv",
    icon: "table",
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
      { key: "includeTags", label: "Include tags column", type: "boolean", defaultValue: true },
      { key: "includeNotes", label: "Include notes column", type: "boolean", defaultValue: true },
    ],
  },
  {
    id: "markdown",
    label: "Markdown",
    description: "Obsidian Spaced Repetition plugin format",
    extension: ".md",
    icon: "file-text",
    options: [
      {
        key: "deckName",
        label: "Deck name",
        type: "text",
        defaultValue: "Memogenesis Export",
      },
      { key: "includeNotes", label: "Include notes", type: "boolean", defaultValue: true },
    ],
  },
  {
    id: "json",
    label: "JSON",
    description: "Machine-readable, useful for scripting and backups",
    extension: ".json",
    icon: "braces",
    options: [
      { key: "prettyPrint", label: "Pretty print", type: "boolean", defaultValue: true },
    ],
  },
];

export async function dispatchExport(
  cards: (Card | LibraryCard)[],
  format: ExportFormat,
  options: Record<string, unknown>,
): Promise<ExportResult> {
  switch (format) {
    case "csv":
      return exportCsv(cards, options as { separator?: "comma" | "tab"; includeNotes?: boolean; includeTags?: boolean });
    case "markdown":
      return exportMarkdown(cards, options as { deckName: string; includeNotes?: boolean });
    case "json":
      return exportJson(cards, options as { prettyPrint?: boolean });
    case "apkg": {
      const { exportApkg } = await import("./apkg");
      return exportApkg(cards, options as { deckName: string });
    }
  }
}
```

Note: The `apkg` import will be created in Task 7. For now this compiles but the APKG case will fail at runtime until Task 7. That's fine — the registry is wired.

**Step 2:** Run `npm run typecheck` — will show error for missing `./apkg`. Create a stub:

Create `src/lib/export/apkg.ts`:

```typescript
import type { ExportResult } from "./types";
import type { Card, LibraryCard } from "@/types/cards";

export async function exportApkg(
  cards: (Card | LibraryCard)[],
  _options: { deckName: string },
): Promise<ExportResult> {
  void cards;
  throw new Error("APKG export not yet implemented — see Task 7");
}
```

**Step 3:** Run `npm run typecheck` — passes.

**Step 4:** Commit: `feat(export): add format registry and export dispatcher`

---

## Task 6: Export page UI

**Files:**
- Modify: `src/routes/app/Export.tsx` (replace placeholder)

This is the main UI task. Use the `frontend-design` skill for the component.

**Step 1:** Replace `Export.tsx` with the full export page:

The page has these sections:
1. **Header**: "Export N cards" with source context
2. **No-cards empty state**: If `exportCards` is empty, CTA links to Library and Generate
3. **Format selector**: 4 radio cards in a 2x2 grid (APKG, CSV, Markdown, JSON). Each shows icon + label + description. Selected format has ring highlight.
4. **Options panel**: Renders format-specific options dynamically from `EXPORT_FORMATS[].options`. Text fields render `Input`, boolean fields render `Checkbox + Label`, select fields render `Select`.
5. **Preview section**: Collapsible. Shows first 3 cards rendered in chosen format using `<pre>` for text formats. Calls the formatter with a 3-card subset.
6. **Export button**: `dispatchExport()` → `triggerDownload()`. Disabled while exporting. Shows spinner during export. On success for APKG/Markdown: saves deck name via `addRecentDeckName`.
7. **Recent deck names**: When APKG or Markdown is selected and `recentDeckNames.length > 0`, show dropdown of recent names above the deck name input.

**Key imports:**
- `useExportCards` from `@/lib/hooks/useCards`
- `useSettingsStore` from `@/stores/settings`
- `EXPORT_FORMATS, dispatchExport, triggerDownload` from `@/lib/export`
- `ExportFormat` from `@/types/cards`
- shadcn: `Button, Input, Label, Checkbox, Select/SelectTrigger/SelectValue/SelectContent/SelectItem, Badge, Collapsible/CollapsibleTrigger/CollapsibleContent`
- lucide: `Download, Package, Table, FileText, Braces, ChevronDown, Sparkles, LibraryBig, Loader2`

**State:**
```typescript
const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("apkg");
const [formatOptions, setFormatOptions] = useState<Record<string, unknown>>({});
const [isExporting, setIsExporting] = useState(false);
const [previewOpen, setPreviewOpen] = useState(false);
const [previewContent, setPreviewContent] = useState<string>("");
```

**Option state init:** When `selectedFormat` changes, reset `formatOptions` to defaults from `EXPORT_FORMATS`:
```typescript
useEffect(() => {
  const config = EXPORT_FORMATS.find((f) => f.id === selectedFormat);
  if (!config) return;
  const defaults: Record<string, unknown> = {};
  for (const opt of config.options) {
    defaults[opt.key] = opt.defaultValue;
  }
  setFormatOptions(defaults);
  setPreviewOpen(false);
  setPreviewContent("");
}, [selectedFormat]);
```

**Preview generation:** When `previewOpen` becomes true, generate preview:
```typescript
useEffect(() => {
  if (!previewOpen || exportCards.length === 0) return;
  const previewCards = exportCards.slice(0, 3);
  dispatchExport(previewCards, selectedFormat, formatOptions)
    .then(async (result) => {
      const text = await result.blob.text();
      setPreviewContent(text);
    })
    .catch(() => setPreviewContent("Preview unavailable"));
}, [previewOpen, selectedFormat, formatOptions, exportCards]);
```

**Export handler:**
```typescript
const handleExport = async () => {
  setIsExporting(true);
  try {
    const result = await dispatchExport(exportCards, selectedFormat, formatOptions);
    triggerDownload(result);
    // Save deck name for APKG/Markdown
    const deckName = formatOptions.deckName as string | undefined;
    if (deckName && (selectedFormat === "apkg" || selectedFormat === "markdown")) {
      addRecentDeckName(deckName);
    }
    toast.success(`Exported ${exportCards.length} cards as ${selectedFormat.toUpperCase()}`);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Export failed");
  } finally {
    setIsExporting(false);
  }
};
```

**Format card icon mapping:**
```typescript
const FORMAT_ICONS: Record<string, React.ElementType> = {
  package: Package,
  table: Table,
  "file-text": FileText,
  braces: Braces,
};
```

**Step 2:** Run `npm run typecheck`.

**Step 3:** Run `npm run test` — all existing tests still pass.

**Step 4:** Commit: `feat(export): build Export page with format selector, options, and preview`

---

## Task 7: APKG builder (ported from spike)

**Files:**
- Modify: `src/lib/apkg/schema.ts` (port from spike, currently empty dir)
- Modify: `src/lib/apkg/builder.ts` (port from spike, browser-adapted)
- Modify: `src/lib/export/apkg.ts` (replace stub with real implementation)
- Modify: `tests/unit/export.test.ts` (add APKG schema helper tests)

**Step 1: Write failing tests** — append to `tests/unit/export.test.ts`:

```typescript
import { generateGuid, fieldChecksum, generateId } from "@/lib/apkg/schema";

describe("APKG schema helpers", () => {
  it("generateGuid produces 10-character strings", () => {
    const guid = generateGuid();
    expect(guid).toHaveLength(10);
    expect(typeof guid).toBe("string");
  });

  it("generateGuid produces unique values", () => {
    const guids = new Set(Array.from({ length: 100 }, () => generateGuid()));
    expect(guids.size).toBe(100);
  });

  it("fieldChecksum is deterministic", () => {
    const a = fieldChecksum("hello world");
    const b = fieldChecksum("hello world");
    expect(a).toBe(b);
    expect(typeof a).toBe("number");
  });

  it("fieldChecksum differs for different inputs", () => {
    const a = fieldChecksum("hello");
    const b = fieldChecksum("world");
    expect(a).not.toBe(b);
  });

  it("generateId produces unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
```

**Step 2:** Run `npm run test` — schema helper tests fail (module not found).

**Step 3:** Port `src/lib/apkg/schema.ts` — copy the spike's `schema.ts` verbatim from `flashcard-backend/docs/spikes/apkg-code/schema.ts`. No changes needed; it's pure TypeScript with no environment-specific code.

**Step 4:** Run `npm run test` — schema helper tests pass.

**Step 5:** Port `src/lib/apkg/builder.ts` — adapt from spike's `generator.ts`:

Key changes from the spike:
- Replace `import initSqlJs from 'sql.js/dist/sql-asm.js'` with browser WASM init:
  ```typescript
  import initSqlJs from "sql.js";
  ```
- In `generateApkg()`, pass `locateFile` to tell sql.js where to find the WASM binary:
  ```typescript
  const SQL = await initSqlJs({
    locateFile: (file: string) => `/${file}`,
  });
  ```
- Keep all other logic identical (interfaces, schema creation, note/card insertion, ZIP packaging)

**Step 6:** Replace `src/lib/export/apkg.ts` stub with real implementation:

```typescript
import type { ExportResult } from "./types";
import type { Card, LibraryCard } from "@/types/cards";

export async function exportApkg(
  cards: (Card | LibraryCard)[],
  options: { deckName: string },
): Promise<ExportResult> {
  const { generateApkg } = await import("@/lib/apkg/builder");

  const apkgCards = cards.map((c) => ({
    front: c.front,
    back: c.back,
    tags: c.tags,
  }));

  const result = await generateApkg({
    deckName: options.deckName,
    cards: apkgCards,
  });

  const safeName = options.deckName.replace(/[^a-zA-Z0-9\-_ ]/g, "");
  return {
    blob: new Blob([result.data], { type: "application/octet-stream" }),
    filename: `${safeName || "flashcards"}.apkg`,
    mimeType: "application/octet-stream",
  };
}
```

**Step 7:** Run `npm run typecheck`.

**Step 8:** Run `npm run test` — all tests pass. Note: The full APKG builder test (generating an actual .apkg and verifying ZIP contents) is deferred to e2e tests since it requires WASM loading which is complex in jsdom. The schema helper tests provide unit coverage.

**Step 9:** Commit: `feat(export): port APKG builder from spike + wire into export dispatcher`

---

## Task 8: Quality gates + documentation

**Files:**
- Update: `CLAUDE.md` — "Current Status" and "Next Session Tasks"
- Update: `docs/architecture.md` — new files, patterns
- Append: `docs/session-log.md` — session entry

**Step 1:** Run full quality gates:
```bash
npm run typecheck    # 0 errors
npm run lint:fix     # 0 warnings
npm run test         # all pass (28 existing + new export tests)
npm run build        # succeeds
```

**Step 2:** Update `CLAUDE.md`:

Current Status:
- Phase 3 — M5+M6 complete. Export page fully functional with 4 formats (APKG, CSV, Markdown, JSON).

Next Session Tasks:
1. Phase 3F: Polish — keyboard shortcuts in Library, staging deployment
2. Phase 4: Stripe Checkout + billing portal
3. Phase 5: Account settings + data export

**Step 3:** Update `docs/architecture.md`:

Add to directory structure:
```
├── lib/
│   ├── export/
│   │   ├── types.ts          # ExportResult, ExportFormatConfig
│   │   ├── index.ts          # EXPORT_FORMATS registry, dispatchExport()
│   │   ├── csv.ts            # CSV formatter
│   │   ├── markdown.ts       # Obsidian SR format
│   │   ├── json.ts           # Clean JSON export
│   │   ├── apkg.ts           # APKG adapter (lazy-imports builder)
│   │   └── download.ts       # triggerDownload() utility
│   ├── apkg/
│   │   ├── schema.ts         # Anki SQLite schema + helpers
│   │   └── builder.ts        # sql.js WASM + JSZip .apkg generator
```

Add Export Page pattern:
- Format registry pattern: `EXPORT_FORMATS` array defines format metadata + options declaratively; `dispatchExport()` routes to the correct formatter.
- APKG is lazy-imported via `import("./apkg")` → Vite code-splits it into a separate chunk (pulls in sql.js WASM ~1MB on first use, cached thereafter).
- Preview generates the export for first 3 cards on-demand when the collapsible opens.

Update "Not Yet Implemented": remove export entries (now done).

**Step 4:** Append session log entry.

**Step 5:** Commit: `docs: update session log and architecture for Phase 3D (M5+M6)`

**Step 6:** Push: `git push`

---

## Verification

1. `npm run typecheck` — 0 errors
2. `npm run lint:fix` — 0 warnings
3. `npm run test` — all pass (28 existing + ~18 new export tests)
4. `npm run build` — succeeds (expect new export chunk, APKG chunk separate)
5. **Manual check**: Dev server → Generate cards → click "Export N" → verify Export page loads with cards, format selector works, preview generates, CSV/Markdown/JSON download correctly. APKG download produces file that opens in Anki desktop.
