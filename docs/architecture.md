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
| Testing | Vitest + @testing-library/react | 4.x / 16.x |
| Hosting | Cloudflare Workers | — |

## Directory Structure (Phase 1)

```
src/
├── main.tsx                    # Entry — initializes auth, renders App
├── App.tsx                     # Route definitions (BrowserRouter)
├── index.css                   # Tailwind v4 + shadcn CSS variables
├── vite-env.d.ts               # ImportMetaEnv types
├── routes/
│   ├── Landing.tsx             # Marketing landing page
│   ├── Pricing.tsx             # 3-tier pricing page
│   ├── Privacy.tsx             # GDPR privacy policy
│   ├── Terms.tsx               # Terms of service
│   ├── Login.tsx               # Auth: login form
│   ├── Signup.tsx              # Auth: signup form
│   └── app/
│       ├── AppLayout.tsx       # Sidebar nav + outlet
│       ├── Generate.tsx        # Placeholder (Phase 2)
│       ├── Library.tsx         # Placeholder (Phase 3)
│       ├── Export.tsx          # Placeholder (Phase 3)
│       ├── Billing.tsx         # Placeholder (Phase 4)
│       └── Settings.tsx        # Placeholder (Phase 5)
├── components/
│   ├── AuthGuard.tsx           # Route guard: redirect if unauthenticated
│   ├── MarketingLayout.tsx     # Header + footer for public pages
│   └── ui/                     # shadcn/ui components (12 installed)
├── lib/
│   ├── api.ts                  # Backend API client (fetch + auth + product_source)
│   ├── supabase.ts             # Supabase browser client (singleton)
│   ├── pricing.ts              # Pricing tier constants
│   ├── utils.ts                # cn() utility (shadcn)
│   └── validation/
│       └── auth.ts             # Zod schemas: loginSchema, signupSchema
└── stores/
    └── auth.ts                 # Zustand: session, user, signIn/signUp/signOut
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
- Card generation form + API integration (Phase 2)
- Card library + search/filter (Phase 3)
- .apkg export with sql.js WASM (Phase 3)
- Stripe Checkout + billing portal (Phase 4)
- Account settings + data export (Phase 5)
- Code splitting / lazy routes (Phase 2)
