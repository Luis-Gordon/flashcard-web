import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCardStore } from "@/stores/cards";
import { ApiError } from "@/lib/api";
import type { GenerateResponse } from "@/types/cards";

// Mock API module
const mockGenerateCards = vi.fn();
const mockGetCards = vi.fn();
const mockDeleteCard = vi.fn();

vi.mock("@/lib/api", () => ({
  generateCards: (...args: unknown[]) => mockGenerateCards(...args),
  getCards: (...args: unknown[]) => mockGetCards(...args),
  deleteCard: (...args: unknown[]) => mockDeleteCard(...args),
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

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: () => "mock-uuid-" + Math.random().toString(36).slice(2, 8),
});

const mockGenerateResponse: GenerateResponse = {
  request_id: "req-123",
  cards: [
    {
      id: "",
      front: "What is photosynthesis?",
      back: "The conversion of light to chemical energy",
      card_type: "basic",
      tags: ["biology"],
      notes: "",
      source_quote: "Photosynthesis...",
      confidence_scores: { atomicity: 1, self_contained: 1 },
    },
    {
      id: "",
      front: "What is mitosis?",
      back: "Cell division",
      card_type: "basic",
      tags: ["biology"],
      notes: "",
      source_quote: "Mitosis...",
      confidence_scores: { atomicity: 1, self_contained: 1 },
    },
  ],
  usage: {
    cards_generated: 2,
    cards_rejected: 0,
    cards_remaining: 48,
    tokens_used: 500,
  },
  warnings: [],
};

describe("useCardStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCardStore.setState({
      pendingCards: [],
      rejectedCards: [],
      unsuitableContent: [],
      isGenerating: false,
      generateError: null,
      lastGenerateResponse: null,
      selectedCardIds: new Set(),
      libraryCards: [],
      libraryPagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
      isLoadingLibrary: false,
    });
  });

  it("starts with empty state", () => {
    const state = useCardStore.getState();
    expect(state.pendingCards).toHaveLength(0);
    expect(state.isGenerating).toBe(false);
    expect(state.generateError).toBeNull();
  });

  it("generates cards and assigns client IDs", async () => {
    mockGenerateCards.mockResolvedValue(mockGenerateResponse);

    await useCardStore.getState().generateCards({
      content: "Biology content",
      domain: "general",
      cardStyle: "mixed",
      difficulty: "intermediate",
      maxCards: 10,
    });

    const state = useCardStore.getState();
    expect(state.pendingCards).toHaveLength(2);
    expect(state.isGenerating).toBe(false);
    expect(state.generateError).toBeNull();

    // Each card should have a UUID
    for (const card of state.pendingCards) {
      expect(card.id).toMatch(/^mock-uuid-/);
    }

    // All cards selected by default
    expect(state.selectedCardIds.size).toBe(2);
  });

  it("sets isGenerating during generation", async () => {
    let resolveGenerate: (value: GenerateResponse) => void;
    const promise = new Promise<GenerateResponse>((resolve) => {
      resolveGenerate = resolve;
    });
    mockGenerateCards.mockReturnValue(promise);

    const generatePromise = useCardStore.getState().generateCards({
      content: "Content",
      domain: "general",
      cardStyle: "mixed",
      difficulty: "intermediate",
      maxCards: 10,
    });

    expect(useCardStore.getState().isGenerating).toBe(true);

    resolveGenerate!(mockGenerateResponse);
    await generatePromise;

    expect(useCardStore.getState().isGenerating).toBe(false);
  });

  it("handles generation errors", async () => {
    const error = new ApiError("Usage limit exceeded", 402, "USAGE_EXCEEDED", undefined, undefined, undefined);
    mockGenerateCards.mockRejectedValue(error);

    await expect(
      useCardStore.getState().generateCards({
        content: "Content",
        domain: "general",
        cardStyle: "mixed",
        difficulty: "intermediate",
        maxCards: 10,
      }),
    ).rejects.toThrow("Usage limit exceeded");

    const state = useCardStore.getState();
    expect(state.isGenerating).toBe(false);
    expect(state.generateError).toBe("Usage limit exceeded");
    expect(state.pendingCards).toHaveLength(0);
  });

  it("removes a pending card", async () => {
    mockGenerateCards.mockResolvedValue(mockGenerateResponse);
    await useCardStore.getState().generateCards({
      content: "Content",
      domain: "general",
      cardStyle: "mixed",
      difficulty: "intermediate",
      maxCards: 10,
    });

    const firstCardId = useCardStore.getState().pendingCards[0]!.id;
    useCardStore.getState().removePendingCard(firstCardId);

    expect(useCardStore.getState().pendingCards).toHaveLength(1);
    expect(useCardStore.getState().selectedCardIds.has(firstCardId)).toBe(false);
  });

  it("updates a pending card", async () => {
    mockGenerateCards.mockResolvedValue(mockGenerateResponse);
    await useCardStore.getState().generateCards({
      content: "Content",
      domain: "general",
      cardStyle: "mixed",
      difficulty: "intermediate",
      maxCards: 10,
    });

    const firstCardId = useCardStore.getState().pendingCards[0]!.id;
    useCardStore.getState().updatePendingCard(firstCardId, {
      front: "Updated front",
      tags: ["updated"],
    });

    const updated = useCardStore.getState().pendingCards.find((c) => c.id === firstCardId)!;
    expect(updated.front).toBe("Updated front");
    expect(updated.tags).toEqual(["updated"]);
  });

  it("toggles card selection", async () => {
    mockGenerateCards.mockResolvedValue(mockGenerateResponse);
    await useCardStore.getState().generateCards({
      content: "Content",
      domain: "general",
      cardStyle: "mixed",
      difficulty: "intermediate",
      maxCards: 10,
    });

    const firstCardId = useCardStore.getState().pendingCards[0]!.id;

    // Deselect
    useCardStore.getState().toggleCardSelection(firstCardId);
    expect(useCardStore.getState().selectedCardIds.has(firstCardId)).toBe(false);

    // Re-select
    useCardStore.getState().toggleCardSelection(firstCardId);
    expect(useCardStore.getState().selectedCardIds.has(firstCardId)).toBe(true);
  });

  it("clears pending cards", async () => {
    mockGenerateCards.mockResolvedValue(mockGenerateResponse);
    await useCardStore.getState().generateCards({
      content: "Content",
      domain: "general",
      cardStyle: "mixed",
      difficulty: "intermediate",
      maxCards: 10,
    });

    useCardStore.getState().clearPendingCards();

    const state = useCardStore.getState();
    expect(state.pendingCards).toHaveLength(0);
    expect(state.selectedCardIds.size).toBe(0);
    expect(state.lastGenerateResponse).toBeNull();
  });
});
