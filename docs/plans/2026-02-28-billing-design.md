# Phase 4b: Billing — Design Document

> Created: 2026-02-28
> Status: Design complete, awaiting Stripe account setup before implementation

## Context

The web app needs a billing page and Stripe Checkout integration to let users upgrade from Free to Plus/Pro plans and manage their subscriptions. The backend billing API is fully implemented (Phase 5b). The web app has placeholders (Billing.tsx, UpgradeModal) and foundational code (pricing.ts, useUsage hook, UsageResponse type) ready to build on.

## Design Decisions

1. **UpgradeModal → Direct to Stripe**: When user clicks "Upgrade" in the modal (triggered by hitting free tier limit), call POST /billing/checkout directly and redirect to Stripe. No intermediate billing page visit.
2. **Post-checkout handling**: Show optimistic success toast + poll `/usage/current` every 2s for up to 10s until tier changes, then update page.
3. **Backend product_source fix**: Update backend `CheckoutRequestSchema` to accept `product_source` as optional field (needed because `apiRequest` auto-injects it).
4. **Pro overage rate**: Keep at €0.015 in `pricing.ts` (intentional differentiation from Plus €0.02). Backend alignment is a separate task.
5. **Usage refresh**: Custom DOM event `memogenesis:usage-changed` dispatched after card generation, listened to by `useUsage` hook. Zero coupling, no Zustand store needed.
6. **No Stripe JS SDK**: Pure redirect flow — `window.location.href = url` for both checkout and portal.

## Prerequisites Before Implementation

1. **Stripe account setup**: Connect Stripe MCP plugin to main account (test mode) instead of staging sandbox
2. **Backend schema fix**: Add `product_source: z.string().optional()` to `CheckoutRequestSchema` in `flashcard-backend/src/lib/validation/billing.ts`
3. **Verify Stripe price IDs**: Ensure backend `services/stripe.ts` has correct price IDs for the main account's test mode

## What Already Exists

| File | Status |
|------|--------|
| `src/types/cards.ts` — UsageResponse type | Complete (needs tier/status narrowing) |
| `src/lib/api.ts` — API client | Complete (needs billing methods) |
| `src/lib/pricing.ts` — PRICING_TIERS | Complete (no changes) |
| `src/lib/hooks/useUsage.ts` — usage fetch hook | Complete (needs event listener) |
| `src/routes/app/Billing.tsx` — billing page | Placeholder only |
| `src/components/billing/UpgradeModal.tsx` — upgrade modal | UI done, checkout not wired |
| `src/routes/app/AppLayout.tsx` — sidebar UsageDisplay | Complete |
| `src/routes/app/Generate.tsx` — UpgradeModal integration | Complete |

## Implementation Steps

### Step 1: Type narrowing — `src/types/cards.ts`
- Add `BillingTier = 'free' | 'plus' | 'pro'` and `SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'unpaid'`
- Narrow `UsageResponse.tier` and `.status` to use these types
- Add `CheckoutResponse` and `PortalResponse` types

### Step 2: API methods — `src/lib/api.ts`
- `createCheckoutSession(tier, successUrl, cancelUrl)` → POST /billing/checkout
- `getBillingPortalUrl(returnUrl?)` → GET /billing/portal
- Export `USAGE_CHANGED_EVENT` constant

### Step 3: Usage refresh — `src/lib/hooks/useUsage.ts` + `src/stores/cards.ts`
- useUsage: Listen for `USAGE_CHANGED_EVENT`, call `refetch()`
- cards store: Dispatch event after successful generation

### Step 4: Billing page — `src/routes/app/Billing.tsx`
Full rewrite with sections:
1. Subscription warning banner (conditional on status)
2. Current Plan card (tier badge, period dates, status)
3. Usage card (progress bar, remaining count, overage section)
4. Actions card (upgrade buttons for lower tiers, manage billing for paid tiers)
5. Loading state (skeleton cards)
6. Error state (alert + retry)
7. Post-checkout handling (query params → toast → polling)

### Step 5: Wire UpgradeModal — `src/components/billing/UpgradeModal.tsx`
- Replace Link navigation with `createCheckoutSession()` → redirect
- Loading spinner per tier button, disabled during redirect
- Error toast on failure

### Step 6: Pricing helper — `src/lib/pricing.ts`
- `findTierByApiName(apiName)` for Billing page tier lookup

### Step 7: Tests (~15-20 new)
- `tests/unit/billing-api.test.ts` — API function tests
- `tests/unit/billing.test.ts` — helper/logic tests
- `tests/unit/usage-refresh.test.ts` — event refresh tests

### Step 8: Quality gates + docs
- typecheck, lint, test, build
- Update architecture.md, session-log.md, CLAUDE.md status

## Backend API Contract

### POST /billing/checkout
```
Request:  { tier: 'plus' | 'pro', success_url: string, cancel_url: string }
Response: { request_id: string, url: string }
```
success_url/cancel_url origins must be in backend ALLOWED_ORIGINS.

### GET /billing/portal
```
Request:  GET (optional ?return_url=<url>)
Response: { request_id: string, url: string }
Error 400: VALIDATION_ERROR if no Stripe customer (free tier, never subscribed)
```

### GET /usage/current (already consumed)
Returns UsageResponse with tier, status, period, usage, and actions.

## Edge Cases
- Double-click checkout → `checkoutLoadingTier` disables all buttons
- Poll timeout (10s) → stops polling, data refreshes on next visit
- Free user portal → 400 handled (button only shown for paid tiers anyway)
- Navigate away during poll → useEffect cleanup clears interval
- product_source strict schema → backend fix required
