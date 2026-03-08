# Session Log

## Session 1 — 2026-02-22 — Phase 1: Project Setup, Auth & Legal Pages

### What was done
- **M1**: Initialized Vite 6 + React 19 + TypeScript strict mode. Configured `@tailwindcss/vite` (v4), ESLint flat config, Vitest with jsdom, and `wrangler.jsonc` for SPA deployment.
- **M2**: Configured shadcn/ui (new-york style, neutral base, CSS variables). Installed 12 base components: button, card, input, label, separator, avatar, dropdown-menu, sheet, navigation-menu, badge, form, sonner. Added react-hook-form + @hookform/resolvers.
- **M3**: Created Supabase browser client (singleton), Zustand auth store, AuthGuard component, typed API client with `product_source: 'web_app'` injection. Defined all routes with React Router 7 library mode.
- **M4**: Built Login and Signup pages with Zod validation + react-hook-form. Created MarketingLayout (responsive header/footer). Wrote 8 auth store unit tests.
- **M5**: Implemented AppLayout with desktop sidebar + mobile sheet drawer. Active route highlighting, user avatar dropdown with sign out. Styled placeholder pages for Generate/Library/Export/Billing/Settings.
- **M6**: Built landing page (hero, 10-domain grid, features, how-it-works, CTA). Created pricing constants module and 3-tier pricing page (Free/Plus/Pro).
- **M7**: Added GDPR-compliant privacy policy and terms of service. Created build-time prerender script for SEO. Updated all documentation.

### Architecture decisions
- **No `@cloudflare/vite-plugin` in dev**: The CF plugin is excluded from vite.config.ts since this is a pure static SPA — Vite's standard dev server works perfectly. The `wrangler.jsonc` handles deployment config separately.
- **Tailwind v4 + Vite plugin**: Using `@tailwindcss/vite` instead of PostCSS. No `tailwind.config.ts` needed — CSS-first config via `@theme` in index.css.
- **React Router 7 library mode**: Using `<BrowserRouter>` + `<Routes>` + `<Route>` pattern (not createBrowserRouter/RouterProvider/loaders). Data fetching via api.ts + Zustand.
- **Zod v4**: Installed with npm; `@hookform/resolvers` v5.2.2 supports it natively.
- **Auth state outside React**: Zustand store initialized before React renders (`useAuthStore.getState().initialize()` in main.tsx). Both the store and api.ts import supabase.ts directly — no circular dependency.
- **Prerender approach**: Build-time static HTML via `tsx scripts/prerender.ts`. React components are the single source of truth; prerender wraps them in SEO-friendly HTML shells. Runs as `prebuild` npm hook.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 8/8 tests passing
- Vite build: succeeds (prebuild + build pipeline)
- Bundle size: 697 KB (single chunk, code splitting deferred to Phase 2)

### Next session tasks (Phase 2 — moved to backlog)
1. Card generation form + API integration
2. Card review/edit UI
3. Code splitting with lazy route imports
4. Connect to backend staging API for end-to-end testing

## Session 2 — 2026-02-22 — Phase 1 Code Review Fixes

### What was done
- **Error sanitization**: Login and Signup pages no longer leak raw Supabase error messages to the UI. Raw errors are logged to console for debugging; users see generic messages. The "already registered" detection in Signup is preserved.
- **Named export enforcement**: Changed `AuthGuard` from `export default` to named export, matching the convention that only route page components use default exports. Updated the import in `App.tsx`.
- **Prerender redirect fix**: Replaced broken inline `<script>` in prerender output. Old logic was a no-op or infinite redirect loop. New logic redirects `/pricing.html` → `/pricing`, letting wrangler's SPA fallback handle clean URLs.
- **Auth store audit**: Verified `supabase.auth.getSession()` usage, `product_source` injection, and no localStorage token storage. No changes needed.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 8/8 tests passing
- Vite build: succeeds (prebuild + build pipeline)

## Session 3 — 2026-02-22 — Logo Integration (Favicon, Header, OG Image)

### What was done
- **Favicon**: Replaced broken `/favicon.svg` reference in `index.html` with `/logo.svg` (SVG primary) + `/favicon.png` (32x32 PNG fallback). Added `og:image` meta tag.
- **Header logo**: Added `<img src="/logo.svg">` (h-7 w-7) to header branding in `MarketingLayout.tsx` and `AppLayout.tsx` (3 locations). Converted mobile header `<span>` to `<Link to="/">` for consistency.
- **OG image**: Created `scripts/generate-assets.ts` using `sharp` to produce `public/og-image.png` (1200x630, logo + title + tagline on white canvas) and `public/favicon.png` (32x32).
- **Prerender SEO**: Updated `scripts/prerender.ts` with favicon links, `og:image`, `twitter:image`, and upgraded `twitter:card` from `summary` to `summary_large_image`.
- **Dependency**: Added `sharp` as devDependency for asset generation.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 8/8 tests passing
- Vite build: succeeds (prebuild + build pipeline)

## Session 4 — 2026-02-22 — Favicon Refinement (Cropped Icon + Lineart)

### What was done
- **Cropped icon** (`3680ce9`): Created `public/logo-icon.svg` — viewBox-cropped version of the full logo for icon use. Updated `generate-assets.ts` to use dark charcoal background (#1a1a1a) with inverted (light) icon for both favicon and OG image. Added rounded corners (4px radius) to favicon via SVG mask compositing.
- **Lineart favicon** (`5abdda1`): Switched favicon source from `logo-icon.svg` to new `public/logo-lineart-icon.svg` (cropped line-art variant). Introduced `FAVICON_ICON_PATH` constant in `generate-assets.ts` to decouple favicon and OG image sources — OG image still uses `ICON_PATH` (original `logo-icon.svg`).
- **HTML updates**: Updated SVG favicon `href` in both `index.html` and `scripts/prerender.ts` to reference `/logo-lineart-icon.svg`.
- **New assets**: Added `public/logo-lineart.svg` (full lineart logo) and `public/logo-lineart-icon.svg` (cropped lineart icon).

### Architecture decisions
- **Separate icon paths**: `ICON_PATH` (OG image) and `FAVICON_ICON_PATH` (favicon) are independent constants, allowing each asset pipeline to evolve separately without side effects.
- **Favicon cascade**: HTML declares SVG favicon first (modern browsers), PNG fallback second (legacy). Both derive from the lineart source.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 8/8 tests passing
- Vite build: succeeds (prebuild + build pipeline)

## Session 5 — 2026-02-23 — Phase 2: Card Generation & Review

### What was done

**Backend (flashcard-backend/):**
- **Migration**: Created `cards` table with RLS policies, indexes, and `updated_at` trigger
- **Card persistence**: `persistGeneratedCards()` service for async `waitUntil` persistence after HTTP response
- **Library endpoints**: GET `/cards` (paginated, filterable), DELETE `/cards/:id` (soft delete), DELETE `/cards` (bulk soft delete)
- **Validation schemas**: `LibraryQuerySchema`, `DeleteCardParamsSchema`, `BulkDeleteRequestSchema`
- **Generate integration**: Wired `waitUntil(persistGeneratedCards(...))` into generate route
- **Tests**: 9 library integration tests with Proxy-based Supabase mock chain builder

**Frontend (flashcard-web/):**
- **M2 — Store + API client**:
  - Fixed `apiRequest` bug: `json.data as T` → `json as T` (backend returns top-level, not nested under `data`)
  - Added GET request support with `params` option for URLSearchParams
  - Created card types, Zustand card store, useCards/useUsage hooks, validation schema
  - Added API methods: generateCards, getCards, deleteCard, deleteCards, getUsage
  - 8 card store unit tests
- **M3 — GenerateForm**: 10 domain options with icons, language selection (ja/default), card style + difficulty toggle groups, max cards slider, URL param handoff for browser extension, error handling per API error contract
- **M4 — CardReview + CardEditor**: DOMPurify-sanitized HTML rendering, per-card select/edit/delete, quality filter (rejected/unsuitable collapsible), summary bar, select all/deselect all
- **M5 — Wiring**: Generate.tsx form↔review toggle, UsageDisplay in sidebar (desktop + mobile), UpgradeModal dialog
- **M6 — Code splitting**: `React.lazy()` + `<Suspense>` for all 11 route pages

### New dependencies
- `dompurify` + `@types/dompurify` — HTML sanitization for card previews
- shadcn components: select, textarea, slider, radio-group, toggle-group, dialog, progress, collapsible, checkbox, skeleton

### Architecture decisions
- **Zod `.default()` removed from form schema**: Caused type mismatch with `zodResolver` (input vs output types). Defaults are provided via `useForm({ defaultValues })` instead.
- **DOMPurify allowlist**: Only structural tags + `class`/`lang` attrs. Prevents XSS while preserving backend's `fc-*` CSS class structure.
- **Card IDs are client-side**: Backend generate response doesn't include persisted IDs, so `crypto.randomUUID()` assigns temporary IDs in the Zustand store.
- **`waitUntil` for persistence**: Cards are persisted asynchronously after the HTTP response returns, using Cloudflare Workers `executionCtx.waitUntil()`.
- **Proxy-based Supabase mock**: Test utility that handles arbitrary fluent API chain depths without manual mock setup.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 16/16 tests passing (8 auth + 8 cards)
- Backend: 158/158 tests passing (149 existing + 9 new library tests)
- Vite build: succeeds
- Bundle: index chunk 581 KB (down from 697 KB), 11 lazy route chunks

## Session 6 — 2026-02-27 — Phase 3B: Shared Infrastructure (M2) + Library Core (M3)

### What was done

**M2 — Shared Infrastructure:**
- **Dependencies**: Installed `sql.js`, `jszip`, `date-fns` as runtime deps. Added 7 shadcn components (popover, calendar, command, table, tabs, tooltip, alert-dialog). Copied `sql-wasm.wasm` to `public/` with `postinstall` script.
- **SanitizedHTML extraction**: Extracted inline `SanitizedHTML` function from `CardReview.tsx` into shared `src/components/cards/SanitizedHTML.tsx` for reuse across library and generation views.
- **Type extensions**: Added `EditableCard` (structural minimum for CardEditor), `UpdateCardRequest` (PATCH body), `ExportFormat`, and extended `CardFilters` with `tag`, `created_after`, `created_before`.
- **API client**: Added `updateCard()` PATCH endpoint to `api.ts`.
- **Settings store**: Created `src/stores/settings.ts` — first Zustand store with `persist` middleware. Stores `libraryViewMode` (grid/list) and `recentDeckNames` in localStorage.
- **Card store extensions**: Added `librarySelectedIds` (Set), `exportCards` array, `updateLibraryCard` (optimistic update + server response + rollback on failure), `bulkDeleteLibraryCards`, selection actions (`toggle/selectAll/deselectAll`), export transfer actions.
- **Hooks**: Extended `useLibrary` with new actions, added `useLibrarySelection` and `useExportCards` hooks.
- **CardEditor widening**: Changed prop type from `Card` to `EditableCard`, added `showNotes` prop and notes textarea field. Updated `CardReview` `CardItemProps` to match.
- **Tests**: Created `tests/unit/library.test.ts` with 8 tests (selection toggle, select/deselect all, optimistic update + rollback, bulk delete + pagination update, selection cleanup after delete, export transfer). Updated `cards.test.ts` `beforeEach` reset with new fields.

**M3 — Library Page:**
- **LibraryCardItem**: Grid/list card component with domain-specific color-coded badges (10 domains), `formatDistanceToNow` relative dates, expand/collapse for back content, hover-reveal edit/delete actions, multi-select checkbox, inline `CardEditor` with `showNotes`.
- **Library.tsx**: Replaced placeholder with full library page. Responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) and list views. Grid/list toggle persisted via settings store. Pagination bar (prev/next + page indicator). Bulk delete with `AlertDialog` confirmation. Three empty states: no cards (CTA to generate), no filter matches (clear filters), loading (6 skeleton cards). Select all/deselect all bar.

### New dependencies
- `sql.js` — SQLite in WASM (for .apkg export, Phase 3C)
- `jszip` — ZIP archive generation (for .apkg export, Phase 3C)
- `date-fns` — Relative date formatting (`formatDistanceToNow`)
- shadcn components: popover, calendar, command, table, tabs, tooltip, alert-dialog

### Architecture decisions
- **Zustand `persist` middleware**: First store to use `create<T>()(...)` double-call syntax required for TypeScript strict mode with middleware. localStorage key: `memogenesis-settings`.
- **Optimistic updates with rollback**: `updateLibraryCard` captures previous card state before mutating, applies server response on success, restores original on failure. Gives instant UI feedback while maintaining data integrity.
- **`EditableCard` as structural interface**: Avoids union type issues from `Card`'s index signature (`[key: string]: unknown`). Both `Card` and `LibraryCard` satisfy this shape, so `CardEditor` works with either.
- **Domain color coding**: Each of 10 domains mapped to distinct Tailwind color pairs (light/dark mode) for visual differentiation in the library grid.
- **`fetchLibrary` clears selection**: Library selection is page-scoped — navigating to a new page resets `librarySelectedIds` to prevent stale selections across pages.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 24/24 tests passing (8 auth + 8 cards + 8 library)
- Vite build: succeeds
- Bundle: Library chunk 28.8 KB (9.5 KB gzip), index chunk unchanged at ~581 KB

## Session 7 — 2026-02-27 — Phase 3C: Library Filters, Undo Delete, Export Actions

### What was done

**Task 1 — Domain constants extraction:**
- Created `src/lib/constants/domains.ts` with shared `DOMAIN_LABELS` and `DOMAIN_COLORS` maps.
- Updated `LibraryCardItem.tsx` to import from shared module (removed 25 lines of inline definitions).

**Task 2 — Undo delete store actions (TDD):**
- Added `removeLibraryCardLocally()` and `restoreLibraryCard()` to card store. `removeLocally` strips a card from state synchronously and returns it with its original index; `restore` splices it back.
- Added `useLibraryUndoDelete` hook selector.
- 4 new unit tests (remove + return card/index, null for unknown ID, clears selection, restore at correct index).

**Task 3 — LibraryToolbar component:**
- Created `src/components/cards/LibraryToolbar.tsx` — controlled filter toolbar with:
  - Domain select (All + 10 domains)
  - Debounced search input (300ms, local state for responsiveness)
  - Tag combobox (derived from current page's cards, Popover + Command)
  - Date range pickers (From/To with Calendar, mutual constraints)
  - Sort select (Newest/Oldest/By domain)
  - Active filter pills with individual clear buttons + "Clear all"

**Task 4 — Library.tsx integration:**
- Wired `LibraryToolbar` into main and filter-empty views.
- Replaced synchronous `deleteLibraryCard` with deferred undo pattern: `removeLibraryCardLocally` + 5s setTimeout + sonner toast with Undo action. Flush pending deletes on unmount.
- Added "Export selected" button alongside bulk delete (transfers selected cards via `setExportCards` + navigates to `/app/export`).
- Extended `hasActiveFilters` to include date filters.

**Task 5 — Generate→Export flow:**
- Added `onExportSelected` optional prop to `CardReview` with export button in summary bar.
- Wired handler in `Generate.tsx`: filters pending cards by selection, calls `setExportCards()`, navigates to `/app/export`.

**Task 6 — Card count badge:**
- Created `src/lib/hooks/useCardCount.ts`: hybrid hook reads store total when available, otherwise fires lightweight `getCards({ page: 1, limit: 1 })`.
- Added `Badge` to Library nav item in `AppLayout.tsx` (both desktop sidebar and mobile sheet). Caps at "999+".

### New files
- `src/lib/constants/domains.ts` — shared domain label/color maps
- `src/components/cards/LibraryToolbar.tsx` — filter toolbar component
- `src/lib/hooks/useCardCount.ts` — nav badge hook

### Architecture decisions
- **Undo delete (deferred API)**: Single card delete uses optimistic local removal + deferred `api.deleteCard()` behind a 5s timeout. Sonner toast "Undo" action cancels the timeout and restores the card at its original index. On unmount, pending deletes are flushed. Bulk delete retains AlertDialog confirmation (no undo) since it's already behind a confirmation step.
- **Toolbar as controlled component**: `LibraryToolbar` receives `filters` and emits `Partial<CardFilters>` updates. All filter state management stays in `Library.tsx` so the toolbar is stateless (except local search debounce and popover open states).
- **Tag combobox from current data**: Tags for the combobox are derived from the current page's `libraryCards` rather than a separate API call. Pragmatic tradeoff for MVP — tags aren't pre-defined entities in the schema.
- **Hybrid card count**: `useCardCount` avoids unnecessary API calls by checking the Zustand store first. Only fetches when the Library page hasn't been visited yet in the session.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 28/28 tests passing (8 auth + 8 cards + 12 library)
- Vite build: succeeds
- Bundle: Library chunk 124.6 KB (37.1 KB gzip, up from 28.8 KB due to Calendar/Command toolbar deps)

## Session 8 — 2026-02-27 — Phase 3D: Export Page (M5+M6)

### What was done

**Task 1 — Export types & download utility:**
- Created `src/lib/export/types.ts` — `ExportResult`, `ExportFormatConfig`, `ExportOptionField` interfaces.
- Created `src/lib/export/download.ts` — `triggerDownload()` using object URL → hidden `<a>` click → revoke.

**Task 2 — CSV formatter (TDD):**
- 10 tests: BOM, tab separator, comma/quote/newline escaping, tag joining, include/exclude notes/tags, HTML stripping, filename/mimeType.
- Created `src/lib/export/html.ts` — shared `stripHtml()` helper for CSV and Markdown.
- Created `src/lib/export/csv.ts` — configurable separator, optional columns, `\uFEFF` BOM for Excel.

**Task 3 — Markdown formatter (TDD):**
- 4 tests: Obsidian SR format (Q/?/A), HTML stripping, tags as HTML comment, card separators.
- Created `src/lib/export/markdown.ts` — Obsidian Spaced Repetition plugin format.

**Task 4 — JSON formatter (TDD):**
- 4 tests: clean fields, internal field stripping, pretty print, minified default.
- Created `src/lib/export/json.ts` — explicit property picking (avoids Card index signature issues).

**Task 5 — Export registry & dispatcher:**
- Created `src/lib/export/index.ts` — `EXPORT_FORMATS` config array (4 formats with metadata + options schema) + `dispatchExport()` router.
- APKG case uses `await import("./apkg")` for code splitting.

**Task 6 — Export page UI:**
- Replaced `Export.tsx` placeholder with full export page: empty state with CTAs, 2×2 format selector radio cards, dynamic options panel (text/boolean/select from registry), collapsible preview (first 3 cards), recent deck names dropdown, full-width export button with spinner state.

**Task 7 — APKG builder (ported from spike):**
- Ported `schema.ts` verbatim from `flashcard-backend/docs/spikes/apkg-code/`.
- Adapted `generator.ts` → `builder.ts`: changed from `sql-asm.js` to WASM build with `locateFile` for browser loading.
- Created `src/lib/export/apkg.ts` — adapter that maps `Card | LibraryCard` → `ApkgCard` and lazy-imports builder.
- 5 schema helper tests: GUID length/uniqueness, checksum determinism/distinctness, ID uniqueness.

### New files (10)
- `src/lib/export/types.ts`, `download.ts`, `html.ts`, `csv.ts`, `markdown.ts`, `json.ts`, `apkg.ts`, `index.ts`
- `src/lib/apkg/schema.ts`, `builder.ts`

### New dependencies
- `@types/sql.js` — type declarations for sql.js WASM

### Architecture decisions
- **Shared `stripHtml()` utility**: Extracted to `html.ts` rather than putting it in `csv.ts` and importing cross-formatter. Uses `[^\S\n]+` regex to collapse horizontal whitespace while preserving intentional newlines.
- **Explicit property picking for JSON**: `Card` has an index signature (`[key: string]: unknown`) which makes `Object.entries()` include all properties. JSON formatter uses explicit destructuring to pick only user-facing fields.
- **APKG code splitting confirmed**: Build output shows `builder-*.js` at 143 KB and `apkg-*.js` at 0.65 KB as separate chunks. The heavy sql.js + JSZip dependencies are only loaded when a user exports to APKG.
- **Format registry drives UI**: Adding a new export format only requires adding an entry to `EXPORT_FORMATS` and a formatter function — the Export page renders options dynamically from the registry.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 51/51 tests passing (8 auth + 8 cards + 12 library + 23 export)
- Vite build: succeeds
- Bundle: Export chunk 12.3 KB, APKG builder chunk 143.5 KB (code-split), index chunk ~587 KB

## Session 9 — 2026-02-27 — Perf: Fix Zustand Re-render Cascade

### What was done

**Audit fixes C1, C2, H1 — Zustand selector + React.memo + useCallback:**
- **`useCards.ts`**: Wrapped all 6 selector hooks with `useShallow` from `zustand/react/shallow`. Prevents cascading re-renders when unrelated store fields change — selectors now do shallow comparison of returned object values instead of reference equality.
- **`LibraryCardItem.tsx`**: Wrapped export in `React.memo`. Changed callback props (`onToggleSelect`, `onEdit`, `onDelete`) from `() => void` to `(id: string) => void` so parent can pass a single stable reference instead of per-card closures. Component calls callbacks with `card.id` internally.
- **`CardReview.tsx`**: Wrapped internal `CardItem` in `React.memo` with same ID-based callback pattern. Extracted 5 stable `useCallback` handlers (`handleToggleSelect`, `handleEdit`, `handleDelete`, `handleSave`, `handleCancelEdit`) to replace inline arrow functions in `.map()`.
- **`Library.tsx`**: Extracted `handleToggleSelect`, `handleEdit`, `handleCancelEdit` as `useCallback`. Wrapped existing `handleDelete` and `handleSave` in `useCallback`. Replaced all inline arrow callbacks in both grid and list `.map()` renders with stable references.

### Architecture decisions
- **`useShallow` over individual selectors**: Wrapping each hook's selector with `useShallow` is a one-line change that fixes the problem without modifying any consumer destructuring patterns. The alternative (15+ individual `useCardStore(s => s.foo)` calls) would require changing every consumer.
- **ID-based callbacks**: Instead of `onDelete={() => handleDelete(card.id)}` (new closure per card per render), callbacks accept `(id: string)` and the child calls `onCallback(card.id)`. This ensures `React.memo`'s shallow prop comparison sees the same function references across renders.
- **Three-layer prevention**: `useShallow` (store→hook), `React.memo` (parent→child), and `useCallback` (callback identity) work together — all three layers are needed to fully eliminate the O(N) re-render cascade.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 51/51 tests passing (8 auth + 8 cards + 12 library + 23 export)
- Vite build: succeeds
- Bundle: unchanged (useShallow is tree-shaken from existing zustand dep)

## Session 10 — 2026-02-28 — Audit Fix: API Contract Compliance (H2, M1)

### What was done

**H2 — 401 UNAUTHORIZED session clearing:**
- Added `setOnUnauthorized()` registration and debounced `notifyUnauthorized()` to `src/lib/api.ts`. Module-scoped callback pattern keeps api.ts decoupled from auth/routing.
- Wired handler in `src/main.tsx`: toasts "Session expired" + calls `signOut()`. AuthGuard then redirects to `/login`.
- 1-second debounce flag prevents concurrent 401s from triggering multiple signOut() calls.

**M1 — 429 RATE_LIMITED auto-retry:**
- Added retry loop inside `apiRequest()`: up to 2 retries, `retry_after` capped at 60s, defaults to 1s when absent.
- Abort-aware wait promise integrates with existing AbortController timeout as overall deadline.
- Updated `GenerateForm.tsx` RATE_LIMITED toast — retries are now exhausted by the time callers see the error, so removed misleading "wait Xs" message.

**Test infrastructure:**
- Added `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` env vars to `vitest.config.ts` for tests that import `api.ts` directly.
- Created `tests/unit/api.test.ts` with 10 tests covering 401 notification, debounce, 429 retry, cap, default, and abort behavior.

### New files
- `tests/unit/api.test.ts` — 10 API contract compliance tests

### Architecture decisions
- **Module-scoped callback over event bus**: `setOnUnauthorized()` stores a single function reference — no EventEmitter needed for a single consumer. The handler is set once in `main.tsx` and never changes.
- **Retry inside `apiRequest()` not at caller level**: All API callers (generate, getCards, deleteCard, etc.) get transparent retry compliance. The existing AbortController timeout acts as the overall deadline across retries — no per-retry timeout needed.
- **`_resetUnauthorizedState()` test helper**: Exported for test-only use (underscore convention). Avoids exposing internal `isHandlingUnauthorized` flag while enabling clean test isolation.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 61/61 tests passing (8 auth + 8 cards + 12 library + 23 export + 10 api)
- Vite build: succeeds

## Session 11 — 2026-02-28 — Audit Batch 3: Accessibility (C4, H6, H7, M6, M13)

### What was done

**C4 — Card actions invisible to keyboard users:**
- Added `focus-within:opacity-100` to the action buttons container in `LibraryCardItem.tsx`. When a keyboard user tabs to Edit/Delete buttons, the container becomes visible (same as mouse hover).

**M13 — Expand button missing focus indicator:**
- Added `outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]` plus `rounded py-0.5` to the "Show answer" / "Hide answer" button. Uses `focus-visible` (not `focus`) to avoid ring flash on mouse clicks.

**M6 — No skip-to-content link:**
- Added `id="main-content"` to the `<main>` element in `AppLayout.tsx`.
- Inserted skip-to-content `<a>` as first child of the layout container using `sr-only` → `focus:not-sr-only` pattern. Appears as a prominent pill at top-left when Tab is pressed; Enter jumps focus to main content.

**H6 — Domain badge dark mode contrast failing WCAG AA:**
- Updated all 10 domain color entries in `domains.ts`: `text-*-300` → `text-*-200` (lighter text), `bg-*-900/40` → `bg-*-950/60` (darker, more opaque background). Achieves ~5.5–7:1 contrast ratio (WCAG AA requires 4.5:1). Light mode classes unchanged.

**H7 — Export format selector missing radio semantics:**
- Replaced `<fieldset>` + `<button>` elements with Radix `RadioGroup.Root` + `RadioGroup.Item` primitives in `Export.tsx`.
- No `RadioGroupPrimitive.Indicator` child — cards themselves are the radio items (no visible dot).
- Screen readers now announce "Anki Package, radio, 1 of 4, checked". Arrow keys cycle between options via Radix roving-tabindex.
- Added `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]` for keyboard focus indication.
- Simplified `FormatCard` props: removed `onSelect` callback (Radix Root handles selection via `onValueChange`).

### Architecture decisions
- **Radix primitive over shadcn wrapper**: The shadcn `RadioGroup` component renders a visible circle indicator. For card-style radio items, we use the Radix primitive directly to get ARIA semantics without the unwanted dot.
- **`focus-within` vs `focus-visible`**: `focus-within` on the container (C4) triggers when any descendant has focus — appropriate for revealing a group of buttons. `focus-visible` on individual buttons (M13, H7) only activates for keyboard navigation, avoiding ring flash on mouse clicks.
- **Dark mode contrast strategy**: Shifted to `*-200` text (lighter) and `*-950/60` background (darker + more opaque) to maximize contrast. The `/60` opacity provides enough background distinction without being too heavy.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 61/61 tests passing (no test changes — CSS/ARIA only)
- Vite build: succeeds

## Session 12 — 2026-02-28 — Audit Batch 4: Export Robustness (C3, H3, H5)

### What was done

**H3 — Monotonic ID generator:**
- Replaced `idCounter`-based generator in `schema.ts` with monotonic `lastId` pattern. Uses current timestamp when clock has advanced, otherwise increments by 1. Safe across module reloads (Date.now() ~1.7 trillion always exceeds reset `lastId` of 0).
- Added test verifying 100 consecutive calls produce strictly increasing values.

**H5 — WASM path fix:**
- Replaced hardcoded `"/"` in `builder.ts` with `import.meta.env.BASE_URL` (Vite built-in, defaults to `"/"`, always has trailing slash). Supports subpath deploys.
- Added try/catch around `initSqlJs()` with user-friendly error message for WASM load failures.

**C3 — APKG builder batched inserts + progress/cancel:**
- Added `MAX_APKG_CARDS = 2000` constant with clear error message when exceeded.
- Extended `ApkgOptions` with `onProgress` callback and `signal` (AbortSignal).
- Replaced tight `for..of` loop with indexed loop that yields every 100 cards via `setTimeout(0)`, reports progress, and checks abort signal between batches.
- Extended `ApkgExportOptions` in `apkg.ts` adapter to forward `onProgress`/`signal`.
- Added optional `callbacks` parameter to `dispatchExport()` in `index.ts`, forwarded to APKG case only (other formats are synchronous and fast).
- Added `exportProgress` state and `exportAbortRef` (AbortController) to `Export.tsx`. Export button shows live progress % for APKG with >100 cards, doubles as cancel button during export. Cancel hint text shown below button for large exports.

### Architecture decisions
- **Cooperative multitasking via `setTimeout(0)`**: Yields to browser's macrotask queue every 100 cards (~200 SQL inserts), letting the browser paint frames and process user input (like clicking cancel). Overhead is negligible — 20 yields for 2000 cards.
- **AbortController at page level**: Created per-export in `handleExport`, ref stored for button access. Signal checked after yield points — catches aborts that arrive during the setTimeout. Cancelled exports silently return (no error toast).
- **Progress callback as `setState`**: `setExportProgress` passed directly as `onProgress` — React setState accepts values directly, no wrapper needed. Progress % only shown for APKG with >100 cards since small exports finish instantly.
- **Card limit at builder level**: 2000 cards = ~4000 SQL inserts, completes in <2s on low-end devices. Enforced in `generateApkg()` before WASM init to fail fast.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 62/62 tests passing (61 existing + 1 new monotonic ID test)
- Vite build: succeeds

## Session 13 — 2026-02-28 — Audit Batch 5: Security (C5, H8, M2, M4)

### What was done

**C5 — CSP and security headers:**
- Created `public/_headers` with Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy.
- CSP allows `'self'`, hashed inline prerender script, `'wasm-unsafe-eval'` (sql.js), `'unsafe-inline'` for styles (Radix UI runtime), and Supabase + backend staging in `connect-src`.

**H8 — Prerender template injection:**
- Added `escapeHtml()` utility for all 8 HTML attribute interpolations in `scripts/prerender.ts`.
- Replaced manual JSON-LD template with `JSON.stringify` for safe serialization.
- Added CSP hash maintenance comment above inline redirect script.

**M2 — Auth error console leakage:**
- Removed `console.error` from `Login.tsx` and `Signup.tsx`. User-facing messages are already generic; Supabase auth error objects contain internal details that shouldn't appear in DevTools.

**M4 — DOMPurify table tag over-allowlisting:**
- Removed 6 table-related tags (`table`, `thead`, `tbody`, `tr`, `th`, `td`) from `SanitizedHTML.tsx` allowlist. No backend prompt generates table elements — allowlist now matches the `fc-*` contract exactly.

### Architecture decisions
- **`_headers` file over Worker middleware**: For static asset serving, Cloudflare parses `_headers` at the edge without requiring a Worker script. Vite copies `public/_headers` → `dist/_headers` at build time.
- **CSP hash for inline script**: The prerender redirect script is the only inline `<script>`. Hashing it avoids `'unsafe-inline'` for scripts while keeping the redirect functional. A comment in the source reminds to recompute the hash if the script changes.
- **`JSON.stringify` for JSON-LD**: Eliminates quote-escaping bugs that manual template interpolation can introduce. The output is valid JSON by construction.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 62/62 tests passing (no test changes)
- Vite build: succeeds, `dist/_headers` present

## Session 14 — 2026-02-28 — Audit Batch 6: Tests & Cleanup (H4, L1, L2, L9, L10, L11)

### What was done

**H4 — APKG builder tests:**
- Created `tests/unit/apkg-builder.test.ts` (12 tests). Mocks sql.js and jszip at module level. Covers validation (empty/overflow), database operations (schema DDL, col insert, note/card counts, tags formatting), ZIP packaging (file entries, result shape), and progress/cancellation (batch callbacks, abort signal, finally-block cleanup).

**L10 — Download utility tests:**
- Created `tests/unit/download.test.ts` (5 tests). Stubs `URL.createObjectURL`/`revokeObjectURL`. Tests Blob creation for string and ArrayBuffer content, anchor attributes, click trigger, and URL lifecycle.

**L9 — Export formatter edge case tests:**
- Appended 10 edge case tests to `tests/unit/export.test.ts`: CSV (empty tags, Unicode CJK+emoji, empty fields, special char tags), Markdown (single card no separator, filename sanitization, filename truncation at 50 chars), JSON (empty tags, Unicode, all-empty-strings card).

**L11 — API error path tests:**
- Appended 7 tests to `tests/unit/api.test.ts`: error status handling (400/402/409/413/500 with code, requestId, details preservation), network error (TypeError → status 0), timeout (AbortError → status 408).

**L1 — Deleted 6 unused shadcn components:**
- Removed `form.tsx`, `navigation-menu.tsx`, `radio-group.tsx`, `table.tsx`, `tabs.tsx`, `tooltip.tsx`. Zero imports confirmed across `src/`.

**L2 — Removed unused `next-themes` dependency:**
- `npm uninstall next-themes`. Zero imports confirmed.

**L3 — Won't fix:**
- `sharp` IS used by `scripts/generate-assets.ts`. Audit finding was incorrect.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 96/96 tests passing (62 → 96, +34 new tests)
- Vite build: succeeds

## Session 15 — 2026-02-28 — Audit Batch 7: Remaining Fixes (M3, M5, M7, M9, L5, L6)

### What was done

**M3 — Bulk delete error handling + rollback:**
- Refactored `bulkDeleteLibraryCards` in `stores/cards.ts` from fire-then-update to optimistic removal with snapshot. On API failure, rolls back `libraryCards`, `librarySelectedIds`, and `libraryPagination`, then re-throws so the caller (`Library.tsx`) can display a toast.

**M5 — Preserve ruby/furigana in text exports:**
- Added regex to `stripHtml()` in `lib/export/html.ts` that converts `<ruby>kanji<rt>reading</rt></ruby>` → `kanji(reading)` before generic tag stripping. 3 tests added covering single, multi-ruby, and ruby-within-HTML cases.

**M7 — Exhaustive default case in export dispatcher:**
- Added TypeScript `never` exhaustive check as default case in `dispatchExport()` switch. Catches both compile-time (missing case for new union member) and runtime (bypassed type system) errors.

**M9 — Auth listener leak prevention:**
- Added module-scoped `authUnsubscribe` handle in `stores/auth.ts`. `initialize()` now calls it before re-subscribing, preventing listener accumulation on hot reload. 1 test added verifying double-init cleans up the first listener.

**L5 — Include card ID in JSON export:**
- Added `id` field to `cleanCard()` in `lib/export/json.ts`. Updated 2 existing tests that asserted `id` was absent; now verify its presence and correct value.

**L6 — Remove phantom Default deck from APKG:**
- Removed hardcoded `Default` deck (id=1) from `decks` JSON in `lib/apkg/schema.ts`. Updated `conf.activeDecks` and `conf.curDeck` to reference `deckId` instead of `1`. `dconf` entry (scheduling config profile) retained. 1 test added verifying no "Default" deck name in col params.

### Items triaged as skip/defer
- M8 (skip): GUID alphabet already correct (91 chars verified)
- M10 (defer): Library.tsx refactoring — no user-facing impact
- M11 (defer): Toolbar debounce double-update — negligible
- M12 (defer): Export sub-component memo — imperceptible with 4 items
- L4 (skip): Duplicate select-all — UX is fine
- L7 (skip): Tag separators differ by format — intentional per-app convention
- L8 (skip): tw-animate-css — no measurable impact

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 101/101 tests passing (96 → 101, +5 new tests)
- Vite build: succeeds

## Session 16 — 2026-02-28 — Phase 3F: Keyboard Shortcuts + Staging Deployment

### Pre-work
- Committed backlog fix (removed already-fixed critical bug entry) on `security/batch-5-csp-sanitize-auth`
- Merged `security/batch-5-csp-sanitize-auth` → `main` (fast-forward, 8 commits)
- Created `phase-3f/polish` branch from main

### What was done

**Keyboard shortcuts:**
- Created `useKeyboardShortcut` hook (`src/lib/hooks/useKeyboardShortcut.ts`) — reusable global keydown listener with Ctrl/⌘ auto-detection, input field suppression (except Ctrl+Enter in textarea), enabled/disabled toggle, ref-based callback to prevent stale closures.
- Added `isMac()` helper for platform-aware hint text (⌘ vs Ctrl).
- Wired `Ctrl+Enter` in `GenerateForm.tsx` — triggers form submission from the content textarea. Added hint text below the Generate button.
- Wired `Ctrl+E` in `Export.tsx` — triggers export when cards are loaded and not currently exporting. Added hint text below the Export button.
- Wrote 12 unit tests (`tests/unit/keyboard-shortcut.test.ts`): fires on Ctrl+key, fires on Meta+key, skips without modifier, skips wrong key, case-insensitive matching, disabled flag, re-enable, input suppression for Ctrl+E, textarea suppression for Ctrl+E, Ctrl+Enter allowed in textarea, Ctrl+Enter blocked in input, cleanup on unmount.

**Staging deployment config:**
- Created `.env.staging` with staging backend URL + shared Supabase project.
- Added `env.staging` to `wrangler.jsonc` with `memogenesis-web-staging` Workers name.
- Added `build:staging` and `deploy:staging` scripts to `package.json`.
- Added `.env.staging` to `.gitignore`.
- Added production backend URL (`flashcard-backend.luiswgordon.workers.dev`) to CSP `connect-src` in `public/_headers`.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 113/113 tests passing (101 → 113, +12 new keyboard shortcut tests)
- Vite build: succeeds

## Session 17 — 2026-02-28 — Docs: Align phase numbering across all project docs

### What was done
- Updated `docs/architecture.md` and `README.md` to match the PRD restructuring that split old Phase 3 (library + export) into Phase 3 (Library) + Phase 4a (Export).
- Previous session (16.5) had already aligned `CLAUDE.md` and `MEMORY.md`; this session completed the cascade.

**architecture.md (5 changes):**
- Tech stack table: `Export (Phase 3C)` → `Export (Phase 4a)`
- Section heading: `## Directory Structure (Phase 3)` → `## Directory Structure` (removed stale phase tag)
- Directory tree: `Billing.tsx` placeholder `(Phase 4)` → `(Phase 4b)`
- Directory tree: Added `scripts/` (generate-assets.ts, prerender.ts) and `docs/` (backlog.md, audits/, plans/) entries
- Not Yet Implemented: `(Phase 4)` → `(Phase 4b)`

**README.md (4 changes):**
- Status line: `Phase 1 complete` → `Phases 1–3 + 4a complete` with updated feature summary
- Commands: Added `build:staging`, `deploy:staging`, `test:watch`; clarified `deploy` as `(production)`
- Tech stack: `Billing (Phase 4)` → `Billing (Phase 4b)`
- Tech stack: `Client-side .apkg generation (Phase 3)` → `Client-side .apkg export (Phase 4a)`

### Quality gates
- No code changes — documentation only
- Verified with grep: no stale phase references remain in either file

## Session 18 — 2026-02-28 — Phase 4b: Billing & Stripe Checkout Integration

### What was done
- **Step 1 — Type narrowing**: Added `BillingTier`, `SubscriptionStatus` union types; narrowed `UsageResponse.tier`/`.status`; added `CheckoutResponse` and `PortalResponse` types.
- **Step 2 — API methods**: Added `createCheckoutSession()` (POST /billing/checkout), `getBillingPortalUrl()` (GET /billing/portal), and `USAGE_CHANGED_EVENT` constant to `api.ts`.
- **Step 3 — Usage refresh**: `useUsage` hook listens for `USAGE_CHANGED_EVENT` and refetches. Card store dispatches the event after successful generation. This fixes the known backlog item where sidebar usage counter didn't update after generation.
- **Step 4 — Billing page**: Full rewrite of `Billing.tsx` placeholder. Sections: subscription warning banner (status-aware), current plan card with tier badge, usage card with progress bar + overage, conditional action buttons. Post-checkout handling: `?checkout=success` polls for tier update every 2s for 10s, `?checkout=canceled` shows info toast. URL params cleaned after processing.
- **Step 5 — UpgradeModal**: Replaced `<Link to="/app/billing">` with actual `createCheckoutSession()` call. Per-button loading spinner, all buttons disabled during redirect, error toast on failure.
- **Step 6 — Pricing helper**: Added `findTierByApiName()` to `pricing.ts` for looking up tier display data from API response.
- **Step 7 — Tests**: 24 new tests (137 total): `billing-api.test.ts` (8), `billing.test.ts` (11), `usage-refresh.test.ts` (5). Fixed existing `cards.test.ts` mock to include `USAGE_CHANGED_EVENT` export.
- **Step 8 — Quality gates**: All gates pass. Installed `alert` shadcn component. Billing chunk: 8.45 KB (3.10 KB gzip).

### Architecture decisions
- **Custom DOM events for cross-component refresh**: `USAGE_CHANGED_EVENT` uses `window.dispatchEvent()` / `addEventListener()` — zero coupling between card store and usage hook. No new dependencies or state lifting.
- **Post-checkout polling**: `setInterval` for 10s max after Stripe redirect. Cleans up on unmount. URL params cleaned with `replace: true`.
- **Per-button loading state**: `checkoutLoadingTier` tracks which upgrade button was clicked, enabling spinner on correct button while disabling all.

### Quality gates
- TypeScript strict: 0 errors
- ESLint: 0 warnings
- Vitest: 137/137 tests pass (24 new)
- Vite build: succeeds

### Next session tasks
- **Backend prerequisite**: Deploy `product_source` fix to backend `CheckoutRequestSchema` before testing
- **Phase 5**: Account settings, data export

## Session 18 — 2026-03-01 — Phase 5a: Account Settings

### What was done
- **Step 0 — Auth-aware marketing header**: `MarketingLayout.tsx` now checks `useAuthStore` for a session. Authenticated users see a "Go to App" button instead of login/signup buttons. Applied to both desktop nav and mobile Sheet.
- **Step 1 — Account types**: Added `AccountExportResponse` and `DeleteAccountResponse` interfaces to `src/types/cards.ts`.
- **Step 2 — API functions**: Added `exportAccountData()` (GET `/account/export`, 30s timeout) and `deleteAccount()` (DELETE `/account` with `{ confirm: true }`) to `src/lib/api.ts`.
- **Step 3 — Auth store**: Added `updatePassword(newPassword)` method to Zustand auth store, delegates to `supabase.auth.updateUser()`. Returns `{ error }` consistent with signIn/signUp pattern.
- **Step 4 — Validation**: Added `changePasswordSchema` to `src/lib/validation/auth.ts` — Zod refinement for password match with field-level error path.
- **Step 5 — Settings page**: Complete rewrite of `Settings.tsx` with 4 card sections:
  1. **Account Info** — email (read-only) + member since date from auth store user
  2. **Change Password** — react-hook-form + zodResolver, success toast + form reset
  3. **Data Export** — downloads GDPR JSON via `exportAccountData()` + `triggerDownload()`
  4. **Danger Zone** — AlertDialog with email confirmation, sequential delete → signOut → navigate
- **Step 6 — Tests**: 13 new tests (150 total): `settings-api.test.ts` (7), `settings-validation.test.ts` (4), `auth.test.ts` (+2 for updatePassword).

### Architecture decisions
- **Controlled AlertDialog for delete** — uses `open`/`onOpenChange` instead of `AlertDialogTrigger`/`AlertDialogAction` so dialog stays open during async delete + shows loading state and errors.
- **Sequential deletion flow** — `await deleteAccount()` → `await signOut()` → `navigate("/")` prevents auth listener race conditions.
- **Reused `triggerDownload()`** — same utility from Export page for JSON data download.
- **Auth-aware marketing header** — single "Go to App" button replaces login/signup when session exists.

### Quality gates
- TypeScript strict: 0 errors
- ESLint: 0 warnings
- Vitest: 150/150 tests pass (13 new)
- Vite build: succeeds (Settings chunk: 7.35 KB)

### Next session tasks
- **Phase 5 polish**: 404 page, dark mode, data export from Settings

## Session 19 — 2026-03-01 — Fix Phase 5a Build Failure + CSP Violation

### What was done
- **Fix 1 — SSR-safe Supabase init**: Phase 5a's `MarketingLayout` → `useAuthStore` → `supabase.ts` import chain caused prerender to crash (`import.meta.env` is `undefined` under `tsx`/Node.js). Fixed with optional-chain `import.meta.env?.` + `typeof window` guard on both the env throw and `createClient()` call.
- **Fix 2 — CSP for Zod v4**: Added `'unsafe-eval'` to `script-src` in `public/_headers`. Zod v4 uses code generation for compiled schema validators at runtime, which was blocked by CSP.
- **Doc update**: Added SSR safety note to Prerender section in `architecture.md`.

### Architecture decisions
- **Placeholder Supabase client in SSR**: During prerender, `supabase` is `undefined as unknown as SupabaseClient` — safe because no Supabase calls are made outside the browser. This avoids Supabase's internal URL validation which throws on empty strings.
- **`'unsafe-eval'` trade-off**: Zod v4's compiled-schema architecture requires eval-like capabilities. Alternative was downgrading to Zod v3 (interpreter-based) but that would cascade across all schemas and hookform resolver config.

### Quality gates
- TypeScript strict: 0 errors
- ESLint: 0 warnings
- Vitest: 150/150 tests pass
- Prerender: 4/4 pages
- Vite build: succeeds

### Next session tasks
- **Phase 5 polish**: 404 page, dark mode

## Session 20 — 2026-03-01 — Phase 5 Polish: 404 Page + Dark Mode

### What was done

**404 page:**
- Created `src/routes/NotFound.tsx` — centered hero layout with `FileQuestion` icon, "404" heading, two CTA buttons (Go home / Go to app), wrapped in `MarketingLayout` for consistent header/footer.
- Added lazy import + `path="*"` catch-all route as last child in `App.tsx`.

**Dark mode — theme infrastructure:**
- Added `ThemeMode` type (`"system" | "light" | "dark"`), `themeMode` state, and `setThemeMode` action to `stores/settings.ts`. Added `subscribeWithSelector` middleware for slice-level subscriptions.
- Added `applyTheme()` in `main.tsx` — reads `themeMode`, resolves via `matchMedia` for "system", toggles `.dark` class on `<html>`. Runs before `createRoot()` to prevent FOWT.
- Subscribed to store changes: `useSettingsStore.subscribe((s) => s.themeMode, applyTheme)`.
- Added `matchMedia("prefers-color-scheme: dark")` change listener for live OS preference sync.

**Dark mode — Settings UI:**
- Added Appearance card to `Settings.tsx` between Account Info and Change Password.
- 3-option button group (System/Light/Dark) with `Monitor`/`Sun`/`Moon` lucide icons.

**Toast theming:**
- Added `useResolvedTheme()` hook in `App.tsx` — uses `useSyncExternalStore` + `MutationObserver` to observe `.dark` class on `<html>`.
- Passes resolved `"light" | "dark"` to Sonner `<Toaster theme={resolvedTheme} />`.
- Removed hardcoded `theme="light"` from `sonner.tsx` wrapper.

**Tests:**
- `tests/unit/not-found.test.ts` (5 tests): heading, subtitle, layout, links
- `tests/unit/theme.test.ts` (8 tests): store defaults, setThemeMode, applyTheme dark/light/system

### New files
- `src/routes/NotFound.tsx`
- `tests/unit/not-found.test.ts`
- `tests/unit/theme.test.ts`

### Modified files
- `src/App.tsx` — NotFound lazy import, catch-all route, `useResolvedTheme`, Toaster theme prop
- `src/stores/settings.ts` — `ThemeMode`, `themeMode`, `setThemeMode`, `subscribeWithSelector`
- `src/main.tsx` — `applyTheme()`, store subscription, matchMedia listener
- `src/routes/app/Settings.tsx` — Appearance card with theme toggle
- `src/components/ui/sonner.tsx` — Removed hardcoded `theme="light"`

### Architecture decisions
- **`applyTheme()` before `createRoot()`**: Synchronous DOM class toggle before React renders the first frame prevents flash of wrong theme. The `.dark` class drives CSS variable overrides immediately.
- **`useSyncExternalStore` + MutationObserver for toast theme**: Decouples Sonner from the Zustand store. Observes the actual `.dark` class on `<html>` — guaranteed consistent with what the user sees regardless of source (store change, OS change, DevTools).
- **`subscribeWithSelector` middleware**: Enables subscribing to a specific slice (`themeMode`) so `applyTheme` only fires when the theme actually changes, not on every store update.
- **Mocked store in tests**: jsdom + Node 22 has a broken `localStorage` stub (no `setItem`). Theme tests mock the store module to isolate DOM class logic from Zustand persist internals.

### Quality gates
- TypeScript strict: 0 errors
- ESLint: 0 warnings
- Vitest: 163/163 tests pass (150 → 163, +13 new)
- Vite build: succeeds (NotFound chunk: 1.44 KB, Settings chunk: 9.46 KB)

### Next session tasks
- Production deployment prep

## Session 20 — 2026-03-04 — Codebase Audit Fixes

### What was done
Implemented 5 findings from the full codebase audit report (high and medium priority):

1. **CSP hardening**: Removed `'unsafe-eval'` from `script-src` in `public/_headers`. Only `'wasm-unsafe-eval'` (needed for sql.js WASM) remains — closes an unnecessary XSS vector.
2. **Cache-Control headers**: Added per-path caching directives — `immutable` for hashed `/assets/*` and `sql-wasm.wasm`, `no-cache` for HTML files.
3. **ErrorBoundary**: New `src/components/ErrorBoundary.tsx` class component wraps all Routes in `App.tsx`. Catches unhandled render errors and shows a recovery UI (reload + go home) instead of a white screen.
4. **Library fetch error surfacing**: Added `libraryError` state to the cards store. `fetchLibrary` now captures the error message on failure instead of silently swallowing it. Library page renders a distinct error state with "Try again" button.
5. **Checkbox accessibility**: Added `aria-label` to all selection checkboxes (select-all in Library and CardReview, per-card in LibraryCardItem and CardReview).

### Files changed
- `public/_headers` — CSP fix + Cache-Control headers
- `src/components/ErrorBoundary.tsx` — new file
- `src/App.tsx` — ErrorBoundary wrapper
- `src/stores/cards.ts` — `libraryError` state + error capture in `fetchLibrary`
- `src/lib/hooks/useCards.ts` — expose `libraryError` in `useLibrary` hook
- `src/routes/app/Library.tsx` — error state UI + aria-label
- `src/components/cards/LibraryCardItem.tsx` — aria-label
- `src/components/cards/CardReview.tsx` — aria-labels (×2)

### Quality gates
- TypeScript strict: 0 errors
- ESLint: 0 warnings
- Vitest: 163/163 tests pass

### Next session tasks
- Production deployment prep

## Session 21 — 2026-03-05 — Generate Form: User Guidance + Content Focus Highlighting

### What was done
- **`GenerateRequest` type**: Added `user_guidance?: string` field to `src/types/cards.ts`.
- **Store threading**: Added `userGuidance?: string` parameter to `generateCards` action in `stores/cards.ts`, passed through as `user_guidance` in the API request body.
- **GenerateForm UI**: Added two-part "Focus" section (visible when content >= 10 chars):
  1. **Content highlight panel**: Read-only mirror div of pasted content. Text selection triggers a floating "Add focus" button (positioned via `getBoundingClientRect`). Clicking adds the selection as a Badge pill (max 5 highlights, 80 chars each). Pills have X remove buttons and N/5 counter. Floating button dismissed on scroll (div + window) and selection collapse.
  2. **Free-text guidance textarea**: Independent `<Textarea>` with 500 char max, character counter that turns `text-destructive` at >480 chars.
- **Submit concatenation**: Highlights serialized as `"Focus on: term1; term2."`, joined with free text, capped at 500 chars, sent as `userGuidance` (omitted entirely if empty).

### Architecture decisions
- **Local state, not react-hook-form**: Highlights and freeText are managed via `useState` since they're not form fields — they're derived into `userGuidance` only at submit time. Keeps the Zod schema unchanged.
- **Floating button via fixed positioning**: Uses `getBoundingClientRect()` for pixel-accurate placement near the selection. Scroll listeners on both the mirror div and window clear the button position to prevent drift.

### Quality gates
- TypeScript strict: 0 errors
- ESLint: 0 warnings
- Vitest: 163/163 tests pass (no test changes — UI feature, existing tests unaffected)

## Session 22 — 2026-03-05 — User Language Preference + Generate Form Language Selectors + Mobile Highlight Fix

### What was done
- **API layer**: Added `UpdateLanguageResponse` type, `source_language`/`output_language` fields to `GenerateRequest`, `updateUserLanguage()` API function.
- **Settings store**: Added `userLanguage` (persisted) + `setUserLanguage` action that calls API then stores server response value.
- **Settings page**: New "Language" card between Appearance and Change Password — text input for BCP-47 code, save button with loading state, synced from store via useEffect.
- **GenerateForm language controls**:
  - Expanded `LANG_HOOK_OPTIONS` from 2 to 6 options (JA, ZH, KO, AR, RU, Other) matching all backend sub-hooks.
  - Added "Your language" input (for lang domain) — initializes from settings store `userLanguage`, maps to `source_language`.
  - Added "Output language" input (for non-lang domains) — maps to `output_language`.
  - Language fields threaded through cards store → API request.
- **Mobile highlight fix**: Replaced `onMouseUp` handler + basic `selectionchange` listener with unified `selectionchange` effect using 300ms debounce. Works on both desktop click and mobile long-press/drag.
- **Form validation**: Added BCP-47 regex validation on `sourceLanguage`/`outputLanguage` in `generateFormSchema` (matches backend pattern).

### Architecture decisions
- **Server-first language save**: `setUserLanguage` awaits API response and stores the server-returned value (post-coercion), preventing client/server mismatch when null→'en' coercion occurs.
- **Language state outside react-hook-form**: `sourceLanguage`/`outputLanguage` managed as local `useState` (same pattern as highlights/freeText) since they need conditional submit logic per domain.
- **Debounced selectionchange**: 300ms debounce on show, immediate clear on collapse — prevents flash during mobile drag while keeping desktop responsive.

### Files modified (7)
- `src/types/cards.ts` — `UpdateLanguageResponse`, `source_language`/`output_language` on `GenerateRequest`
- `src/lib/api.ts` — `updateUserLanguage()` function
- `src/stores/settings.ts` — `userLanguage` state + `setUserLanguage` action
- `src/stores/cards.ts` — `sourceLanguage`/`outputLanguage` params threaded through `generateCards`
- `src/lib/validation/cards.ts` — BCP-47 validated `sourceLanguage`/`outputLanguage` fields
- `src/routes/app/Settings.tsx` — Language preference card
- `src/components/cards/GenerateForm.tsx` — 6-option lang hooks, language inputs, mobile highlight fix

### Quality gates
- TypeScript strict: 0 errors
- ESLint: 0 warnings
- Vitest: 163/163 tests pass (no test changes)

## Session 23 — 2026-03-05 — Fix 3 Bugs from Language/Highlight Implementation

### What was done
Fixed three bugs introduced in Session 22:

1. **"Validation failed" on generate**: Removed `sourceLanguage`/`outputLanguage` from `generateFormSchema` Zod schema. These fields are local React state (not registered with react-hook-form), so zodResolver validation failed on `undefined` values due to Zod 4's `.optional().or(z.literal(""))` union semantics. Backend validates non-empty values server-side.
2. **Outdated lang domain description**: Changed from "Japanese-English vocabulary & grammar" to "Vocabulary, grammar & translations" to reflect multi-language support (6 languages).
3. **Mobile highlight not working**: Added `touchend` event listener on the highlight div as a fallback for unreliable `selectionchange` on some mobile browsers. Extracted shared `showButtonForSelection` helper used by both the debounced `selectionchange` handler and the `touchend` handler (50ms delay to let browser finalize selection).

### Files modified (2)
- `src/lib/validation/cards.ts` — removed `sourceLanguage`/`outputLanguage` from schema
- `src/components/cards/GenerateForm.tsx` — updated lang description, added `touchend` fallback

### Quality gates
- TypeScript strict: 0 errors
- ESLint: 0 warnings
- Vitest: 163/163 tests pass

## Session 24 — 2026-03-07 — CSP Update + Error Toast Improvement

### What was done
Two small fixes:

1. **CSP update** (`public/_headers`): Added second script hash (`sha256-ADYqsdicbM/...`) and `'unsafe-eval'` to `script-src` to support updated prerender inline script.
2. **Error toast improvement** (`GenerateForm.tsx`): Default generation error toast now shows the actual error message from the API response instead of generic "Something went wrong", with request ID appended as reference.

### Files modified (2)
- `public/_headers` — updated Content-Security-Policy script-src
- `src/components/cards/GenerateForm.tsx` — error toast shows `error.message` instead of generic text

### Quality gates
- TypeScript strict: 0 errors
- ESLint: 0 warnings
- Vitest: 163/163 tests pass

## Session 25 — 2026-03-07 — Fix Generation Failure + hookKey Warning

### What was done
Fixed card generation failure and React controlled/uncontrolled Select warning.

1. **hookKey leak fix** (`GenerateForm.tsx`): When switching domains, `hookKey` was being set to `"ja"` as a default value, which meant `hook_key: "ja"` was sent in API requests for all domains (not just LANG). Backend rejected with "Unknown hook_key 'ja' for domain 'general'". Fixed by keeping `hookKey` as `undefined` by default and only setting it to `"ja"` in the domain `onChange` handler when switching to LANG.
2. **Controlled/uncontrolled fix** (`GenerateForm.tsx`): Removed `?? "ja"` fallback from hookKey Select `value` prop. The value is now set correctly before the Select mounts (via domain onChange), so no transition from undefined to string occurs.
3. **Generate timeout increase** (`api.ts`): Increased client-side generate timeout from 60s to 90s to provide buffer over the 60s Claude API timeout.

### Key decisions
- Keep `hookKey` default as `undefined` (not `"ja"`) to prevent leaking domain-specific fields to other domains
- 90s client timeout gives 30s buffer over 60s Claude API timeout

### Files modified (2)
- `src/components/cards/GenerateForm.tsx` — hookKey default + domain onChange + Select value
- `src/lib/api.ts` — generate timeout 60s → 90s

### Quality gates
- TypeScript strict: 0 errors
- ESLint: 0 warnings
- Vitest: 163/163 tests pass

## Session 26 — 2026-03-08 — Directive Mode UI

### What was done
Added directive mode toggle to the card generation form, allowing users to describe what flashcards they want instead of pasting source content.

1. **Form validation** (`src/lib/validation/cards.ts`): Added `contentType` field (`"text" | "prompt"`). Min 10 chars enforced for both types via `.superRefine()` with distinct error messages.
2. **Types** (`src/types/cards.ts`): Added `'prompt'` to `GenerateRequest.content_type` union.
3. **Store** (`src/stores/cards.ts`): `generateCards` accepts `contentType` param, passes `content_type` to API. Simplified `user_guidance` guard — relies on form already setting it to `undefined` in directive mode.
4. **GenerateForm** (`src/components/cards/GenerateForm.tsx`): Added ToggleGroup (Source Material / Directive). Conditional label, description, placeholder, textarea height. Focus section hidden in directive mode. Passes `contentType` to store on submit.

### Key decisions
- `contentType` is a required field (no `.default()`) to avoid React Hook Form + Zod 4 type inference issues
- Focus section (highlights + guidance) hidden entirely in directive mode — the directive IS the guidance
- Min 10 chars for both modes (matches backend)

### Files modified (4)
- `src/lib/validation/cards.ts` — contentType field + superRefine
- `src/types/cards.ts` — prompt in content_type union
- `src/stores/cards.ts` — contentType param + simplified user_guidance
- `src/components/cards/GenerateForm.tsx` — ToggleGroup + conditional UI

### Quality gates
- TypeScript strict: 0 errors
- ESLint: 0 warnings
- Vitest: 163/163 tests pass

## Session 27 — 2026-03-08 — Fix Review Panel Silent Failure for Rejected/Unsuitable Cards

### What was done
Fixed the Generate page not showing the review panel when all cards were rejected or flagged as unsuitable. This was the web-side half of the directive mode silent failure bug — the backend fix (Session 60) makes validators directive-aware, while this fix ensures the user always sees feedback after generation.

1. **hasResults gate** (`src/routes/app/Generate.tsx`): Changed from `pendingCards.length > 0 && lastGenerateResponse !== null` to include `rejectedCards` and `unsuitableContent`:
   ```typescript
   const hasResults =
     (pendingCards.length > 0 || rejectedCards.length > 0 || unsuitableContent.length > 0)
     && lastGenerateResponse !== null;
   ```
2. **Component tests** (`tests/unit/generate-has-results.test.tsx`): New file with 4 tests. Renders `Generate.tsx` with mocked `useCards` hook and stubbed child components (`CardReview`, `GenerateForm`, `UpgradeModal`). Verifies CardReview renders for rejected-only and unsuitable-only responses, and GenerateForm renders when all arrays are empty.

### Key decisions
- Component-level test (renders actual `Generate.tsx`) rather than pure-logic extraction — tests real rendering behavior
- `lastGenerateResponse !== null` guard preserved — prevents showing stale results from previous sessions

### Files modified (2)
- `src/routes/app/Generate.tsx` — hasResults includes rejectedCards + unsuitableContent
- `tests/unit/generate-has-results.test.tsx` — 4 new component tests (new file)

### Quality gates
- TypeScript strict: 0 errors
- ESLint: 0 warnings
- Vitest: 167/167 tests pass (4 new, 6 removed from pure-logic approach)

## Session 28 — 2026-03-08 — Backlog Cleanup: Remove Completed Items

### What was done
Cleaned up `docs/backlog.md` — removed 7 items that were already implemented across Sessions 1–27 but never marked complete. Removed the "Usage state location" design decision (resolved via USAGE_CHANGED_EVENT).

### Items removed (completed)
- Phase 1: Error sanitization (self-marked completed)
- Phase 2: User guidance field, Rejection visibility
- Phase 4: Stripe Checkout, Usage display with overage, Usage counter refresh (entire section removed)
- Phase 5: Dark mode, GDPR data export and account deletion
- Design Decisions: Usage state location

### Files modified (1)
- `docs/backlog.md` — removed 7 completed items + 1 resolved design decision
