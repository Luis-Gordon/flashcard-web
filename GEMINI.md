# Flashcard Tools Web App
React SPA for card generation, library management, .apkg export, and billing.

## Current Status
- **Phase**: 5 polish complete (all phases done). Production-ready.
- **Quality Gates**: TypeScript strict (0 errors), ESLint (0 warnings), Vitest (163/163 tests), build succeeds.
- **Staging Deployment**: `npm run deploy:staging` available.

## Next Session Tasks
1. Production deployment prep (production env vars, CSP production URL).

## Critical Constraints
- **NEVER** handle credit card details â€” Stripe Checkout only.
- **NEVER** store auth tokens in localStorage â€” use Supabase session management.
- **NEVER** generate .apkg server-side â€” client-side only.
- **NEVER** add server-side state that duplicates the backend.
- **ALWAYS** include `product_source: 'web_app'` in every API request.
- **ALWAYS** sanitize user-provided content before rendering.
- **ALWAYS** auth guard on all `/app/*` routes.

## Tech Stack
- Build: Vite 6, TypeScript
- UI: React 19, React Router 7, Tailwind CSS v4, shadcn/ui
- State: Zustand
- Auth: Supabase Auth
- Payments: Stripe Checkout (redirect) + Customer Portal
- Export: sql.js (WASM) + JSZip

## Commands
```bash
npm run dev                      # Vite dev server
npm run build                    # Production build
npm run preview                  # Preview production build locally
npm run deploy                   # wrangler deploy
npm run test                     # Vitest
npm run typecheck                # tsc --noEmit
npm run lint:fix                 # ESLint --fix
```

## Code Conventions
- TypeScript strict mode, no `any`.
- Named exports (no default exports except route pages).
- Zod for form validation and API response parsing.
- Zustand: Selector hooks MUST use `useShallow`.
- List items with callbacks MUST use `React.memo` + parent `useCallback`.
- Optimistic mutations MUST snapshot state and rollback in catch.

## Structured HTML Rendering
- Render content with `fc-*` CSS classes.
- Use `dangerouslySetInnerHTML` with `DOMPurify` sanitization.
- Match stylesheet with Anki's `FC_STYLESHEET`.

## Boundaries
### âš ï¸ Ask First
- Adding npm dependencies beyond the core stack.
- Storing data beyond Zustand + localStorage.
- Adding analytics or tracking scripts.
### ðŸš« Never
- Handle credit card details.
- Store auth tokens in localStorage.
- Generate .apkg server-side.

## Session Workflow
1. **Start session**: `pwsh -File ../tools/gemini/session-start.ps1 -Project web`
2. **Implement**: Follow conventions in `GEMINI.md` and `../../.gemini/styleguide.md`.
3. **End session**: `pwsh -File ../tools/gemini/session-end.ps1 -Summary "summary"`
