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
