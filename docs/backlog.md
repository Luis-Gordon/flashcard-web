# Web App Backlog

Items specific to the web app. For cross-product features requiring API changes, see the Product Backlog section in the root PRD.md.

## Critical Bugs
- [ ] **[CRITICAL — fix before production]** `DELETE /cards/:id` — 404 detection broken in `flashcard-backend/src/routes/library.ts`. Supabase `.update()` returns `count: null` unless `{ count: 'exact' }` is passed as a second argument. The `if (count === 0)` check never fires, so deleting a non-existent card ID returns `{ deleted: true }` instead of 404. Fix: change `.update({ is_deleted: true })` to `.update({ is_deleted: true }, { count: 'exact' })`.

## Pre-Phase 3: Required Architecture Work

These items must be completed before Phase 3 development begins. They are not features — they prevent compounding technical debt.

- [ ] **Paraglide i18n foundation** — Install Paraglide (inlang) and extract all hardcoded UI strings to `src/locales/en.json` before any new routes or components are added in Phase 3. Do NOT add a language switcher or second locale yet — this pass is extraction only. Paraglide is preferred over react-i18next because TypeScript compile-time errors on missing translation keys catch gaps a solo developer would miss in review. Setup steps: install `@inlang/paraglide-vite` + `@inlang/paraglide-js-adapter-react`, configure the Vite plugin, create `project.inlang/` config, extract all strings from routes and components (approximately 200-400 keys). Every string literal in JSX that is user-visible becomes `m.key()`. Strings that are data (domain labels, descriptions, option values in arrays) stay in their source files — translate the display label, not the data value.
- [ ] **LANGUAGE_OPTIONS decoupling** — `GenerateForm.tsx` hardcodes `LANGUAGE_OPTIONS = [{value: "ja"}, {value: "default"}]`. Every new lang sub-hook requires a manual edit to this array. Fix: the language dropdown must be driven by a registry-aware data source. Two implementation paths: (a) expose a `/api/hooks?domain=lang` endpoint on the backend that returns `getHookOptionsForUI('lang')` output — most correct, but adds a network call to form mount; (b) maintain a frontend-side `LANG_HOOK_OPTIONS` constant in `src/lib/constants/hooks.ts` that mirrors the backend registry — simpler, but requires keeping two places in sync. Recommended: option (b) for now with a comment marking it as the sync point. When a new lang sub-hook ships in the backend, `hooks.ts` is updated in the same commit. The `displayName` from the hook definition becomes the option label — not a translation key, since hook display names are product decisions not UI strings.

## Phase 1 Fixes (before Phase 2)
- [ ] Error sanitization — completed (see session log)
- [ ] og:image meta tags — create 1200x630 branded image, add to prerender config

## Planned Features (by phase)

### Phase 2: Card Generation
- [ ] Rejection visibility — show filtered card count and reasons in review panel
- [ ] User guidance field — "Focus on..." text input in generation form (requires backend API change)
- [ ] Card count expectations — "Generated 8 of 10 (2 filtered by quality checks)" messaging
- [ ] Extension handoff — parse ?content=...&source_url=...&source_title=...&domain=... URL params

### Phase 3: Card Library
- [ ] Duplicate detection display — flag cards similar to existing library entries

### Phase 4: Export & Billing
- [ ] Stripe Checkout integration
- [ ] Usage display with overage tracking
- [ ] Usage counter refresh after generation — `useUsage` is a local hook that fetches once on mount; the sidebar counter does not update after cards are deducted. Two candidate approaches exist — see Open Design Decisions.

### Phase 5: Settings & Polish
- [ ] Dark mode
- [ ] GDPR data export and account deletion
- [ ] Mobile responsive pass
- [ ] Lighthouse audit
- [ ] `fc-*` stylesheet — card HTML uses backend-generated `fc-*` CSS classes currently styled via Tailwind arbitrary selectors in `CardReview.tsx` (e.g. `[&_.fc-word]:font-semibold`). Extract to a proper stylesheet consistent with `flashcard-anki/src/styles/stylesheet.py`.
- [ ] **Add second i18n locale** — After Paraglide extraction is complete and stable, add Japanese as the first translated locale (`src/locales/ja.json`). Marketing pages (Landing, Pricing) should use pre-rendered locale variants (`landing.ja.html`) with `hreflang` tags. Authenticated app routes use client-side locale switching from user preferences (no URL routing needed for the app shell). Priority: Japanese first, then German and Korean.
- [ ] CardEditor notes field — the editor currently exposes front, back, and tags only. Notes are displayed (italicized) but not editable. Add notes textarea to `CardEditor.tsx` for full inline card editing.
- [ ] Additional LANG domain hooks — only `ja` and `default` hooks are registered in the backend hook registry. Add hooks for Chinese (`zh`), Korean (`ko`), Hindi (`hi`), Arabic (`ar`) with language-specific prompt tuning. Requires backend changes; update the language selector in `GenerateForm.tsx` once hooks are registered.

## Design Decisions Pending
- [ ] Difficulty dropdown — keep or remove based on Anki add-on audit results (see PRD Open Design Questions)
- [ ] Granularity controls — should the web app expose granularity preferences per domain?
- [ ] **Usage state location** — after generation, the sidebar usage counter does not reflect deducted cards because `useUsage` is local to each component mount. Two approaches: (a) move usage into the Zustand card store so `generateCards()` can trigger a refetch on success — single source of truth, but couples card and billing state; (b) keep `useUsage` local but expose a `refetch` handle and call it from `Generate.tsx` after generation completes — simpler but requires prop threading or a context. Decide before Phase 4 billing work begins.
- [ ] **`Generate.tsx` form/review toggle pattern** — currently uses a `useRef` + `useEffect` to detect when new results arrive and auto-switch to the review panel (`prevHasResults` ref compared against current `hasResults`). This is functionally equivalent to `showReview = pendingCards.length > 0 && !forceForm` but adds incidental complexity. The ref pattern guards against a specific edge case: if the user clears cards and re-generates, the switch to review should be driven by the *arrival* of new results, not just their presence. Whether this extra complexity is warranted or whether the simpler derived boolean is sufficient is an open question. No behavior change is implied either way — this is a readability/maintainability call.
