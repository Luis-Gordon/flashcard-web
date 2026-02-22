# Session Log

## Session 1 — 2026-02-22 — Phase 1: Project Setup, Auth & Legal Pages

### What was done
- **M1**: Initialized Vite 6 + React 19 + TypeScript strict mode. Configured `@tailwindcss/vite` (v4), ESLint flat config, Vitest with jsdom, and `wrangler.jsonc` for SPA deployment.
- **M2**: Configured shadcn/ui (new-york style, neutral base, CSS variables). Installed 12 base components: button, card, input, label, separator, avatar, dropdown-menu, sheet, navigation-menu, badge, form, sonner. Added react-hook-form + @hookform/resolvers.
- **M3**: Created Supabase browser client (singleton), Zustand auth store, AuthGuard component, typed API client with `product_source: 'web_app'` injection. Defined all routes with React Router 7 library mode.
- **M4**: Built Login and Signup pages with Zod validation + react-hook-form. Created MarketingLayout (responsive header/footer). Wrote 8 auth store unit tests.
- **M5**: Implemented AppLayout with desktop sidebar + mobile sheet drawer. Active route highlighting, user avatar dropdown with sign out. Styled placeholder pages for Generate/Library/Export/Billing/Settings.
- **M6**: Built landing page (hero, 10-domain grid, features, how-it-works, CTA). Created pricing constants module and 3-tier pricing page (Free/Plus/Pro).
- **M7**: Added GDPR-compliant privacy policy and terms of service. Created build-time prerender script for SEO. Updated all documentation.

### Architecture decisions
- **No `@cloudflare/vite-plugin` in dev**: The CF plugin is excluded from vite.config.ts since this is a pure static SPA — Vite's standard dev server works perfectly. The `wrangler.jsonc` handles deployment config separately.
- **Tailwind v4 + Vite plugin**: Using `@tailwindcss/vite` instead of PostCSS. No `tailwind.config.ts` needed — CSS-first config via `@theme` in index.css.
- **React Router 7 library mode**: Using `<BrowserRouter>` + `<Routes>` + `<Route>` pattern (not createBrowserRouter/RouterProvider/loaders). Data fetching via api.ts + Zustand.
- **Zod v4**: Installed with npm; `@hookform/resolvers` v5.2.2 supports it natively.
- **Auth state outside React**: Zustand store initialized before React renders (`useAuthStore.getState().initialize()` in main.tsx). Both the store and api.ts import supabase.ts directly — no circular dependency.
- **Prerender approach**: Build-time static HTML via `tsx scripts/prerender.ts`. React components are the single source of truth; prerender wraps them in SEO-friendly HTML shells. Runs as `prebuild` npm hook.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 8/8 tests passing
- Vite build: succeeds (prebuild + build pipeline)
- Bundle size: 697 KB (single chunk, code splitting deferred to Phase 2)

### Next session tasks (Phase 2 — moved to backlog)
1. Card generation form + API integration
2. Card review/edit UI
3. Code splitting with lazy route imports
4. Connect to backend staging API for end-to-end testing

## Session 2 — 2026-02-22 — Phase 1 Code Review Fixes

### What was done
- **Error sanitization**: Login and Signup pages no longer leak raw Supabase error messages to the UI. Raw errors are logged to console for debugging; users see generic messages. The "already registered" detection in Signup is preserved.
- **Named export enforcement**: Changed `AuthGuard` from `export default` to named export, matching the convention that only route page components use default exports. Updated the import in `App.tsx`.
- **Prerender redirect fix**: Replaced broken inline `<script>` in prerender output. Old logic was a no-op or infinite redirect loop. New logic redirects `/pricing.html` → `/pricing`, letting wrangler's SPA fallback handle clean URLs.
- **Auth store audit**: Verified `supabase.auth.getSession()` usage, `product_source` injection, and no localStorage token storage. No changes needed.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 8/8 tests passing
- Vite build: succeeds (prebuild + build pipeline)

## Session 3 — 2026-02-22 — Logo Integration (Favicon, Header, OG Image)

### What was done
- **Favicon**: Replaced broken `/favicon.svg` reference in `index.html` with `/logo.svg` (SVG primary) + `/favicon.png` (32x32 PNG fallback). Added `og:image` meta tag.
- **Header logo**: Added `<img src="/logo.svg">` (h-7 w-7) to header branding in `MarketingLayout.tsx` and `AppLayout.tsx` (3 locations). Converted mobile header `<span>` to `<Link to="/">` for consistency.
- **OG image**: Created `scripts/generate-assets.ts` using `sharp` to produce `public/og-image.png` (1200x630, logo + title + tagline on white canvas) and `public/favicon.png` (32x32).
- **Prerender SEO**: Updated `scripts/prerender.ts` with favicon links, `og:image`, `twitter:image`, and upgraded `twitter:card` from `summary` to `summary_large_image`.
- **Dependency**: Added `sharp` as devDependency for asset generation.

### Quality gates
- TypeScript strict: passing (0 errors)
- ESLint: clean (0 warnings)
- Vitest: 8/8 tests passing
- Vite build: succeeds (prebuild + build pipeline)
