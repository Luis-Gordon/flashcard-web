# Flashcard Tools Web App
React SPA for card generation, library management, .apkg export, and billing. Vite + TypeScript + Cloudflare Workers.

## Current Status
- **Phase**: All phases complete. Production-ready. Dark mode, 404 page, settings, billing, export, library with filters/undo, card enhancement, keyboard shortcuts, error boundary, CSP hardened, staging deployed.
- **Quality gates**: TypeScript strict (0 errors), ESLint (0 warnings), Vitest (174/174 tests), build succeeds.

## Next Session Tasks
1. Production deployment prep (production env vars, CSP production URL)

## CRITICAL Constraints
- **NEVER** handle credit card details — Stripe Checkout (redirect) only
- **NEVER** store auth tokens in localStorage — use Supabase session management
- **NEVER** generate .apkg server-side — client-side only (sql.js WASM + JSZip)
- **ALWAYS** include `product_source: 'web_app'` in every API request body
- **ALWAYS** sanitize user-provided content before rendering (XSS prevention)
- **ALWAYS** auth guard on all `/app/*` routes — redirect to login if unauthenticated
- **ALWAYS** keep DOMPurify allowlist aligned with the `fc-*` HTML contract

## Commands
```bash
npm run dev                      # Vite dev server
npm run build                    # Production build
npm run test                     # Vitest
npm run typecheck                # tsc --noEmit
npm run lint:fix                 # ESLint --fix
npm run deploy:staging           # Build --mode staging + deploy
```

## API Integration
- **Base URLs**: staging `https://flashcard-backend-staging.luiswgordon.workers.dev`, production TBD
- **Auth header**: `Authorization: Bearer {supabase_access_token}`
- **Error handling**: 401 → auto sign-out. 429 → auto-retry (max 2, cap 60s). All others throw `ApiError`.

## Environment Variables
| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend API base URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key |

## Environment Behavior
| Setting | Local | Staging | Production |
|---------|-------|---------|------------|
| API URL | localhost:8787 | staging Workers | production Workers |
| Stripe | Test mode | Test mode | Live mode |
| Source maps | Enabled | Enabled | Disabled |

## Session Completion
1. `npm run typecheck` — must pass
2. `npm run lint:fix` — fix warnings
3. `npm run test` — all tests pass
4. **If API request shapes changed**: verify backend deployed with matching schemas first (`.strict()` rejects unknowns)
5. **Deploy with correct mode**: Use `npm run deploy:staging` (not manual `build` + `deploy`)
6. Append to `docs/session-log.md`
7. Update `docs/architecture.md` if structure changed
8. Update "Current Status" above
9. **Commit and push** — work is not complete until pushed

## Documentation
| Document | Purpose |
|----------|---------|
| `../../PRD.md` | Source of truth for requirements (Web App section) |
| `docs/architecture.md` | Living system state |
| `docs/session-log.md` | Append-only session notes |

**Rule**: If PRD.md and CLAUDE.md conflict, PRD.md wins.
