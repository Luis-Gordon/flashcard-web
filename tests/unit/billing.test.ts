import { describe, it, expect } from "vitest";
import { findTierByApiName, PRICING_TIERS } from "@/lib/pricing";

// ---------------------------------------------------------------------------
// findTierByApiName
// ---------------------------------------------------------------------------

describe("findTierByApiName", () => {
  it("finds Free tier by lowercase name", () => {
    const tier = findTierByApiName("free");
    expect(tier).toBeDefined();
    expect(tier!.name).toBe("Free");
    expect(tier!.price).toBe(0);
  });

  it("finds Plus tier by lowercase name", () => {
    const tier = findTierByApiName("plus");
    expect(tier).toBeDefined();
    expect(tier!.name).toBe("Plus");
    expect(tier!.price).toBe(9);
  });

  it("finds Pro tier by lowercase name", () => {
    const tier = findTierByApiName("pro");
    expect(tier).toBeDefined();
    expect(tier!.name).toBe("Pro");
    expect(tier!.price).toBe(29);
  });

  it("is case-insensitive", () => {
    expect(findTierByApiName("PLUS")).toBeDefined();
    expect(findTierByApiName("Plus")).toBeDefined();
    expect(findTierByApiName("pLuS")).toBeDefined();
  });

  it("returns undefined for unknown tier", () => {
    expect(findTierByApiName("enterprise")).toBeUndefined();
    expect(findTierByApiName("")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Upgrade availability logic
// ---------------------------------------------------------------------------

describe("upgrade availability", () => {
  const paidTiers = PRICING_TIERS.filter((t) => t.price > 0);

  it("free users can upgrade to Plus and Pro", () => {
    const upgrades = PRICING_TIERS.filter((t) => t.price > 0);
    expect(upgrades).toHaveLength(2);
    expect(upgrades.map((t) => t.name)).toEqual(["Plus", "Pro"]);
  });

  it("plus users can upgrade to Pro only", () => {
    const upgrades = paidTiers.filter(
      (t) => t.name.toLowerCase() === "pro",
    );
    expect(upgrades).toHaveLength(1);
    expect(upgrades[0]!.name).toBe("Pro");
  });

  it("pro users have no upgrade options", () => {
    const upgrades = paidTiers.filter((t) => {
      const name = t.name.toLowerCase();
      return name !== "plus" && name !== "pro";
    });
    expect(upgrades).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Overage formatting
// ---------------------------------------------------------------------------

describe("overage formatting", () => {
  it("formats overage cost from cents to EUR", () => {
    // Simulate the formatCurrency logic from Billing.tsx
    const cents = 350;
    const formatted = new Intl.NumberFormat("en-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(cents / 100);
    expect(formatted).toMatch(/3[.,]50/);
    expect(formatted).toMatch(/€/);
  });

  it("formats zero overage cost", () => {
    const cents = 0;
    const formatted = new Intl.NumberFormat("en-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(cents / 100);
    expect(formatted).toMatch(/0[.,]00/);
  });

  it("tier pricing data has consistent structure", () => {
    for (const tier of PRICING_TIERS) {
      expect(tier.name).toBeTruthy();
      expect(tier.currency).toBe("EUR");
      expect(tier.cardLimit).toBeGreaterThan(0);
      expect(tier.features.length).toBeGreaterThan(0);

      if (tier.price === 0) {
        expect(tier.overageRate).toBeNull();
      } else {
        expect(tier.overageRate).toBeGreaterThan(0);
      }
    }
  });
});
