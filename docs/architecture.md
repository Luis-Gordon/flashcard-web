# Architecture — Memogenesis Web App

> Living document. Updated as the codebase evolves.

## Overview

Client-side SPA built with Vite + React 19, deployed as static assets on Cloudflare Workers. All data comes from the backend API; no server-side state.

```
Browser → Cloudflare Workers (static) → SPA
                                         ├── Supabase Auth (session management)
                                         └── Backend API (card generation, library, usage)
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Build | Vite + @tailwindcss/vite | 6.x |
| UI | React | 19.x |
| Routing | React Router (library mode) | 7.x |
| Styling | Tailwind CSS v4 + shadcn/ui | 4.x |
| State | Zustand | 5.x |
| Auth | Supabase Auth | 2.x |
| Validation | Zod | 4.x |
| Forms | react-hook-form + @hookform/resolvers | 7.x / 5.x |
| HTML Sanitization | DOMPurify | 3.x |
| Dates | date-fns | 4.x |
| Export (Phase 3C) | sql.js (WASM) + JSZip | 1.x / 3.x |
| Testing | Vitest + @testing-library/react | 4.x / 16.x |
| Hosting | Cloudflare Workers | — |

## Directory Structure (Phase 3)

```
src/
├── main.tsx                    # Entry — initializes auth, renders App
├── App.tsx                     # Route definitions (BrowserRouter) + lazy loading
├── index.css                   # Tailwind v4 + shadcn CSS variables
├── vite-env.d.ts               # ImportMetaEnv types
├── types/
│   └── cards.ts                # Card, EditableCard, LibraryCard, UpdateCardRequest, ExportFormat
├── routes/
│   ├── Landing.tsx             # Marketing landing page
│   ├── Pricing.tsx             # 3-tier pricing page
│   ├── Privacy.tsx             # GDPR privacy policy
│   ├── Terms.tsx               # Terms of service
│   ├── Login.tsx               # Auth: login form
│   ├── Signup.tsx              # Auth: signup form
│   └── app/
│       ├── AppLayout.tsx       # Sidebar nav + usage display + card count badge + outlet
│       ├── Generate.tsx        # Form ↔ review toggle + export selected
│       ├── Library.tsx         # Paginated grid/list, filters, undo delete, export selected
│       ├── Export.tsx          # Format selector, options, preview, download
│       ├── Billing.tsx         # Placeholder (Phase 4)
│       └── Settings.tsx        # Placeholder (Phase 5)
├── components/
│   ├── AuthGuard.tsx           # Route guard: redirect if unauthenticated
│   ├── MarketingLayout.tsx     # Header + footer for public pages
│   ├── ui/                     # shadcn/ui components (24 installed)
│   ├── cards/
│   │   ├── SanitizedHTML.tsx   # Shared DOMPurify HTML renderer (fc-* safe)
│   │   ├── GenerateForm.tsx    # Domain/style/difficulty form + content textarea
│   │   ├── CardReview.tsx      # Card list with select/edit/delete + quality filter + export
│   │   ├── CardEditor.tsx      # Inline card editor (front/back/tags/notes)
│   │   ├── LibraryCardItem.tsx # Library card: grid/list, domain badge, expand, select
│   │   └── LibraryToolbar.tsx  # Filter toolbar: domain, search, tag, date, sort + pills
│   └── billing/
│       └── UpgradeModal.tsx    # Usage exceeded → tier comparison dialog
├── lib/
│   ├── api.ts                  # Backend API client (fetch + auth + product_source)
│   ├── supabase.ts             # Supabase browser client (singleton)
│   ├── pricing.ts              # Pricing tier constants
│   ├── utils.ts                # cn() utility (shadcn)
│   ├── constants/
│   │   └── domains.ts          # Shared DOMAIN_LABELS + DOMAIN_COLORS maps
│   ├── validation/
│   │   ├── auth.ts             # Zod schemas: loginSchema, signupSchema
│   │   └── cards.ts            # generateFormSchema, CARD_DOMAINS
│   ├── export/
│   │   ├── types.ts            # ExportResult, ExportFormatConfig, ExportOptionField
│   │   ├── download.ts         # triggerDownload() browser download utility
│   │   ├── html.ts             # stripHtml() shared helper for text formatters
│   │   ├── csv.ts              # CSV formatter (BOM, escaping, separator options)
│   │   ├── markdown.ts         # Obsidian SR format Markdown formatter
│   │   ├── json.ts             # JSON formatter with field stripping
│   │   ├── apkg.ts             # APKG adapter (lazy-imports builder, maps Card → ApkgCard)
│   │   └── index.ts            # EXPORT_FORMATS registry + dispatchExport() dispatcher
│   ├── apkg/
│   │   ├── schema.ts           # Anki SQLite schema v11 + helpers (GUID, checksum, ID gen)
│   │   └── builder.ts          # sql.js WASM + JSZip .apkg generator
│   └── hooks/
│       ├── useCards.ts         # Selectors: useCards, useCardActions, useLibrary, useLibrarySelection, useLibraryUndoDelete, useExportCards
│       ├── useCardCount.ts     # Hybrid hook: store total → API fallback (nav badge)
│       └── useUsage.ts         # Fetches /usage/current on mount
└── stores/
    ├── auth.ts                 # Zustand: session, user, signIn/signUp/signOut
    ├── cards.ts                # Zustand: pending/library cards, generation, selection, export transfer
    └── settings.ts             # Zustand (persist): view mode, recent deck names
```

## Key Patterns

### Auth Flow
1. `main.tsx` calls `useAuthStore.getState().initialize()` before rendering
2. Store calls `supabase.auth.getSession()` + subscribes to `onAuthStateChange`
3. `AuthGuard` checks store state: loading → spinner, no session → redirect to /login
4. `api.ts` gets fresh token from `supabase.auth.getSession()` on each request

### API Client
- Auto-injects `product_source: "web_app"` in all request bodies
- Typed `ApiError` with `status`, `code`, `requestId`, `retryAfter`
- AbortController timeout (default 60s) — serves as overall deadline across retries
- Gets auth token directly from Supabase session (no intermediate storage)
- Supports GET requests with `params` option (URLSearchParams)
- **401 handling**: `notifyUnauthorized()` calls registered handler (set in `main.tsx`) which toasts "Session expired" + `signOut()`. Debounced with 1s cooldown to prevent duplicate toasts from concurrent requests.
- **429 retry**: Auto-retries rate-limited responses up to 2 times. Respects `retry_after` from response (capped at 60s, defaults to 1s). Abort-aware wait integrates with overall timeout.

### Card Generation Flow
1. User fills `GenerateForm` → submits to `useCardStore.generateCards()`
2. Store calls `api.generateCards()` → POST `/cards/generate`
3. Response cards get `crypto.randomUUID()` IDs (backend doesn't return persisted IDs)
4. All cards auto-selected in `selectedCardIds` Set
5. `Generate.tsx` auto-switches from form to `CardReview` panel
6. User can edit (inline `CardEditor`), delete, select/deselect cards
7. "Generate more" returns to form; "Discard all" clears store

### Security Headers
- `public/_headers` file is copied to `dist/` by Vite and parsed by Cloudflare Workers edge
- CSP: `default-src 'self'`, hashed inline script for prerender redirect, `'wasm-unsafe-eval'` for sql.js, `'unsafe-inline'` for Radix UI runtime styles
- Additional headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (deny camera/mic/geo/payment)
- CSP `connect-src` allowlists Supabase + backend staging. Production URL to be added at launch.

### HTML Sanitization
- Backend generates card content as structured HTML with `fc-*` CSS classes
- Shared `SanitizedHTML` component (`src/components/cards/SanitizedHTML.tsx`): DOMPurify with allowlisted tags + `class`/`lang` attrs
- Allowlist is strict to the `fc-*` contract — no table tags (backend never generates them)
- Used by both `CardReview` (generation) and `LibraryCardItem` (library)
- Prevents XSS while preserving backend's semantic HTML structure

### Library Page
- **Grid/list toggle**: View mode persisted in `useSettingsStore` (localStorage)
- **Pagination**: Page-scoped — changing page clears `librarySelectedIds`
- **Optimistic updates**: `updateLibraryCard` applies changes locally, then reconciles with server response; rolls back on failure
- **Bulk delete**: Confirmation via `AlertDialog`, removes from `libraryCards` + `librarySelectedIds` + decrements `total`
- **Three empty states**: (1) no cards ever → CTA to generate, (2) filters active with no matches → toolbar + clear button, (3) loading → 6 skeleton cards
- **Domain badges**: 10 color-coded domain badges using Tailwind palette colors (not theme variables)
- **Filter toolbar** (`LibraryToolbar`): Controlled component — receives `filters` + emits `onFilterChange` partial updates. Domain select, debounced search (300ms local state), tag combobox (derived from current page's cards), date range pickers (From/To with mutual constraints), sort select. Active filter pills rendered below toolbar when any non-default filter is set.
- **Undo delete**: `removeLibraryCardLocally` strips card synchronously + returns `{ card, index }`. 5s `setTimeout` fires `api.deleteCard()`. Sonner toast with "Undo" action calls `restoreLibraryCard(card, index)` and cancels the timeout. On unmount, all pending deletes are flushed (fire-and-forget API calls).
- **Export selected**: Filters `libraryCards` by `librarySelectedIds`, calls `setExportCards()`, navigates to `/app/export`.

### Card Count Badge
- `useCardCount` hook: reads `libraryPagination.total` from Zustand store when available; otherwise fires lightweight `getCards({ page: 1, limit: 1 })` to fetch just the total. Renders as `Badge` on the Library nav item (desktop + mobile). Caps display at "999+".

### Settings Store
- First store using Zustand `persist` middleware with `create<T>()(...)` double-call syntax
- localStorage key: `memogenesis-settings`
- Stores `libraryViewMode` (grid/list) and `recentDeckNames` (max 5, MRU order)

### Export Page
- **Entry points**: Library → "Export selected" and Generate → "Export N" both transfer cards via `setExportCards()` in the Zustand store, then navigate to `/app/export`.
- **Format registry**: `EXPORT_FORMATS` array in `src/lib/export/index.ts` defines 4 formats (APKG, CSV, Markdown, JSON) with metadata, options schema, and icons.
- **Dynamic options**: Options panel renders from the registry's `options` array — `text` → Input, `boolean` → Checkbox, `select` → Select. Adding a format requires zero UI code changes.
- **Preview**: Collapsible preview generates output for first 3 cards in chosen format via `dispatchExport()`.
- **APKG code splitting**: `dispatchExport("apkg", ...)` uses `await import("./apkg")` → Vite auto-splits sql.js + JSZip into a separate ~143 KB chunk loaded only on demand.
- **APKG robustness**: Card limit (2000 max), batched SQL inserts (100/batch with `setTimeout(0)` yields), progress callback + AbortSignal piped through adapter → dispatcher → Export page. Monotonic ID generator prevents collisions across module reloads. WASM path uses `import.meta.env.BASE_URL` for subpath deploy support.
- **APKG progress/cancel UI**: Export button shows live progress % for APKG exports with >100 cards, doubles as cancel button during export. AbortController signal propagates through the pipeline to interrupt batched inserts.
- **Recent deck names**: Dropdown populated from `useSettingsStore.recentDeckNames` (max 5, MRU order). Saved on successful export.
- **Download**: `triggerDownload()` creates object URL → hidden `<a>` click → revoke. Works for both string (CSV/Markdown/JSON) and ArrayBuffer (APKG).

### Code Splitting
- All 11 route pages are lazy-loaded via `React.lazy()` + `<Suspense>`
- `AppLayout` and `AuthGuard` remain eagerly loaded (needed immediately)
- Vite automatically creates separate chunks per lazy route
- Index chunk: ~581 KB; route chunks: 0.4–88 KB each

### Routing
- Library mode: `<BrowserRouter>` → `<Routes>` → `<Route>`
- Public routes: `/`, `/pricing`, `/privacy`, `/terms`, `/login`, `/signup`
- Protected routes: `/app/*` wrapped in `<AuthGuard>` → `<AppLayout>`
- SPA fallback via `wrangler.jsonc` `not_found_handling: "single-page-application"`

### Prerender (SEO)
- `scripts/prerender.ts` generates static HTML for 4 marketing pages
- Runs at build time via `prebuild` npm hook
- React components are the source of truth; static HTML includes OG meta, JSON-LD
- All interpolated values are HTML-escaped; JSON-LD uses `JSON.stringify` (not template literals)
- Inline redirect script is CSP-hashed — if changed, recompute hash in `public/_headers`
- Output: `public/{page}.html` (gitignored build artifacts)

## Not Yet Implemented
- Keyboard shortcuts for export workflow (Phase 3F)
- Staging deployment + backend integration testing (Phase 3F)
- Stripe Checkout + billing portal (Phase 4)
- Account settings + data export (Phase 5)
