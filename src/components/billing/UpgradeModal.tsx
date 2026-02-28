import { useState } from "react";
import { toast } from "sonner";
import { PRICING_TIERS } from "@/lib/pricing";
import { createCheckoutSession, ApiError } from "@/lib/api";
import type { BillingTier } from "@/types/cards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const [loadingTier, setLoadingTier] = useState<BillingTier | null>(null);

  async function handleUpgrade(tierName: string) {
    const tier = tierName.toLowerCase() as BillingTier;
    setLoadingTier(tier);
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
      setLoadingTier(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            You&apos;ve reached your card generation limit. Upgrade to continue creating flashcards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {PRICING_TIERS.filter((t) => t.price > 0).map((tier) => {
            const tierKey = tier.name.toLowerCase() as BillingTier;
            const isLoading = loadingTier === tierKey;
            const anyLoading = loadingTier !== null;

            return (
              <div
                key={tier.name}
                className="flex items-start gap-4 rounded-lg border p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{tier.name}</h3>
                    {tier.popular && (
                      <Badge variant="secondary" className="text-xs">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-2xl font-bold">
                    {tier.currency === "EUR" ? "\u20ac" : "$"}
                    {tier.price}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  <ul className="mt-2 space-y-1">
                    {tier.features.slice(0, 3).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-green-600" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  size="sm"
                  className="shrink-0"
                  disabled={anyLoading}
                  onClick={() => handleUpgrade(tier.name)}
                >
                  {isLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Upgrade
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
