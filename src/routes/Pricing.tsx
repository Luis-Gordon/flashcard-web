import { Link } from "react-router";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { PRICING_TIERS } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export default function Pricing() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free. Upgrade when you need more cards. No annual contracts.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={cn(
                "relative flex flex-col",
                tier.popular && "border-primary shadow-md",
              )}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription>
                  <span className="mt-2 block">
                    <span className="text-4xl font-bold text-foreground">
                      {tier.price === 0 ? "Free" : `€${tier.price}`}
                    </span>
                    {tier.price > 0 && (
                      <span className="text-muted-foreground"> /month</span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm">
                    {tier.cardLimit.toLocaleString()} cards included
                  </span>
                  {tier.overageNote && (
                    <span className="block text-xs text-muted-foreground">
                      {tier.overageNote}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button
                    className="w-full"
                    variant={tier.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link to="/signup">
                      {tier.price === 0 ? "Get Started" : "Start Free Trial"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            All plans include all 10 knowledge domains, TTS audio, images, and
            .apkg export. Prices in EUR. Cancel anytime.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
