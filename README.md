# Flashcard Tools — Web App

React SPA serving as the central hub for the Memogenesis ecosystem. Handles user signup, subscription billing (via Stripe), card generation and management, and client-side .apkg export.

Part of the [Flashcard Tools ecosystem](https://github.com/Luis-Gordon/flashcard-tools).

## Status

Not yet started. See [PRD.md](https://github.com/Luis-Gordon/flashcard-tools/blob/main/PRD.md) (PRD 3) for full requirements.

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Build | Vite 6 + @cloudflare/vite-plugin | Build tooling |
| UI | React 19 | UI library |
| Routing | React Router 7 (library mode) | Client-side routing |
| Styling | Tailwind CSS v4 + shadcn/ui | Styling |
| State | Zustand | Client-side state |
| Auth | Supabase Auth | Shared with backend |
| Payments | Stripe Checkout + Customer Portal | Billing |
| Export | sql.js (WASM) + JSZip | Client-side .apkg generation |
| Hosting | Cloudflare Workers (static assets) | Deployment |
| Testing | Vitest (unit) + Playwright (e2e) | Testing |

## Prerequisites

- Backend API deployed with Phase 5b billing migration applied to production
- Node.js v24.x
- npm v11.x

## Backend

| Environment | URL |
|-------------|-----|
| Staging | https://flashcard-backend-staging.luiswgordon.workers.dev |
| Production | Not yet deployed |

Backend source: [Luis-Gordon/flashcard-backend](https://github.com/Luis-Gordon/flashcard-backend)

## License

Private — All rights reserved.
