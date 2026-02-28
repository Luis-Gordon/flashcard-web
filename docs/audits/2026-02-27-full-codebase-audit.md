# Full Codebase Audit Report — flashcard-web

> **Date**: 2026-02-27 | **Phase**: 3 complete | **Tests**: 51/51 passing | **Quality gates**: all green

## Critical (Security vulnerabilities, data loss risks, crash-causing bugs)

| # | Issue | Location | Details |
|---|-------|----------|---------|
| C1 | **Zustand selectors cause cascading re-renders** | `src/lib/hooks/useCards.ts:4-62` | All 6 hooks return new `{ }` object literals on every store update. `Object.is()` fails — every component re-renders on every unrelated state change. Library page with 20 cards triggers 120+ unnecessary child re-renders per store update. |
| C2 | **`fetchLibrary` in useEffect deps is unstable** | `src/routes/app/Library.tsx:71-73` | `fetchLibrary` comes from a `useLibrary()` hook that returns a new object each render (C1). Including it in useEffect deps causes the fetch to re-fire on every render — potential infinite loop and unnecessary API calls. |
| C3 | **APKG builder unbounded memory for large decks** | `src/lib/apkg/builder.ts:85-135` | All note/card inserts synchronous in tight loop. No batching, no yield, no abort. Exporting 1000+ cards will freeze tab; 5000+ will crash it on low-end devices. |
| C4 | **Library card actions hidden from keyboard users** | `src/components/cards/LibraryCardItem.tsx:77-96` | Edit/Delete buttons use `opacity-0 group-hover:opacity-100`. Keyboard-only users cannot see or reach these buttons via Tab. |
| C5 | **Missing CSP headers** | `wrangler.jsonc` | No Content-Security-Policy configured. Allows inline scripts, external script loading, form submissions to any domain. |

## High (Performance sinks, incorrect behavior, significant gaps)

| # | Issue | Location | Details |
|---|-------|----------|---------|
| H1 | **List items not memoized + inline callbacks** | `Library.tsx:359-390`, `CardReview.tsx:268-283` | 4 new arrow functions created per card per render. Neither `LibraryCardItem` nor `CardItem` use `React.memo()`. Every parent re-render re-renders all children. |
| H2 | **Missing 401 UNAUTHORIZED handling in API client** | `src/lib/api.ts:95-104` | API client throws `ApiError` on 401 but doesn't trigger sign-out. User stays in "authenticated" state with expired token. Violates API contract. |
| H3 | **APKG ID collision risk** | `src/lib/apkg/schema.ts:107-113` | `generateId()` uses `Date.now() + idCounter`. Counter resets on module reload. Rapid exports could produce duplicate deck/model IDs. |
| H4 | **APKG builder has zero test coverage** | (no test file) | `generateApkg()` is completely untested — no mock, no integration, no e2e. ZIP structure, SQL schema, WASM loading all unverified by tests. |
| H5 | **sql.js WASM path hardcoded** | `src/lib/apkg/builder.ts:47-49` | `locateFile: (file) => '/${file}'` breaks on subpath deploys. No error handling if WASM file missing. |
| H6 | **Domain badge dark mode contrast fails WCAG AA** | `src/lib/constants/domains.ts:15-27` | Semi-transparent backgrounds (`bg-sky-900/40`) + light text (`text-sky-300`) estimate ~3.5:1 contrast. WCAG AA requires 4.5:1. |
| H7 | **Export format selector not keyboard accessible** | `src/routes/app/Export.tsx:183-195` | Format buttons are `<button>` elements with no `role="radio"`, `aria-checked`, or arrow key navigation. Screen readers can't identify selected format. |
| H8 | **Prerender XSS via template injection** | `scripts/prerender.ts:88-115` | Template string interpolation in JSON-LD and meta tags. Currently safe (hardcoded values), but no escaping — architectural risk for future changes. |

## Medium (Anti-patterns, missing best practices, simplification opportunities)

| # | Issue | Location | Details |
|---|-------|----------|---------|
| M1 | **Missing 429 retry logic in API client** | `src/lib/api.ts:45-125` | API contract requires "auto-retry (max 2, cap 60s)". Client returns `retryAfter` but doesn't auto-retry. Components must handle manually. |
| M2 | **`console.error` in production auth routes** | `Login.tsx:42`, `Signup.tsx:67` | Sensitive error details (email enumeration, backend URLs) leak to browser console. |
| M3 | **`bulkDeleteLibraryCards` no rollback on API failure** | `src/stores/cards.ts:217-230` | If API call fails after optimistic removal, cards aren't restored and selection state is inconsistent. No error toast shown. |
| M4 | **DOMPurify allows `<table>` tags** | `src/components/cards/SanitizedHTML.tsx:5-10` | Tables aren't part of the documented `fc-*` class structure. Could cause layout issues with wide tables. |
| M5 | **HTML stripping loses ruby/furigana context** | `src/lib/export/html.ts:9` | `<ruby>漢字<rt>かんじ</rt></ruby>` becomes `漢字かんじ`. Language learning context lost in CSV/Markdown exports. |
| M6 | **No skip-to-content link** | `src/routes/app/AppLayout.tsx` | Keyboard users must tab through entire sidebar before reaching main content. |
| M7 | **Export dispatcher has no default case** | `src/lib/export/index.ts:66-83` | Adding a new format to the type but not the switch statement — silent failure. |
| M8 | **APKG GUID uses 90 chars instead of Anki's base91** | `src/lib/apkg/schema.ts:81-91` | Missing one character from proper base91 set. Works (Anki recalculates) but non-compliant. |
| M9 | **Auth store `onAuthStateChange` never unsubscribed** | `src/stores/auth.ts:26-36` | Subscriber accumulates if `initialize()` called multiple times. Currently only called once, but bad pattern. |
| M10 | **Library.tsx is 427 lines** | `src/routes/app/Library.tsx` | Could extract `EmptyLibraryState`, `CardGrid`, and undo-delete logic into separate components/hooks. |
| M11 | **LibraryToolbar debounce double-update** | `src/components/cards/LibraryToolbar.tsx:50-59` | Sync effect + debounce handler causes redundant state update. Search input may briefly flash stale value. |
| M12 | **Export page sub-components not memoized** | `src/routes/app/Export.tsx:285-411` | `FormatCard` and `OptionField` recreate callbacks on every render. Small list (4-5 items) so minor impact. |
| M13 | **Expand button missing focus indicator** | `src/components/cards/LibraryCardItem.tsx:110-125` | "Show/Hide answer" button has no visible focus ring. Keyboard users can't see where focus is. |

## Low (Style issues, minor redundancies, nice-to-haves)

| # | Issue | Location | Details |
|---|-------|----------|---------|
| L1 | **6 unused shadcn components** | `src/components/ui/` | `form.tsx`, `navigation-menu.tsx`, `radio-group.tsx`, `table.tsx`, `tabs.tsx`, `tooltip.tsx` never imported. ~10-15 KB bundle dead weight. |
| L2 | **Unused `next-themes` dependency** | `package.json` | Installed but never imported. ~3 KB bundle waste. |
| L3 | **Unused `sharp` devDependency** | `package.json` | ~10 MB in node_modules, never used in build. |
| L4 | **Duplicate select-all checkbox UI** | `CardReview.tsx:251-264`, `Library.tsx:340-354` | Identical pattern in two places. Could extract to `SelectAllBar` component. |
| L5 | **JSON export strips card IDs** | `src/lib/export/json.ts:9-24` | Users exporting then re-importing lose card identity. Consider optional `include_id` flag. |
| L6 | **APKG schema creates unused Default deck** | `src/lib/apkg/schema.ts:210-228` | Hardcoded deck ID=1 created but never used. Minor overhead. |
| L7 | **Tags formatting inconsistent across formats** | `builder.ts:90` vs `csv.ts:41` | APKG adds spaces around tags, CSV uses semicolons with no spaces. |
| L8 | **`tw-animate-css` may duplicate Tailwind animations** | `src/index.css` | Verify if custom animations beyond Tailwind built-ins are needed. |
| L9 | **Export formatters lack edge case tests** | `tests/unit/export.test.ts` | No tests for Unicode, RTL text, emoji tags, very long fields, empty arrays. |
| L10 | **Download utility untested** | `src/lib/export/download.ts` | `triggerDownload()` has no test — Blob URL lifecycle unverified. |
| L11 | **API error path tests missing** | (no test file) | 401, 402, 429, 413, 500 error handling paths all untested. |

## Verified Good (Patterns that passed audit)

- **Auth tokens**: Never in localStorage. Fetched from `supabase.auth.getSession()` per request.
- **XSS prevention**: DOMPurify with strict allowlist. No `script`, `iframe`, `form`, `style` attr.
- **Open redirects**: All redirects hardcoded (`/app`, `/login`). No user-controlled targets.
- **Input validation**: Zod on all forms. Content limits enforced (100KB text, 10MB PDF).
- **Code splitting**: 11 lazy routes + dynamic APKG import. Bundle structure optimal.
- **TypeScript strict mode**: All strictness flags enabled including `noUncheckedIndexedAccess`.
- **API timeout cleanup**: AbortController + `clearTimeout` in finally block.
- **Radix patches**: All 4 patches fix legitimate React 19 ref stability issues.
- **SPA fallback**: `not_found_handling: "single-page-application"` in wrangler.jsonc.

## Recommended Fix Order

### Batch 1 — Performance (C1, C2, H1)

Fix Zustand selectors with `useShallow`, wrap list items in `React.memo`, extract callbacks with `useCallback`. This is the highest-impact fix — it eliminates the re-render cascade affecting every page.

### Batch 2 — API Contract (H2, M1)

Add 401 → auto-signout in `apiRequest()`, add 429 retry with backoff. These are contract violations that will cause real UX failures.

### Batch 3 — Accessibility (C4, H6, H7, M6, M13)

Make card actions keyboard-accessible, fix badge contrast, add radio semantics to export format selector, add skip link and focus indicators.

### Batch 4 — Export Robustness (C3, H3, H5)

Add large deck warning/cap, fix ID generation, handle WASM path errors. These prevent crashes and data corruption.

### Batch 5 — Security (C5, H8, M2, M4)

Add CSP headers, escape prerender templates, remove console.error from auth, review DOMPurify allowlist.

### Batch 6 — Tests & Cleanup (H4, L1-L3, L9-L11)

Add APKG builder tests, remove dead code/deps, add edge case tests.
