import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { useUsage } from "@/lib/hooks/useUsage";
import { createCheckoutSession, getBillingPortalUrl, ApiError } from "@/lib/api";
import { findTierByApiName, PRICING_TIERS } from "@/lib/pricing";
import type { BillingTier } from "@/types/cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Zap,
  CreditCard,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Tier badge colors
// ---------------------------------------------------------------------------

const TIER_COLORS: Record<BillingTier, string> = {
  free: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  plus: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
  pro: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
};

// ---------------------------------------------------------------------------
// Subscription status messaging
// ---------------------------------------------------------------------------

function StatusBanner({ status }: { status: string }) {
  if (status === "active") return null;

  const messages: Record<string, { title: string; desc: string; variant: "default" | "destructive" }> = {
    past_due: {
      title: "Payment past due",
      desc: "Your last payment failed. Please update your payment method to avoid service interruption.",
      variant: "destructive",
    },
    canceled: {
      title: "Subscription canceled",
      desc: "Your subscription has been canceled. You can continue using the service until the end of your billing period.",
      variant: "default",
    },
    unpaid: {
      title: "Payment required",
      desc: "Your account has unpaid invoices. Please update your payment method to restore access.",
      variant: "destructive",
    },
  };

  const msg = messages[status] ?? {
    title: "Subscription issue",
    desc: "There may be an issue with your subscription. Please check your billing details.",
    variant: "default" as const,
  };

  return (
    <Alert variant={msg.variant}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{msg.title}</AlertTitle>
      <AlertDescription>{msg.desc}</AlertDescription>
    </Alert>
  );
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

// ---------------------------------------------------------------------------
// Billing page
// ---------------------------------------------------------------------------

export default function Billing() {
  const { usage, isLoading, error, refetch } = useUsage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkoutLoadingTier, setCheckoutLoadingTier] = useState<BillingTier | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -----------------------------------------------------------------------
  // Post-checkout handling
  // -----------------------------------------------------------------------

  useEffect(() => {
    const checkoutResult = searchParams.get("checkout");
    if (!checkoutResult) return;

    if (checkoutResult === "success") {
      toast.success("Subscription activated! Your plan is being updated.");

      // Poll for tier update (webhook processing delay)
      const initialTier = usage?.tier;
      let elapsed = 0;
      pollRef.current = setInterval(() => {
        elapsed += 2000;
        refetch();
        if (elapsed >= 10_000) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 2000);

      // Stop polling early if tier changed
      if (initialTier && usage?.tier !== initialTier) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } else if (checkoutResult === "canceled") {
      toast.info("Checkout canceled. No changes were made.");
    }

    // Clean URL
    setSearchParams({}, { replace: true });

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [searchParams, setSearchParams, refetch, usage?.tier]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  async function handleUpgrade(tier: BillingTier) {
    setCheckoutLoadingTier(tier);
    try {
      const { url } = await createCheckoutSession(
        tier,
        `${window.location.origin}/app/billing?checkout=success`,
        `${window.location.origin}/app/billing?checkout=canceled`,
      );
      window.location.href = url;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to start checkout";
      toast.error(message);
      setCheckoutLoadingTier(null);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const { url } = await getBillingPortalUrl(
        `${window.location.origin}/app/billing`,
      );
      window.location.href = url;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to open billing portal";
      toast.error(message);
      setPortalLoading(false);
    }
  }

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">Billing & Usage</h1>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  if (error || !usage) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">Billing & Usage</h1>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to load billing data</AlertTitle>
          <AlertDescription>
            <p>{error ?? "An unexpected error occurred."}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={refetch}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------

  const tier = usage.tier;
  const tierInfo = findTierByApiName(tier);
  const { cards_generated, cards_limit, cards_remaining, overage_cards, overage_cost_cents } = usage.usage;
  const usagePct = cards_limit > 0 ? Math.min(100, (cards_generated / cards_limit) * 100) : 0;
  const hasOverage = overage_cards > 0;
  const isPaid = tier !== "free";

  // Determine available upgrade tiers
  const upgradeTiers = PRICING_TIERS.filter((t) => {
    if (tier === "free") return t.price > 0;
    if (tier === "plus") return t.name.toLowerCase() === "pro";
    return false;
  });

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Billing & Usage</h1>

      {/* Subscription warning banner */}
      <StatusBanner status={usage.status} />

      {/* Current plan */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Current Plan</CardTitle>
            <Badge
              className={`${TIER_COLORS[tier]} border-0 text-xs font-semibold uppercase tracking-wide`}
            >
              {tier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {tierInfo && (
            <p>
              {tierInfo.price === 0
                ? "Free plan"
                : `€${tierInfo.price}/month`}
              {" · "}
              {tierInfo.cardLimit.toLocaleString()} cards per month
            </p>
          )}
          <p>
            Period: {formatDate(usage.period.start)}
            {usage.period.end ? ` – ${formatDate(usage.period.end)}` : " – ongoing"}
          </p>
          {usage.status !== "active" && (
            <p className="text-xs">
              Status: <span className="font-medium capitalize">{usage.status.replace("_", " ")}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Usage This Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cards generated</span>
              <span className="font-medium tabular-nums">
                {cards_generated.toLocaleString()} / {cards_limit.toLocaleString()}
              </span>
            </div>
            <Progress value={usagePct} className="h-2" />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {cards_remaining.toLocaleString()} remaining
              {tier === "free" && cards_remaining === 0 && " · Upgrade to continue generating"}
            </p>
          </div>

          {hasOverage && (
            <>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-muted-foreground">Overage cards</p>
                  <p className="text-xs text-muted-foreground">
                    {overage_cards.toLocaleString()} cards beyond your plan limit
                  </p>
                </div>
                <span className="font-medium tabular-nums">
                  {formatCurrency(overage_cost_cents)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Manage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upgradeTiers.map((t) => {
            const tierName = t.name.toLowerCase() as BillingTier;
            const isLoading = checkoutLoadingTier === tierName;
            const anyLoading = checkoutLoadingTier !== null || portalLoading;

            return (
              <Button
                key={t.name}
                className="w-full justify-center"
                disabled={anyLoading}
                onClick={() => handleUpgrade(tierName)}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Upgrade to {t.name} · €{t.price}/mo
              </Button>
            );
          })}

          {isPaid && (
            <Button
              variant="outline"
              className="w-full justify-center"
              disabled={checkoutLoadingTier !== null || portalLoading}
              onClick={handleManageBilling}
            >
              {portalLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Manage Billing
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Button>
          )}

          {!isPaid && upgradeTiers.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No upgrades available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
