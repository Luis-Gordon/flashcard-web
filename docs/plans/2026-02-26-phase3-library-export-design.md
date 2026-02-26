# Phase 3: Card Library + Multi-Format Export

> Design document. Created 2026-02-26 during brainstorming session.

## Context

Phase 2 is complete — card generation form, review/edit UI, and code splitting are all working (16 tests passing). Phase 3 makes the app self-sufficient: users can browse their generated cards, edit them, and export to multiple formats (Anki, Obsidian, Quizlet, or raw JSON). This is a Gate 3 milestone — the web app must have a full generate -> library -> export flow.

The data layer is largely scaffolded (Zustand store, API client, types, hooks all have library support). This phase is primarily a **UI build** for the library + a **strategy-pattern export system** with 4 formats.

## Scope

- **Card Library page** — paginated grid/list, filters, bulk actions, inline editing, undo delete
- **Multi-format Export page** — .apkg (Anki), CSV (universal), Markdown (Obsidian SR), JSON
- **Backend changes** — PATCH /cards/:id, enhanced GET /cards filters (date range, tag)
- **Keyboard shortcuts** — j/k/x/d for library navigation (lower priority)

## Session Plan

This work spans multiple sessions. Each session should end with passing quality gates and a commit.

| Session | Milestones | Repo | Deliverable |
|---------|-----------|------|-------------|
| **Session A** | M1 | `flashcard-backend/` | Backend PATCH endpoint + enhanced GET filters |
| **Session B** | M2 + M3 | `flashcard-web/` | Shared infrastructure + library core grid |
| **Session C** | M4 | `flashcard-web/` | Library filters, bulk actions, undo, inline edit |
| **Session D** | M5 + M6 | `flashcard-web/` | Export page with all 4 formats |
| **Session E** | M7 | `flashcard-web/` | Polish, shortcuts, Generate->Export flow, docs |

## Milestones

### M1: Backend — PATCH /cards/:id + Enhanced GET /cards

> **Session A** — can be executed by a Claude instance in `flashcard-backend/` directory independently.

**Why**: The Library page needs inline editing (PATCH endpoint), date range filtering, and tag filtering. These must exist in the backend before the frontend can use them.

**Modify `src/lib/validation/cards.ts` (line ~1262):**
- Add `UpdateCardBodySchema`:
  ```typescript
  export const UpdateCardBodySchema = z.object({
    front: z.string().min(1).optional(),
    back: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    domain: CardDomainSchema.optional(),
    product_source: ProductSourceSchema,
  }).strict();
  ```
- Extend `LibraryQuerySchema` (currently at line 1262) — add:
  ```typescript
  tag: z.string().max(100).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  ```

**Modify `src/routes/library.ts`:**
- **Add PATCH `/:id`**: Validate body with `UpdateCardBodySchema`, build partial update object from provided fields only, call Supabase `.update(updates).eq('id', id).eq('user_id', userId)` with `{ count: 'exact' }`, return 404 if count=0, return updated card on success.
- **Enhance GET `/`**: Add Supabase query clauses:
  - `.contains('tags', [tag])` when `tag` param present
  - `.gte('created_at', created_after)` when `created_after` param present
  - `.lte('created_at', created_before)` when `created_before` param present
- **Fix DELETE `/:id` bug** (from backlog): The `.update({ is_deleted: true })` call is missing `{ count: 'exact' }`, causing 404 detection to be broken. Add `{ count: 'exact' }` option.

**Tests (add to existing library test file):**
- PATCH: valid full update, partial update (only front), 404 for non-existent card, 404 for other user's card
- GET: filter by tag, filter by date range, combined filters

**Quality gates**: `npm run test`, `npm run typecheck`, `npm run lint:fix`

**Contract for frontend**: After this milestone, the API supports:
- `PATCH /cards/:id` — body: `{ front?, back?, tags?, notes?, domain?, product_source }` — returns `{ request_id, card: LibraryCard }`
- `GET /cards` — new query params: `tag`, `created_after` (ISO), `created_before` (ISO)

---

### M2: Frontend Shared Infrastructure

> **Session B** (first half)

**New npm dependencies:**
- `sql.js` — .apkg export (WASM, ~1.2MB, lazy-loaded)
- `jszip` — .apkg ZIP packaging
- `date-fns` — date formatting for date picker and relative timestamps

**New shadcn components:**
- `npx shadcn@latest add popover calendar command table tabs tooltip alert-dialog`

**Extract `src/components/cards/SanitizedHTML.tsx`** (NEW):
- Move the `SanitizedHTML` local component from `CardReview.tsx` (lines ~28-44) to its own file
- Named export: `export function SanitizedHTML({ html, className }: { html: string; className?: string })`
- Update `CardReview.tsx` to import from the new location

**Extend `src/types/cards.ts`:**
- Add to `CardFilters`: `tag?: string`, `created_after?: string`, `created_before?: string`
- Add new type:
  ```typescript
  export interface UpdateCardRequest {
    front?: string;
    back?: string;
    tags?: string[];
    notes?: string;
    domain?: CardDomain;
  }
  ```
- Add: `export type ExportFormat = 'apkg' | 'csv' | 'markdown' | 'json'`

**Extend `src/lib/api.ts`:**
- Add `updateCard(id: string, updates: UpdateCardRequest)` — PATCH `/cards/${id}`

**Extend `src/stores/cards.ts`:**
- `updateLibraryCard(id, updates)` — calls api.updateCard, updates card in `libraryCards` array
- `bulkDeleteLibraryCards(ids)` — calls api.deleteCards, removes all matching from `libraryCards`, decrements `total`
- Library selection state: `librarySelectedIds: Set<string>`, with `toggleLibrarySelection(id)`, `selectAllLibraryCards()`, `deselectAllLibraryCards()`, `selectLibraryPage()` (selects all on current page)
- Export transfer state: `exportCards: (LibraryCard | Card)[]`, `setExportCards(cards)`, `clearExportCards()`

**Extend `src/lib/hooks/useCards.ts`:**
- `useLibraryActions()` — fetchLibrary, deleteLibraryCard, bulkDeleteLibraryCards, updateLibraryCard, toggle/select/deselect
- `useLibrarySelection()` — librarySelectedIds
- `useExportCards()` — exportCards, setExportCards, clearExportCards

**Create `src/stores/settings.ts`** (NEW):
- Zustand store with `zustand/middleware` `persist` (localStorage)
- `libraryViewMode: 'grid' | 'list'` (default `'grid'`)
- `recentDeckNames: string[]` (max 5, FIFO)
- Actions: `setLibraryViewMode`, `addRecentDeckName`

**Extend `src/components/cards/CardEditor.tsx`:**
- Widen type to accept `Card | LibraryCard` (both share `id`, `front`, `back`, `tags`, `notes`)
- Add optional `notes` textarea field (backlog item: "CardEditor notes field — currently displayed but not editable")

**Tests (`tests/unit/cards.test.ts` or new `tests/unit/library.test.ts`):**
- `updateLibraryCard` — calls API, updates local state
- `bulkDeleteLibraryCards` — removes multiple cards, updates total
- Library selection — toggle, selectAll, deselectAll, selectPage
- Export transfer — set, clear

---

### M3: Library Page — Core Grid + Pagination

> **Session B** (second half)

**Create `src/components/cards/LibraryCardItem.tsx`** (NEW):
- Props: `card: LibraryCard`, `isSelected`, `isEditing`, `onToggleSelect`, `onEdit`, `onDelete`, `onSave`, `onCancelEdit`
- Grid mode: Card component showing front preview (SanitizedHTML, truncated ~3 lines via `line-clamp-3`), domain badge, tags as Badges, relative date (`formatDistanceToNow` from date-fns)
- Hover actions: edit (Pencil icon) and delete (Trash icon) buttons
- Click to expand: in-place toggle showing back content (SanitizedHTML)
- Checkbox for multi-select (top-left corner)
- When `isEditing`: render inline CardEditor

**Replace `src/routes/app/Library.tsx`:**
- On mount: call `fetchLibrary()` with defaults (page 1, limit 20, sort `created_at` desc)
- Local state: `editingCardId: string | null`, filter state (passed down to toolbar in M4)
- Grid view: responsive CSS grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`) of LibraryCardItem
- List view: shadcn Table with columns: front (truncated), domain, tags, created date, actions (edit/delete)
- Grid/list toggle button (from settings store `libraryViewMode`)
- Pagination bar at bottom: shadcn-style prev/next + page indicator
- Loading state: Skeleton cards (6-9 skeleton items matching grid layout)
- Empty state: When `total === 0` and no active filters — large empty state card with "Generate your first cards" heading + button linking to `/app`
- Filter empty state: When `total === 0` but filters are active — "No cards match your filters" with "Clear filters" button

---

### M4: Library Page — Filters, Bulk Actions, Undo Delete, Inline Edit

> **Session C**

**Create `src/components/cards/LibraryToolbar.tsx`** (NEW):
- **Domain filter**: shadcn Select dropdown, options from `CARD_DOMAINS` (imported from `lib/validation/cards.ts`)
- **Search**: Input with search icon, debounced 300ms (useEffect + setTimeout/clearTimeout pattern)
- **Tag filter**: Combobox (Popover + Command). Unique tags derived from `libraryCards` on current page. Multi-select not needed — single tag filter is sufficient.
- **Date range**: Two shadcn Calendar popovers labeled "From" / "To". Format selected dates as ISO strings for API.
- **Sort toggle**: Button group: "Newest" (created_at desc) / "Domain" (domain asc)
- **View toggle**: Grid icon / List icon buttons (sets `libraryViewMode` in settings store)
- **Active filter pills**: Show active filters as dismissable badges below the toolbar row
- All filter changes call parent callback -> `fetchLibrary()` with updated CardFilters, reset page to 1

**Wire up in Library.tsx:**
- Pass filter state + setters to LibraryToolbar
- "Select all on page" checkbox in page header area
- **Bulk action bar** (appears when `librarySelectedIds.size > 0`):
  - "N selected" count
  - "Export selected" button -> sets exportCards in store, navigates to `/app/export`
  - "Delete selected" button -> shadcn AlertDialog confirmation -> `bulkDeleteLibraryCards(ids)` -> toast success -> deselect all

**Undo delete (individual card):**
- On delete click: immediately remove card from local `libraryCards` (optimistic)
- Show sonner toast: `toast("Card deleted", { action: { label: "Undo", onClick: () => restore(card) }, duration: 30000 })`
- Track pending deletes in `useRef<Map<string, { card, timeoutId }>>`
- If "Undo" clicked: re-insert card into libraryCards at original position, clear timeout
- If toast dismissed/expires: fire `api.deleteCard(id)` (fire-and-forget, card already removed from UI)

**Inline editing:**
- `editingCardId` local state (same pattern as CardReview)
- On edit click: set `editingCardId`, CardEditor opens inline within LibraryCardItem
- On save: `updateLibraryCard(id, updates)` -> PATCH API -> success toast "Card updated"
- On cancel/error: revert, error toast

**Card count badge in `src/routes/app/AppLayout.tsx`:**
- On mount: lightweight fetch `GET /cards?limit=1&page=1` to get `pagination.total`
- Render shadcn Badge next to "Library" nav item text: `{total > 0 && <Badge variant="secondary">{total}</Badge>}`
- Store count in a simple `useState` (not Zustand — it's layout-specific)

---

### M5: Export Page — CSV/Markdown/JSON + Format Infrastructure

> **Session D** (first half)

**Create `src/lib/export/types.ts`** (NEW):
```typescript
export interface ExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
}

export interface ExportFormatConfig {
  id: ExportFormat;
  label: string;
  description: string;
  extension: string;
  options: ExportOptionField[];
}

export interface ExportOptionField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'boolean';
  defaultValue: string | boolean;
  choices?: { value: string; label: string }[];
}
```

**Create `src/lib/export/csv.ts`** (NEW):
- `exportCsv(cards, options: { separator, includeNotes, includeTags })` -> ExportResult
- Columns: front, back, tags (semicolon-joined within field), notes (optional)
- Proper CSV escaping: double-quote fields containing separator/newline/quotes
- UTF-8 BOM prefix (`\uFEFF`) for Excel compatibility
- MIME: `text/csv`

**Create `src/lib/export/markdown.ts`** (NEW):
- `exportMarkdown(cards, options: { includeNotes })` -> ExportResult
- Obsidian Spaced Repetition format:
  ```
  # {deckName}
  #flashcards

  {front_text}
  ?
  {back_text}
  <!--tags: tag1, tag2-->

  ---
  ```
- Strip HTML from front/back (plain text extraction from SanitizedHTML content)
- MIME: `text/markdown`

**Create `src/lib/export/json.ts`** (NEW):
- `exportJson(cards, options: { prettyPrint })` -> ExportResult
- Clean array: `{ front, back, tags, notes, card_type, domain }` per card
- Strip internal fields (user_id, is_deleted, confidence_scores, generation_request_id, etc.)
- Pretty print: 2-space indent
- MIME: `application/json`

**Create `src/lib/export/download.ts`** (NEW):
```typescript
export function triggerDownload(result: ExportResult): void {
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

**Create `src/lib/export/index.ts`** (NEW):
- `EXPORT_FORMATS: ExportFormatConfig[]` — registry of all 4 formats with labels, descriptions, option definitions
- `exportCards(cards, format, options)` -> `Promise<ExportResult>` — dispatcher that routes to correct format function
- APKG case: `const { exportApkg } = await import('./apkg')` (lazy, added in M6)

**Replace `src/routes/app/Export.tsx`:**
- Read `exportCards` from store on mount
- **No cards state**: If `exportCards` is empty, show CTA: "Select cards from your Library" (link) or "Generate new cards" (link)
- **Card source header**: "Exporting N cards from library selection" or "from generation"
- **Tag filter** (optional): If cards have tags, show tag pills to filter export subset
- **Format selector**: Grid of radio cards — icon + label + description per format. Selected format highlighted.
- **Format-specific options panel**: Conditional render based on selected format:
  - CSV: Separator (comma/tab select), Include tags (checkbox), Include notes (checkbox)
  - Markdown: Include notes (checkbox), Deck/file name (text input)
  - JSON: Pretty print (checkbox)
  - APKG: Deck name (text input, required) — wired in M6
- **Preview section**: Collapsed by default, expandable. Shows first 3 cards rendered in the chosen format. Monospace `<pre>` for text formats.
- **Export button**: Calls `exportCards()` dispatcher -> `triggerDownload()`. Disabled while exporting. Loading state.
- **Recent deck names**: Dropdown populated from `settings.recentDeckNames`, shown when APKG is selected

**Tests (`tests/unit/export.test.ts`):**
- CSV: escaping (commas in fields, quotes, newlines), BOM present, tab separator variant
- Markdown: SR format structure, HTML stripping, tag rendering
- JSON: field stripping, pretty print indentation

---

### M6: Export — APKG (sql.js WASM)

> **Session D** (second half)

**Port `src/lib/apkg/schema.ts`** (NEW):
- Copy verbatim from `flashcard-backend/docs/spikes/apkg-code/schema.ts`
- Contents: `APKG_SCHEMA` (DDL), `generateGuid()`, `fieldChecksum()`, `generateId()`, `buildColRow()`
- These are pure TypeScript string/math operations — no environment-specific code

**Port `src/lib/apkg/builder.ts`** (NEW):
- Port from `flashcard-backend/docs/spikes/apkg-code/generator.ts`
- **Key change**: Replace `import initSqlJs from 'sql.js/dist/sql-asm.js'` with:
  ```typescript
  import initSqlJs from 'sql.js';
  // Browser WASM initialization:
  const SQL = await initSqlJs({
    locateFile: (file: string) => `/${file}`,
  });
  ```
- Same `ApkgCard`, `ApkgOptions`, `ApkgResult` interfaces
- Same `generateApkg()` logic (create schema, insert col, loop notes+cards, export, zip)
- Add optional progress callback: `onProgress?: (stage: 'init' | 'building' | 'packaging') => void`

**WASM binary setup:**
- Copy `node_modules/sql.js/dist/sql-wasm.wasm` to `public/sql-wasm.wasm`
- Can be done manually or via a `postinstall` script in package.json: `"postinstall": "cp node_modules/sql.js/dist/sql-wasm.wasm public/sql-wasm.wasm"`

**Create `src/lib/export/apkg.ts`** (NEW):
```typescript
export async function exportApkg(
  cards: (Card | LibraryCard)[],
  options: { deckName: string },
  onProgress?: (stage: string) => void,
): Promise<ExportResult> {
  onProgress?.('init');
  const { generateApkg } = await import('@/lib/apkg/builder');

  onProgress?.('building');
  const apkgCards = cards.map(c => ({
    front: c.front,
    back: c.back,
    tags: c.tags,
  }));
  const result = await generateApkg({ deckName: options.deckName, cards: apkgCards });

  onProgress?.('packaging');
  const sanitizedName = options.deckName.replace(/[^a-zA-Z0-9\-_ ]/g, '');
  return {
    blob: new Blob([result.data], { type: 'application/octet-stream' }),
    filename: `${sanitizedName}.apkg`,
    mimeType: 'application/octet-stream',
  };
}
```

**Wire into `src/lib/export/index.ts`:**
- APKG case in dispatcher: `const { exportApkg } = await import('./apkg');`
- Vite will auto-split this into a separate chunk

**Wire into Export.tsx:**
- When APKG selected: show deck name input (required, validation: non-empty)
- Show progress indicator during export (3 stages: Loading WASM... / Building deck... / Packaging...)
- On success: save deck name to `settings.addRecentDeckName()`

**Tests (`tests/unit/apkg.test.ts`):**
- `generateGuid()` produces 10-char strings
- `fieldChecksum()` is deterministic
- `generateId()` produces unique values
- Full builder test: generate small .apkg, verify it's a valid ZIP (decompress with JSZip, check `collection.anki2` and `media` files exist)

---

### M7: Polish — Shortcuts, Generate->Export Flow, Docs

> **Session E**

**Keyboard shortcuts in Library.tsx** (lower priority — can defer):
- `useEffect` with `keydown` listener, gated on `document.activeElement` not being an input/textarea
- `j` / `k`: move focus index through card list
- `x`: toggle selection on focused card
- `d`: delete focused card (triggers undo flow)
- `e`: open editor on focused card
- Visual focus indicator: ring/outline on the focused card

**Generate -> Export flow:**
- `src/components/cards/CardReview.tsx`: Add "Export selected" button to the summary bar (alongside "Generate more" and "Discard all")
- On click: `setExportCards(selectedPendingCards)` + `navigate('/app/export')`
- `src/routes/app/Generate.tsx`: No changes needed if CardReview handles the navigation

**Documentation updates:**
- `docs/architecture.md`: Update directory structure to include export modules, library components, settings store. Update "Not Yet Implemented" section.
- `docs/session-log.md`: Append session notes for each session (A through E)
- `CLAUDE.md`: Update "Current Status" -> Phase 3 complete. Update "Next Session Tasks" to Phase 4.
- `docs/backlog.md`: Mark completed items (DELETE bug fix, CardEditor notes field, etc.). Add any new items discovered.

**Quality gates (final):**
- `npm run typecheck` — 0 errors
- `npm run lint:fix` — 0 warnings
- `npm run test` — all tests pass (16 existing + ~15-20 new)
- `npm run build` — succeeds, verify APKG chunk is separate from main bundle
- Backend: `npm run test` — all tests pass

## Dependency Graph

```
M1 (Backend PATCH + enhanced GET)
  |
  v
M2 (Shared infrastructure: types, store, deps, SanitizedHTML)
  |
  +--------+--------+
  |                 |
  v                 v
M3 (Library grid)  M5 (Export CSV/MD/JSON)   [parallel]
  |                 |
  v                 v
M4 (Filters/bulk)  M6 (Export APKG WASM)
  |                 |
  +--------+--------+
           |
           v
        M7 (Polish, shortcuts, docs)
```

## New Files (18)

| File | Purpose |
|------|---------|
| `src/components/cards/SanitizedHTML.tsx` | Extracted shared HTML sanitizer |
| `src/components/cards/LibraryCardItem.tsx` | Single card in library grid/list |
| `src/components/cards/LibraryToolbar.tsx` | Filters/search/sort/view toolbar |
| `src/stores/settings.ts` | User preferences (view mode, recent deck names) |
| `src/lib/export/types.ts` | Export type definitions |
| `src/lib/export/index.ts` | Format registry + dispatcher |
| `src/lib/export/csv.ts` | CSV exporter |
| `src/lib/export/markdown.ts` | Obsidian SR markdown exporter |
| `src/lib/export/json.ts` | JSON exporter |
| `src/lib/export/apkg.ts` | APKG adapter (lazy-loaded) |
| `src/lib/export/download.ts` | Browser download trigger utility |
| `src/lib/apkg/schema.ts` | Anki SQLite schema (ported from spike) |
| `src/lib/apkg/builder.ts` | WASM .apkg generator (ported from spike) |
| `tests/unit/library.test.ts` | Library store + actions tests |
| `tests/unit/export.test.ts` | Format exporter unit tests |
| `tests/unit/apkg.test.ts` | APKG builder unit tests |

## Modified Files (14)

| File | Changes |
|------|---------|
| `flashcard-backend/src/lib/validation/cards.ts` | Add `UpdateCardBodySchema`, extend `LibraryQuerySchema` with tag/date params |
| `flashcard-backend/src/routes/library.ts` | Add PATCH /:id, enhance GET / filters, fix DELETE bug |
| `src/types/cards.ts` | Add `UpdateCardRequest`, `ExportFormat`, extend `CardFilters` |
| `src/lib/api.ts` | Add `updateCard()` function |
| `src/stores/cards.ts` | Library selection, updateLibraryCard, bulkDelete, export transfer state |
| `src/lib/hooks/useCards.ts` | Add `useLibraryActions`, `useLibrarySelection`, `useExportCards` hooks |
| `src/components/cards/CardEditor.tsx` | Accept `LibraryCard` union type, add notes field |
| `src/components/cards/CardReview.tsx` | Import `SanitizedHTML` from shared location, add Export button |
| `src/routes/app/Library.tsx` | Replace placeholder with full library page |
| `src/routes/app/Export.tsx` | Replace placeholder with multi-format export page |
| `src/routes/app/AppLayout.tsx` | Card count badge on Library nav item |
| `src/routes/app/Generate.tsx` | Wire Export button in CardReview (M7) |
| `package.json` | Add sql.js, jszip, date-fns dependencies |

## Existing Code to Reuse

| What | Where | How it's reused |
|------|-------|----------------|
| Zustand card store (library slice) | `src/stores/cards.ts` | Already has `libraryCards`, `fetchLibrary`, `deleteLibraryCard` — extend, don't rewrite |
| API client (library methods) | `src/lib/api.ts` | Already has `getCards`, `deleteCard`, `deleteCards` — add `updateCard` only |
| Types (LibraryCard, CardFilters) | `src/types/cards.ts` | Already defined — extend CardFilters with 3 new fields |
| useLibrary hook | `src/lib/hooks/useCards.ts` | Already returns library state — add action hooks alongside |
| SanitizedHTML component | `src/components/cards/CardReview.tsx` (lines ~28-44) | Extract to shared file, no logic changes |
| CardEditor component | `src/components/cards/CardEditor.tsx` | Widen type, add notes field |
| CardItem pattern | `src/components/cards/CardReview.tsx` | Adapt props for LibraryCardItem (same structure, different card type) |
| APKG spike code | `flashcard-backend/docs/spikes/apkg-code/` | Port to browser: change sql.js init path only |
| CARD_DOMAINS constant | `src/lib/validation/cards.ts` | Reuse for domain filter dropdown options |
| Backend library routes | `flashcard-backend/src/routes/library.ts` | Extend existing route group — don't restructure |
| Backend validation schemas | `flashcard-backend/src/lib/validation/cards.ts` (line ~1262) | Extend existing LibraryQuerySchema in place |

## Verification

1. **Backend tests**: `npm run test` in `flashcard-backend/` — all pass including new PATCH + enhanced GET tests
2. **Frontend typecheck**: `npm run typecheck` — 0 errors
3. **Frontend lint**: `npm run lint:fix` — 0 warnings
4. **Frontend unit tests**: `npm run test` — all pass (existing 16 + new library/export/apkg tests)
5. **Frontend build**: `npm run build` — succeeds, verify APKG chunk is a separate lazy-loaded chunk
6. **Manual E2E flow**: Generate cards -> see in Library -> filter by domain -> edit a card inline -> select multiple -> bulk delete with undo -> export as CSV -> export as .apkg -> import .apkg into Anki desktop
7. **Manual Obsidian test**: Export as Markdown -> open .md file in Obsidian -> verify Spaced Repetition plugin recognizes the flashcard format
