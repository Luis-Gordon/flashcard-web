/** Supported card generation domains */
export type CardDomain =
  | "lang"
  | "general"
  | "med"
  | "stem-m"
  | "stem-cs"
  | "fin"
  | "law"
  | "arts"
  | "skill"
  | "mem";

export type CardStyle = "basic" | "cloze" | "mixed";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type CardType = "basic" | "cloze";

/** A generated card (from backend response) */
export interface Card {
  /** Client-side ID assigned after generation */
  id: string;
  front: string;
  back: string;
  card_type: CardType;
  tags: string[];
  notes: string;
  source_quote: string;
  confidence_scores: { atomicity: number; self_contained: number };
  /** Domain-specific metadata (e.g., lang_metadata, general_metadata) */
  [key: string]: unknown;
}

/** A persisted card from the library (database row) */
export interface LibraryCard {
  id: string;
  user_id: string;
  generation_request_id: string;
  front: string;
  back: string;
  card_type: CardType;
  tags: string[];
  notes: string;
  source_quote: string;
  domain: CardDomain;
  metadata: Record<string, unknown>;
  confidence_scores: { atomicity: number; self_contained: number };
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Minimum shape for CardEditor — both Card and LibraryCard satisfy this.
 * Avoids union type issues from Card's index signature.
 */
export interface EditableCard {
  id: string;
  front: string;
  back: string;
  card_type: CardType;
  tags: string[];
  notes: string;
}

/** Body for PATCH /cards/:id */
export interface UpdateCardRequest {
  front?: string;
  back?: string;
  tags?: string[];
  notes?: string;
  domain?: CardDomain;
}

/** Supported export formats */
export type ExportFormat = "apkg" | "csv" | "markdown" | "json";

/** Billing tier names (matches backend) */
export type BillingTier = "free" | "plus" | "pro";

/** Subscription status (matches Stripe statuses used by backend) */
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "unpaid";

/** Rejected card from backend */
export interface RejectedCard {
  card: Card;
  errors: string[];
}

/** Unsuitable content from backend */
export interface UnsuitableContent {
  content: string;
  reason: string;
  explanation: string;
}

/** Request body for POST /cards/generate */
export interface GenerateRequest {
  content: string;
  content_type: "text" | "url" | "pdf";
  domain: CardDomain;
  options: {
    max_cards: number;
    card_style: CardStyle;
    difficulty: Difficulty;
  };
  hook_key?: string;
}

/** Response from POST /cards/generate */
export interface GenerateResponse {
  request_id: string;
  cards: Card[];
  rejected?: RejectedCard[];
  unsuitable_content?: UnsuitableContent[];
  usage: {
    cards_generated: number;
    cards_rejected: number;
    cards_remaining: number | null;
    tokens_used: number;
  };
  warnings: string[];
}

/** Response from GET /cards (library) */
export interface LibraryResponse {
  request_id: string;
  cards: LibraryCard[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/** Filters for library query */
export interface CardFilters {
  page?: number;
  limit?: number;
  domain?: CardDomain;
  search?: string;
  sort?: "created_at" | "updated_at" | "domain";
  order?: "asc" | "desc";
  tag?: string;
  created_after?: string;
  created_before?: string;
}

/** Response from GET /usage/current */
export interface UsageResponse {
  request_id: string;
  tier: BillingTier;
  status: SubscriptionStatus;
  period: {
    start: string;
    end: string | null;
  };
  usage: {
    cards_generated: number;
    cards_limit: number;
    cards_remaining: number;
    overage_cards: number;
    overage_cost_cents: number;
  };
  actions: {
    generate: number;
    enhance: number;
    tts: number;
    image: number;
  };
}

/** Response from POST /billing/checkout */
export interface CheckoutResponse {
  request_id: string;
  url: string;
}

/** Response from GET /billing/portal */
export interface PortalResponse {
  request_id: string;
  url: string;
}
