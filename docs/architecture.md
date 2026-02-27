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
│       ├── AppLayout.tsx       # Sidebar nav + usage display + outlet
│       ├── Generate.tsx        # Form ↔ review toggle
│       ├── Library.tsx         # Paginated grid/list view, inline editing, bulk actions
│       ├── Export.tsx          # Placeholder (Phase 3C)
│       ├── Billing.tsx         # Placeholder (Phase 4)
│       └── Settings.tsx        # Placeholder (Phase 5)
├── components/
│   ├── AuthGuard.tsx           # Route guard: redirect if unauthenticated
│   ├── MarketingLayout.tsx     # Header + footer for public pages
│   ├── ui/                     # shadcn/ui components (29 installed)
│   ├── cards/
│   │   ├── SanitizedHTML.tsx   # Shared DOMPurify HTML renderer (fc-* safe)
│   │   ├── GenerateForm.tsx    # Domain/style/difficulty form + content textarea
│   │   ├── CardReview.tsx      # Card list with select/edit/delete + quality filter
│   │   ├── CardEditor.tsx      # Inline card editor (front/back/tags/notes)
│   │   └── LibraryCardItem.tsx # Library card: grid/list, domain badge, expand, select
│   └── billing/
│       └── UpgradeModal.tsx    # Usage exceeded → tier comparison dialog
├── lib/
│   ├── api.ts                  # Backend API client (fetch + auth + product_source)
│   ├── supabase.ts             # Supabase browser client (singleton)
│   ├── pricing.ts              # Pricing tier constants
│   ├── utils.ts                # cn() utility (shadcn)
│   ├── validation/
│   │   ├── auth.ts             # Zod schemas: loginSchema, signupSchema
│   │   └── cards.ts            # generateFormSchema, CARD_DOMAINS
│   └── hooks/
│       ├── useCards.ts         # Selectors: useCards, useCardActions, useLibrary, useLibrarySelection, useExportCards
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
- AbortController timeout (default 60s)
- Gets auth token directly from Supabase session (no intermediate storage)
- Supports GET requests with `params` option (URLSearchParams)

### Card Generation Flow
1. User fills `GenerateForm` → submits to `useCardStore.generateCards()`
2. Store calls `api.generateCards()` → POST `/cards/generate`
3. Response cards get `crypto.randomUUID()` IDs (backend doesn't return persisted IDs)
4. All cards auto-selected in `selectedCardIds` Set
5. `Generate.tsx` auto-switches from form to `CardReview` panel
6. User can edit (inline `CardEditor`), delete, select/deselect cards
7. "Generate more" returns to form; "Discard all" clears store

### HTML Sanitization
- Backend generates card content as structured HTML with `fc-*` CSS classes
- Shared `SanitizedHTML` component (`src/components/cards/SanitizedHTML.tsx`): DOMPurify with allowlisted tags + `class`/`lang` attrs
- Used by both `CardReview` (generation) and `LibraryCardItem` (library)
- Prevents XSS while preserving backend's semantic HTML structure

### Library Page
- **Grid/list toggle**: View mode persisted in `useSettingsStore` (localStorage)
- **Pagination**: Page-scoped — changing page clears `librarySelectedIds`
- **Optimistic updates**: `updateLibraryCard` applies changes locally, then reconciles with server response; rolls back on failure
- **Bulk delete**: Confirmation via `AlertDialog`, removes from `libraryCards` + `librarySelectedIds` + decrements `total`
- **Three empty states**: (1) no cards ever → CTA to generate, (2) filters active with no matches → clear filters, (3) loading → 6 skeleton cards
- **Domain badges**: 10 color-coded domain badges using Tailwind palette colors (not theme variables)

### Settings Store
- First store using Zustand `persist` middleware with `create<T>()(...)` double-call syntax
- localStorage key: `memogenesis-settings`
- Stores `libraryViewMode` (grid/list) and `recentDeckNames` (max 5, MRU order)

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
- Output: `public/{page}.html` (gitignored build artifacts)

## Not Yet Implemented
- Library search/filter toolbar (Phase 3C)
- .apkg export with sql.js WASM + deck builder UI (Phase 3C)
- CSV/Markdown/JSON export formats (Phase 3C)
- Stripe Checkout + billing portal (Phase 4)
- Account settings + data export (Phase 5)
