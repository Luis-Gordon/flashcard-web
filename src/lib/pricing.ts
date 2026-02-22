export interface PricingTier {
  name: string;
  price: number;
  currency: string;
  cardLimit: number;
  overageRate: number | null;
  overageNote: string;
  popular: boolean;
  features: string[];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free",
    price: 0,
    currency: "EUR",
    cardLimit: 50,
    overageRate: null,
    overageNote: "Hard limit — upgrade to continue",
    popular: false,
    features: [
      "50 cards per month",
      "All 10 knowledge domains",
      "Smart enhancement",
      "TTS audio generation",
      "Image suggestions",
      ".apkg export to Anki",
    ],
  },
  {
    name: "Plus",
    price: 9,
    currency: "EUR",
    cardLimit: 500,
    overageRate: 0.02,
    overageNote: "then €0.02 per card",
    popular: true,
    features: [
      "500 cards per month",
      "All 10 knowledge domains",
      "Smart enhancement",
      "TTS audio generation",
      "Image suggestions",
      ".apkg export to Anki",
      "Priority generation queue",
    ],
  },
  {
    name: "Pro",
    price: 29,
    currency: "EUR",
    cardLimit: 2000,
    overageRate: 0.015,
    overageNote: "then €0.015 per card",
    popular: false,
    features: [
      "2,000 cards per month",
      "All 10 knowledge domains",
      "Smart enhancement",
      "TTS audio generation",
      "Image suggestions",
      ".apkg export to Anki",
      "Priority generation queue",
      "Bulk generation (up to 100)",
    ],
  },
];
