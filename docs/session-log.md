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
