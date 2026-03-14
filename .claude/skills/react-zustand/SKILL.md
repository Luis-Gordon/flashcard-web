---
name: react-zustand
description: Zustand store architecture, auth flow, card generation pipeline, API client patterns, and component conventions for the flashcard-web app
---

# React Zustand — Web App Skill

Client-side SPA: Vite + React 19 + Zustand + Tailwind CSS v4, deployed as static assets on Cloudflare Workers.

## Key References

- **Commands & constraints**: `flashcard-web/CLAUDE.md`
- **Architecture** (store architecture, auth flow, API client, component patterns): `flashcard-web/docs/architecture.md`
- **React patterns**: `.claude/rules/react-patterns.md` — `useShallow`, `React.memo`, DOMPurify, Tailwind-only, React Router 7 library mode
- **TypeScript conventions**: `.claude/rules/typescript.md`
- **API contract** (error codes, timeouts, endpoints, HTML contract): `.claude/skills/api-contract/SKILL.md`

## Gaps Not in Above Docs

- **Store file layout**: Each Zustand store lives in `src/stores/*.ts`. Stores are independent — no cross-store imports. Components access stores via hook selectors with `useShallow`.
- **API client**: `src/lib/api.ts` wraps `fetch` with auth header injection, error mapping, and auto-retry on 429. All API calls go through this — never use raw `fetch`.
- **Environment modes**: `--mode staging` sets `VITE_API_URL` to staging backend. The `deploy:staging` script handles this automatically; never build manually for staging.
