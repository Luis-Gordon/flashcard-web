# Flashcard Tools — Web App

React SPA serving as the central hub for the Memogenesis ecosystem. Handles user signup, subscription billing (via Stripe), card generation and management, and client-side .apkg export.

Part of the [Flashcard Tools ecosystem](https://github.com/Luis-Gordon/flashcard-tools).

## Status

**Phases 1–3 + 4a complete** — auth, marketing pages, card generation + review, paginated library with filters, and multi-format export (APKG/CSV/Markdown/JSON). See [CLAUDE.md](./CLAUDE.md) for next steps.

## Getting Started

### Prerequisites

- Node.js v24.x
- npm v11.x

### Setup

```bash
# Clone and navigate
cd flashcard-web

# Install dependencies
npm install

# Create environment config
cp .env.example .env.development
# Edit .env.development with your Supabase project URL and anon key

# Start dev server
npm run dev
# Opens at http://localhost:5173
```

### Environment Variables

Copy `.env.example` to `.env.development` and fill in your Supabase credentials:

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8787` |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key | `eyJ…` |

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # Production build (includes prerender)
npm run preview      # Preview production build
npm run deploy       # Deploy to Cloudflare Workers (production)
npm run build:staging # Build with staging env
npm run deploy:staging # Build + deploy to staging Workers
npm run test         # Run unit tests (Vitest)
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run e2e tests (Playwright)
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run typecheck    # TypeScript type checking
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Build | Vite 6 + @tailwindcss/vite | Build tooling |
| UI | React 19 | UI library |
| Routing | React Router 7 (library mode) | Client-side routing |
| Styling | Tailwind CSS v4 + shadcn/ui | Styling |
| State | Zustand | Client-side state |
| Auth | Supabase Auth | Shared with backend |
| Payments | Stripe Checkout + Customer Portal | Billing (Phase 4b) |
| Export | sql.js (WASM) + JSZip | Client-side .apkg export (Phase 4a) |
| Hosting | Cloudflare Workers (static assets) | Deployment |
| Testing | Vitest (unit) + Playwright (e2e) | Testing |

## Backend

| Environment | URL |
|-------------|-----|
| Staging | https://flashcard-backend-staging.luiswgordon.workers.dev |
| Production | Not yet deployed |

Backend source: [Luis-Gordon/flashcard-backend](https://github.com/Luis-Gordon/flashcard-backend)

## License

Private — All rights reserved.
