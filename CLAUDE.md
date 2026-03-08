# Flashcard Tools Web App
React SPA for card generation, library management, .apkg export, and billing. Vite + TypeScript + Cloudflare Workers.

## Current Status
- **Phase**: 5 polish complete (all phases done). Production-ready.
- **Dark mode**: Full light/dark/system theme support. OKLCH CSS variables, Zustand-persisted preference, `applyTheme()` before render (no FOWT), `matchMedia` listener for OS changes, Sonner toasts themed via `useSyncExternalStore` + MutationObserver.
- **404 page**: Catch-all `*` route renders `NotFound.tsx` in `MarketingLayout` with hero layout, two CTA buttons.
- **Settings page**: 5-section layout — Account Info, Appearance (theme toggle), Change Password (react-hook-form + Zod), Data Export (GDPR JSON download), Danger Zone (email-confirmed account deletion).
- **Auth-aware marketing header**: Shows "Go to App" when authenticated, login/signup buttons when not.
- **Billing page**: Current plan display with tier badge, usage progress bar with overage, Stripe Checkout redirect for upgrades, Customer Portal for subscription management, post-checkout polling for tier updates.
- **UpgradeModal**: Wired to Stripe Checkout — opens on 402 `USAGE_EXCEEDED`, per-button loading, error toasts.
- **Usage refresh**: Sidebar usage counter auto-refreshes after card generation via `USAGE_CHANGED_EVENT` custom DOM event.
- **Keyboard shortcuts**: `Ctrl+Enter` (⌘+Enter on Mac) to generate, `Ctrl+E` (⌘+E) to export. Reusable `useKeyboardShortcut` hook with input field suppression.
- **Export page**: Format selector (2×2 radio cards), dynamic options panel, collapsible preview, recent deck names, APKG builder (sql.js WASM + JSZip), code-split APKG chunk (~143 KB).
- **Library page**: Paginated grid/list view, inline editing, bulk delete, domain badges, 3 empty states, filter toolbar (domain/search/tag/date/sort), undo-able single delete, export selected, card count badge in sidebar nav.
- **Generate page**: Export button in CardReview summary bar → transfers selected cards to Export page. Focus section: content highlight panel (select text → floating "Add focus" button → badge pills, max 5) + free-text guidance textarea (500 char limit). Both concatenated into `user_guidance` at submit time. Directive mode: ToggleGroup switches between "Source Material" and "Directive" — directive mode hides focus section, changes labels/placeholder, and sends `content_type: 'prompt'`.
- **ErrorBoundary**: Root error boundary catches unhandled render errors → recovery UI (reload / go home) instead of white screen.
- **Library error state**: `fetchLibrary` failures now surface an error message with "Try again" button instead of silently showing empty state.
- **CSP hardened**: `'unsafe-eval'` removed from `script-src`; only `'wasm-unsafe-eval'` remains for sql.js.
- **Cache-Control**: Hashed assets immutable, HTML no-cache, WASM immutable.
- **Staging deployment**: `npm run deploy:staging` available. `wrangler.jsonc` has staging env. CSP allows both staging + production backend.
- **Quality gates**: TypeScript strict (0 errors), ESLint (0 warnings), Vitest (163/163 tests), build succeeds.

## Next Session Tasks
1. Production deployment prep (production env vars, CSP production URL)

## CRITICAL Constraints
- **NEVER** handle credit card details — Stripe Checkout (redirect) only
- **NEVER** store auth tokens in localStorage — use Supabase session management
- **NEVER** generate .apkg server-side — client-side only (sql.js WASM + JSZip)
- **NEVER** add server-side state that duplicates the backend
- **ALWAYS** include `product_source: 'web_app'` in every API request body
- **ALWAYS** sanitize user-provided content before rendering (XSS prevention)
- **ALWAYS** auth guard on all `/app/*` routes — redirect to login if unauthenticated
- **ALWAYS** keep DOMPurify allowlist in `SanitizedHTML.tsx` aligned with the `fc-*` HTML contract — no tags beyond what backend prompts generate

## Commands
```bash
npm run dev                      # Vite dev server (plain SPA, no Workers runtime)
npm run build                    # Production build
npm run preview                  # Preview production build locally
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
- Build: Vite 6 + @vitejs/plugin-react + @tailwindcss/vite
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
│   ├── cards/                   # GenerateForm, CardReview, CardEditor, LibraryCardItem, LibraryToolbar, SanitizedHTML
│   └── billing/                 # UpgradeModal
├── lib/
│   ├── api.ts                   # Backend API client (fetch + auth header)
│   ├── supabase.ts              # Supabase browser client
│   ├── apkg/                    # sql.js + JSZip .apkg generator
│   │   ├── builder.ts
│   │   └── schema.ts            # Anki SQLite schema constants
│   └── hooks/                   # useCards, useCardCount, useKeyboardShortcut, useUsage
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
- Switch statements on union types must include a `default: { const _: never = x; throw new Error(...) }` exhaustive check

### Zustand
- Selector hooks MUST use `useShallow` — bare `useCardStore((s) => ({ ... }))` returns a new object every render, causing infinite re-render loops. Always: `useCardStore(useShallow((s) => ({ ... })))`
- List item components that receive callbacks MUST use `React.memo` + parent `useCallback` — prevents O(N) child re-renders on every state change
- Optimistic store mutations MUST snapshot state before mutating and rollback in catch — see `bulkDeleteLibraryCards` pattern in `stores/cards.ts`

### Subscriptions
- Supabase `onAuthStateChange` and similar listeners must capture the unsubscribe handle and call it before re-subscribing (see `stores/auth.ts`)

### SSR / Prerender Safety
- Modules imported transitively during prerender must handle `import.meta.env` being `undefined` under `tsx` (Node.js). Use optional-chain `import.meta.env?.` and `typeof window !== "undefined"` guards around browser-only side effects. See `supabase.ts` for the pattern.

### Structured HTML Rendering
The backend generates card content as structured HTML with `fc-*` CSS classes. The web app must render this HTML with a CSS stylesheet consistent with the Anki add-on's `FC_STYLESHEET` (see `flashcard-anki/src/styles/stylesheet.py`). Use `dangerouslySetInnerHTML` with DOMPurify sanitization for card previews.

## API Integration
- **Base URLs**: staging `https://flashcard-backend-staging.luiswgordon.workers.dev`, production TBD
- **Auth header**: `Authorization: Bearer {supabase_access_token}`
- **Error handling**: `api.ts` implements the error contract from root CLAUDE.md. 401 → auto sign-out via `notifyUnauthorized()`. 429 → auto-retry (max 2, respects `retry_after`, capped 60s). All other errors throw `ApiError` for callers to handle.
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
4. **If API request shapes changed** (new fields sent to backend): verify the backend has been deployed with matching schema changes first. The backend uses `.strict()` Zod validation — unknown fields are rejected. See root CLAUDE.md § Deployment Coordination.
5. **Deploy with correct mode**: Use `npm run deploy:staging` (not manual `build` + `deploy`). The script handles `--mode staging` → `.env.staging`. Bare `npm run build` uses `.env.production`.
6. Append to `docs/session-log.md`
7. Update `docs/architecture.md` if structure changed
8. Update "Current Status" above
9. Update `README.md` if setup or commands changed
10. **Commit and push** — work is not complete until pushed

## Non-Goals (This Phase)
- SSR or SSG beyond marketing pre-render (this is a client-side SPA)
- Database (all data from backend API + client state)
- Custom auth (Supabase only)
- CMS or blog
- i18n (defer)

## Tooling Notes
- **Context7 MCP** is available — use "context7" in prompts for up-to-date docs on Vite, React, Tailwind, shadcn, Supabase, Stripe, Zustand, React Router
- **frontend-design plugin** (Anthropic) is available — auto-triggers when building UI components; generates production-grade, non-generic frontend code
