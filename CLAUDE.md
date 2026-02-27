# Flashcard Tools Web App
React SPA for card generation, library management, .apkg export, and billing. Vite + TypeScript + Cloudflare Workers.

## Current Status
- **Phase**: 3 — M5+M6 complete. Export page with 4 formats (APKG, CSV, Markdown, JSON), format registry, preview, download.
- **Export page**: Format selector (2×2 radio cards), dynamic options panel, collapsible preview, recent deck names, APKG builder (sql.js WASM + JSZip), code-split APKG chunk (~143 KB).
- **Library page**: Paginated grid/list view, inline editing, bulk delete, domain badges, 3 empty states, filter toolbar (domain/search/tag/date/sort), undo-able single delete, export selected, card count badge in sidebar nav.
- **Generate page**: Export button in CardReview summary bar → transfers selected cards to Export page.
- **Backend prerequisite**: Phase 5b billing migration must be deployed to production before web app launch.
- **Quality gates**: TypeScript strict (0 errors), ESLint (0 warnings), Vitest (51/51 tests), build succeeds.

## Next Session Tasks
1. **Phase 3F: Polish** — keyboard shortcuts, staging deployment, test against backend staging API

## CRITICAL Constraints
- **NEVER** handle credit card details — Stripe Checkout (redirect) only
- **NEVER** store auth tokens in localStorage — use Supabase session management
- **NEVER** generate .apkg server-side — client-side only (sql.js WASM + JSZip)
- **NEVER** add server-side state that duplicates the backend
- **ALWAYS** include `product_source: 'web_app'` in every API request body
- **ALWAYS** sanitize user-provided content before rendering (XSS prevention)
- **ALWAYS** auth guard on all `/app/*` routes — redirect to login if unauthenticated

## Commands
```bash
npm run dev                      # Vite dev server (Workers runtime via CF plugin)
npm run build                    # Production build
npm run preview                  # Preview production build in Workers runtime
npm run deploy                   # wrangler deploy
npm run test                     # Vitest
npm run test:e2e                 # Playwright
npm run lint                     # ESLint
npm run lint:fix                 # ESLint --fix
npm run typecheck                # tsc --noEmit
```

## Documentation
| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| @../../PRD.md | Source of truth for requirements (Web App section) | When scope changes |
| @docs/architecture.md | Living system state | When structure changes |
| docs/session-log.md | Append-only session notes | Every session |
| README.md | Setup, commands, getting started | When setup/commands change |

**Rule**: If PRD.md and CLAUDE.md conflict, PRD.md wins. PRD lives at repo root: `../../PRD.md`

## Tech Stack
- Build: Vite 6 + @cloudflare/vite-plugin
- UI: React 19, React Router 7 (library mode)
- Styling: Tailwind CSS v4 + shadcn/ui
- State: Zustand (client-side working state)
- Auth: Supabase Auth (shared project with backend)
- Payments: Stripe Checkout (redirect) + Customer Portal
- Export: sql.js (WASM) + JSZip — client-side .apkg generation
- Hosting: Cloudflare Workers (static assets — SPA requests are free)
- Validation: Zod (form validation, API response parsing)
- Testing: Vitest (unit) + Playwright (e2e)

## Project Structure
```
src/
├── main.tsx                     # Entry point, router setup
├── App.tsx                      # Root component, route definitions
├── routes/
│   ├── Landing.tsx, Pricing.tsx, Privacy.tsx, Terms.tsx
│   ├── Login.tsx, Signup.tsx
│   └── app/                     # Authenticated routes (auth guard)
│       ├── AppLayout.tsx        # App shell: sidebar nav
│       ├── Generate.tsx         # Card generation form + review
│       ├── Library.tsx          # Paginated, filterable card library
│       ├── Export.tsx           # Deck builder + .apkg export
│       ├── Billing.tsx          # Usage, plan, upgrade/manage
│       └── Settings.tsx         # Account settings, data export
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── cards/                   # GenerateForm, CardReview, CardList, CardEditor
│   ├── export/                  # DeckBuilder, ApkgExporter
│   └── billing/                 # UsageDisplay, PlanCard, UpgradeModal
├── lib/
│   ├── api.ts                   # Backend API client (fetch + auth header)
│   ├── supabase.ts              # Supabase browser client
│   ├── apkg/                    # sql.js + JSZip .apkg generator
│   │   ├── builder.ts
│   │   └── schema.ts            # Anki SQLite schema constants
│   └── hooks/                   # useAuth, useCards, useUsage
├── stores/
│   ├── cards.ts                 # Zustand card store
│   └── settings.ts              # User preferences
public/
├── sql-wasm.wasm                # sql.js WASM binary
tests/
├── unit/
└── e2e/
docs/
├── architecture.md
└── session-log.md
scripts/
└── prerender.ts                # Optional static-page pre-renderer
index.html
vite.config.ts
wrangler.jsonc
tailwind.config.ts
tsconfig.json
package.json
```

## Code Conventions
- TypeScript strict mode, no `any`
- Named exports (no default exports except route pages)
- Zod for form validation and API response parsing
- Tailwind-only styling — no CSS modules, no CSS-in-JS
- React Router 7 library mode — explicit route definitions in `App.tsx`
- Components: one component per file, PascalCase filenames
- Hooks: `use` prefix, one hook per file in `lib/hooks/`

### Structured HTML Rendering
The backend generates card content as structured HTML with `fc-*` CSS classes. The web app must render this HTML with a CSS stylesheet consistent with the Anki add-on's `FC_STYLESHEET` (see `flashcard-anki/src/styles/stylesheet.py`). Use `dangerouslySetInnerHTML` with DOMPurify sanitization for card previews.

## API Integration
- **Base URLs**: staging `https://flashcard-backend-staging.luiswgordon.workers.dev`, production TBD
- **Auth header**: `Authorization: Bearer {supabase_access_token}`
- **Error handling**: Follow the error handling contract in root CLAUDE.md — handle all error codes (400-500)
- **Content limits**: Text 100KB, URL 100KB after extraction, PDF 10MB
- **Key endpoints**: `/cards/generate`, `/cards` (library), `/usage/current`, `/billing/checkout`, `/billing/portal`

## Boundaries

### ⚠️ Ask First
- Adding npm dependencies beyond the core stack
- Storing data beyond Zustand + localStorage
- Adding analytics or tracking scripts

### 🚫 Never
- Handle credit card details (Stripe Checkout only)
- Store auth tokens in localStorage (Supabase session only)
- Generate .apkg server-side
- Duplicate backend state in a server-side store
- Skip Supabase Auth for any authenticated route

## Environment Behavior
| Setting | Local | Staging | Production |
|---------|-------|---------|------------|
| API URL | http://localhost:8787 (backend dev server) | staging Workers URL | production Workers URL |
| Supabase | Shared dev project | Shared staging | Production project |
| Stripe | Test mode | Test mode | Live mode |
| Source maps | Enabled | Enabled | Disabled |

## Environment Variables
All client-side env vars must use the `VITE_` prefix to be exposed to the browser bundle.

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8787` |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key | `eyJ…` |

## Session Completion
1. `npm run typecheck` — must pass
2. `npm run lint:fix` — fix warnings
3. `npm run test` — all tests pass
4. Append to `docs/session-log.md`
5. Update `docs/architecture.md` if structure changed
6. Update "Current Status" above
7. Update `README.md` if setup or commands changed
8. **Commit and push** — work is not complete until pushed

## Non-Goals (This Phase)
- SSR or SSG beyond marketing pre-render (this is a client-side SPA)
- Database (all data from backend API + client state)
- Custom auth (Supabase only)
- CMS or blog
- i18n (defer)

## Tooling Notes
- **Context7 MCP** is available — use "context7" in prompts for up-to-date docs on Vite, React, Tailwind, shadcn, Supabase, Stripe, Zustand, React Router
- **frontend-design plugin** (Anthropic) is available — auto-triggers when building UI components; generates production-grade, non-generic frontend code
