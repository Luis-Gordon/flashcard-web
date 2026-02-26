import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCardStore } from "@/stores/cards";
import type { LibraryCard } from "@/types/cards";

// Mock API module
const mockUpdateCard = vi.fn();
const mockDeleteCards = vi.fn();

vi.mock("@/lib/api", () => ({
  generateCards: vi.fn(),
  getCards: vi.fn(),
  deleteCard: vi.fn(),
  deleteCards: (...args: unknown[]) => mockDeleteCards(...args),
  updateCard: (...args: unknown[]) => mockUpdateCard(...args),
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

function mockLibraryCard(id: string): LibraryCard {
  return {
    id,
    user_id: "user-1",
    generation_request_id: "req-1",
    front: `Front ${id}`,
    back: `Back ${id}`,
    card_type: "basic",
    tags: ["test"],
    notes: "",
    source_quote: "source",
    domain: "general",
    metadata: {},
    confidence_scores: { atomicity: 1, self_contained: 1 },
    is_deleted: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("library store extensions", () => {
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
      libraryCards: [mockLibraryCard("a"), mockLibraryCard("b"), mockLibraryCard("c")],
      libraryPagination: { page: 1, limit: 20, total: 3, total_pages: 1 },
      isLoadingLibrary: false,
      librarySelectedIds: new Set(),
      exportCards: [],
    });
  });

  // --- Selection ---

  it("toggles library selection on and off", () => {
    useCardStore.getState().toggleLibrarySelection("a");
    expect(useCardStore.getState().librarySelectedIds.has("a")).toBe(true);

    useCardStore.getState().toggleLibrarySelection("a");
    expect(useCardStore.getState().librarySelectedIds.has("a")).toBe(false);
  });

  it("selects all library cards", () => {
    useCardStore.getState().selectAllLibraryCards();
    const selected = useCardStore.getState().librarySelectedIds;
    expect(selected.size).toBe(3);
    expect(selected.has("a")).toBe(true);
    expect(selected.has("b")).toBe(true);
    expect(selected.has("c")).toBe(true);
  });

  it("deselects all library cards", () => {
    useCardStore.getState().selectAllLibraryCards();
    useCardStore.getState().deselectAllLibraryCards();
    expect(useCardStore.getState().librarySelectedIds.size).toBe(0);
  });

  // --- Update ---

  it("applies optimistic update then server response", async () => {
    const serverCard = { ...mockLibraryCard("a"), front: "Server front", updated_at: "2026-02-01T00:00:00Z" };
    mockUpdateCard.mockResolvedValue({ request_id: "req-2", card: serverCard });

    const result = await useCardStore.getState().updateLibraryCard("a", { front: "New front" });

    expect(result).toEqual(serverCard);
    const card = useCardStore.getState().libraryCards.find((c) => c.id === "a")!;
    expect(card.front).toBe("Server front");
  });

  it("rolls back on update failure", async () => {
    mockUpdateCard.mockRejectedValue(new Error("Network error"));

    await expect(
      useCardStore.getState().updateLibraryCard("a", { front: "New front" }),
    ).rejects.toThrow("Network error");

    const card = useCardStore.getState().libraryCards.find((c) => c.id === "a")!;
    expect(card.front).toBe("Front a");
  });

  // --- Bulk delete ---

  it("removes cards and updates pagination total", async () => {
    mockDeleteCards.mockResolvedValue({ request_id: "req-3", deleted: true, count: 2 });

    await useCardStore.getState().bulkDeleteLibraryCards(["a", "c"]);

    const state = useCardStore.getState();
    expect(state.libraryCards).toHaveLength(1);
    expect(state.libraryCards[0]!.id).toBe("b");
    expect(state.libraryPagination.total).toBe(1);
  });

  it("clears deleted IDs from selection", async () => {
    mockDeleteCards.mockResolvedValue({ request_id: "req-4", deleted: true, count: 1 });

    useCardStore.getState().selectAllLibraryCards();
    await useCardStore.getState().bulkDeleteLibraryCards(["b"]);

    const selected = useCardStore.getState().librarySelectedIds;
    expect(selected.has("b")).toBe(false);
    expect(selected.has("a")).toBe(true);
    expect(selected.has("c")).toBe(true);
  });

  // --- Export transfer ---

  it("sets and clears export cards", () => {
    const cards = [mockLibraryCard("x"), mockLibraryCard("y")];
    useCardStore.getState().setExportCards(cards);
    expect(useCardStore.getState().exportCards).toHaveLength(2);

    useCardStore.getState().clearExportCards();
    expect(useCardStore.getState().exportCards).toHaveLength(0);
  });
});
