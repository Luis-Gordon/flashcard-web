# Web App Backlog

Items specific to the web app. For cross-product features requiring API changes, see the Product Backlog section in the root PRD.md.

## Critical Bugs
- [ ] **[CRITICAL — fix before production]** `DELETE /cards/:id` — 404 detection broken in `flashcard-backend/src/routes/library.ts`. Supabase `.update()` returns `count: null` unless `{ count: 'exact' }` is passed as a second argument. The `if (count === 0)` check never fires, so deleting a non-existent card ID returns `{ deleted: true }` instead of 404. Fix: change `.update({ is_deleted: true })` to `.update({ is_deleted: true }, { count: 'exact' })`.

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
- [ ] CardEditor notes field — the editor currently exposes front, back, and tags only. Notes are displayed (italicized) but not editable. Add notes textarea to `CardEditor.tsx` for full inline card editing.
- [ ] Additional LANG domain hooks — only `ja` and `default` hooks are registered in the backend hook registry. Add hooks for Chinese (`zh`), Korean (`ko`), Hindi (`hi`), Arabic (`ar`) with language-specific prompt tuning. Requires backend changes; update the language selector in `GenerateForm.tsx` once hooks are registered.

## Design Decisions Pending
- [ ] Difficulty dropdown — keep or remove based on Anki add-on audit results (see PRD Open Design Questions)
- [ ] Granularity controls — should the web app expose granularity preferences per domain?
- [ ] **Usage state location** — after generation, the sidebar usage counter does not reflect deducted cards because `useUsage` is local to each component mount. Two approaches: (a) move usage into the Zustand card store so `generateCards()` can trigger a refetch on success — single source of truth, but couples card and billing state; (b) keep `useUsage` local but expose a `refetch` handle and call it from `Generate.tsx` after generation completes — simpler but requires prop threading or a context. Decide before Phase 4 billing work begins.
- [ ] **`Generate.tsx` form/review toggle pattern** — currently uses a `useRef` + `useEffect` to detect when new results arrive and auto-switch to the review panel (`prevHasResults` ref compared against current `hasResults`). This is functionally equivalent to `showReview = pendingCards.length > 0 && !forceForm` but adds incidental complexity. The ref pattern guards against a specific edge case: if the user clears cards and re-generates, the switch to review should be driven by the *arrival* of new results, not just their presence. Whether this extra complexity is warranted or whether the simpler derived boolean is sufficient is an open question. No behavior change is implied either way — this is a readability/maintainability call.
