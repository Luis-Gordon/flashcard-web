import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCardStore } from "@/stores/cards";
import type { EnhanceResponse, LibraryCard } from "@/types/cards";

const mockEnhanceCards = vi.fn();

vi.mock("@/lib/api", () => ({
  enhanceCards: (...args: unknown[]) => mockEnhanceCards(...args),
  generateCards: vi.fn(),
  getCards: vi.fn(),
  deleteCard: vi.fn(),
  deleteCards: vi.fn(),
  updateCard: vi.fn(),
  USAGE_CHANGED_EVENT: "memogenesis:usage-changed",
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public status: number,
      public code: string | undefined,
      public requestId: string | undefined = undefined,
      public retryAfter: number | undefined = undefined,
      public details: Record<string, unknown> | undefined = undefined,
    ) {
      super(message);
      this.name = "ApiError";
    }
  },
}));

const makeLibraryCard = (overrides: Partial<LibraryCard> = {}): LibraryCard => ({
  id: "card-1",
  user_id: "user-1",
  generation_request_id: "req-1",
  front: "What is X?",
  back: "X is Y",
  card_type: "basic",
  tags: ["test"],
  notes: "",
  source_quote: "quote",
  domain: "general",
  metadata: {},
  confidence_scores: { atomicity: 1, self_contained: 1 },
  is_deleted: false,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

const mockEnhanceResponse: EnhanceResponse = {
  request_id: "req-enhance-1",
  enhanced_cards: [
    {
      id: "card-1",
      front: "What is X? (enhanced)",
      back: "X is Y with extra context",
      tags: ["test", "enhanced"],
      notes: "Added context",
      skipped_enhancements: [],
      tts_front_url: null,
      tts_back_url: null,
      tts_answer_url: null,
      tts_example_url: null,
      image_url: null,
      image_attribution: null,
      image_search_query: null,
    },
  ],
  failed_cards: [],
  usage: { cards_enhanced: 1, tts_characters: 0, cost_cents: 5 },
};

describe("enhanceLibraryCards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCardStore.setState({
      pendingCards: [],
      rejectedCards: [],
      unsuitableContent: [],
      isGenerating: false,
      generateError: null,
      lastGenerateResponse: null,
      lastMaxCards: null,
      selectedCardIds: new Set(),
      libraryCards: [
        makeLibraryCard({ id: "card-1" }),
        makeLibraryCard({ id: "card-2", front: "Card 2 front", back: "Card 2 back" }),
      ],
      libraryPagination: { page: 1, limit: 20, total: 2, total_pages: 1 },
      isLoadingLibrary: false,
      libraryError: null,
      librarySelectedIds: new Set(),
      isEnhancing: false,
      enhanceError: null,
      exportCards: [],
    });
  });

  it("updates libraryCards with enhanced content on success", async () => {
    mockEnhanceCards.mockResolvedValue(mockEnhanceResponse);

    const response = await useCardStore.getState().enhanceLibraryCards({
      cardIds: ["card-1"],
      domain: "general",
      enhancements: { add_context: true, add_tags: true, fix_formatting: true },
    });

    const state = useCardStore.getState();
    const card1 = state.libraryCards.find((c) => c.id === "card-1")!;

    expect(card1.front).toBe("What is X? (enhanced)");
    expect(card1.back).toBe("X is Y with extra context");
    expect(card1.tags).toEqual(["test", "enhanced"]);
    expect(card1.notes).toBe("Added context");
    expect(response.enhanced_cards).toHaveLength(1);
  });

  it("sets isEnhancing during enhancement", async () => {
    let resolveEnhance: (value: EnhanceResponse) => void;
    const promise = new Promise<EnhanceResponse>((resolve) => {
      resolveEnhance = resolve;
    });
    mockEnhanceCards.mockReturnValue(promise);

    const enhancePromise = useCardStore.getState().enhanceLibraryCards({
      cardIds: ["card-1"],
      domain: "general",
      enhancements: { add_context: true, add_tags: true, fix_formatting: true },
    });

    expect(useCardStore.getState().isEnhancing).toBe(true);

    resolveEnhance!(mockEnhanceResponse);
    await enhancePromise;

    expect(useCardStore.getState().isEnhancing).toBe(false);
  });

  it("does not modify failed cards in store", async () => {
    const responseWithFailure: EnhanceResponse = {
      ...mockEnhanceResponse,
      enhanced_cards: [],
      failed_cards: [{ id: "card-1", error: "Failed to enhance" }],
    };
    mockEnhanceCards.mockResolvedValue(responseWithFailure);

    await useCardStore.getState().enhanceLibraryCards({
      cardIds: ["card-1"],
      domain: "general",
      enhancements: { add_context: true, add_tags: true, fix_formatting: true },
    });

    const card1 = useCardStore.getState().libraryCards.find((c) => c.id === "card-1")!;
    expect(card1.front).toBe("What is X?");
    expect(card1.back).toBe("X is Y");
  });

  it("dispatches USAGE_CHANGED_EVENT on success", async () => {
    mockEnhanceCards.mockResolvedValue(mockEnhanceResponse);

    const handler = vi.fn();
    window.addEventListener("memogenesis:usage-changed", handler);

    await useCardStore.getState().enhanceLibraryCards({
      cardIds: ["card-1"],
      domain: "general",
      enhancements: { add_context: true, add_tags: true, fix_formatting: true },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener("memogenesis:usage-changed", handler);
  });

  it("sets enhanceError and rethrows on API failure", async () => {
    const { ApiError } = await import("@/lib/api");
    mockEnhanceCards.mockRejectedValue(new ApiError("Rate limited", 429, "RATE_LIMITED", "req-1", 5, undefined));

    await expect(
      useCardStore.getState().enhanceLibraryCards({
        cardIds: ["card-1"],
        domain: "general",
        enhancements: { add_context: true, add_tags: true, fix_formatting: true },
      }),
    ).rejects.toThrow("Rate limited");

    const state = useCardStore.getState();
    expect(state.isEnhancing).toBe(false);
    expect(state.enhanceError).toBe("Rate limited");
  });

  it("sends correct request shape to API", async () => {
    mockEnhanceCards.mockResolvedValue(mockEnhanceResponse);

    await useCardStore.getState().enhanceLibraryCards({
      cardIds: ["card-1"],
      domain: "general",
      enhancements: { add_context: true, add_tags: false, fix_formatting: true },
    });

    expect(mockEnhanceCards).toHaveBeenCalledWith({
      cards: [
        {
          id: "card-1",
          front: "What is X?",
          back: "X is Y",
          card_type: "basic",
          existing_tags: ["test"],
          existing_notes: "",
        },
      ],
      domain: "general",
      enhancements: {
        add_context: true,
        add_tags: false,
        fix_formatting: true,
        add_tts: false,
        add_images: false,
      },
    });
  });

  it("updates updated_at on enhanced cards", async () => {
    mockEnhanceCards.mockResolvedValue(mockEnhanceResponse);

    const beforeTime = new Date().toISOString();

    await useCardStore.getState().enhanceLibraryCards({
      cardIds: ["card-1"],
      domain: "general",
      enhancements: { add_context: true, add_tags: true, fix_formatting: true },
    });

    const card1 = useCardStore.getState().libraryCards.find((c) => c.id === "card-1")!;
    expect(card1.updated_at >= beforeTime).toBe(true);

    // card-2 should remain unchanged
    const card2 = useCardStore.getState().libraryCards.find((c) => c.id === "card-2")!;
    expect(card2.updated_at).toBe("2025-01-01T00:00:00Z");
  });
});
