# Web App Backlog

Items specific to the web app. For cross-product features requiring API changes, see the Product Backlog section in the root PRD.md.

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

### Phase 5: Settings & Polish
- [ ] Dark mode
- [ ] GDPR data export and account deletion
- [ ] Mobile responsive pass
- [ ] Lighthouse audit

## Design Decisions Pending
- [ ] Difficulty dropdown — keep or remove based on Anki add-on audit results (see PRD Open Design Questions)
- [ ] Granularity controls — should the web app expose granularity preferences per domain?
