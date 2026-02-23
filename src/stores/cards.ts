import { create } from "zustand";
import type {
  Card,
  CardDomain,
  CardStyle,
  Difficulty,
  RejectedCard,
  UnsuitableContent,
  GenerateResponse,
  LibraryCard,
  CardFilters,
} from "@/types/cards";
import * as api from "@/lib/api";

interface CardState {
  // Generation state
  pendingCards: Card[];
  rejectedCards: RejectedCard[];
  unsuitableContent: UnsuitableContent[];
  isGenerating: boolean;
  generateError: string | null;
  lastGenerateResponse: GenerateResponse | null;

  // Selection
  selectedCardIds: Set<string>;

  // Library state
  libraryCards: LibraryCard[];
  libraryPagination: { page: number; limit: number; total: number; total_pages: number };
  isLoadingLibrary: boolean;

  // Actions
  generateCards: (params: {
    content: string;
    domain: CardDomain;
    cardStyle: CardStyle;
    difficulty: Difficulty;
    maxCards: number;
    hookKey?: string;
  }) => Promise<void>;
  clearPendingCards: () => void;
  removePendingCard: (id: string) => void;
  updatePendingCard: (id: string, updates: Partial<Pick<Card, "front" | "back" | "tags">>) => void;
  toggleCardSelection: (id: string) => void;
  selectAllCards: () => void;
  deselectAllCards: () => void;
  fetchLibrary: (filters?: CardFilters) => Promise<void>;
  deleteLibraryCard: (id: string) => Promise<void>;
}

export const useCardStore = create<CardState>((set) => ({
  pendingCards: [],
  rejectedCards: [],
  unsuitableContent: [],
  isGenerating: false,
  generateError: null,
  lastGenerateResponse: null,
  selectedCardIds: new Set<string>(),
  libraryCards: [],
  libraryPagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
  isLoadingLibrary: false,

  generateCards: async ({ content, domain, cardStyle, difficulty, maxCards, hookKey }) => {
    set({ isGenerating: true, generateError: null });

    try {
      const response = await api.generateCards({
        content,
        content_type: "text",
        domain,
        options: {
          max_cards: maxCards,
          card_style: cardStyle,
          difficulty,
        },
        ...(hookKey ? { hook_key: hookKey } : {}),
      });

      // Assign client-side IDs to cards (backend response doesn't include persisted IDs)
      const cardsWithIds = response.cards.map((card) => ({
        ...card,
        id: crypto.randomUUID(),
      }));

      set({
        pendingCards: cardsWithIds,
        rejectedCards: response.rejected ?? [],
        unsuitableContent: response.unsuitable_content ?? [],
        lastGenerateResponse: { ...response, cards: cardsWithIds },
        isGenerating: false,
        selectedCardIds: new Set(cardsWithIds.map((c) => c.id)),
      });
    } catch (error) {
      const message =
        error instanceof api.ApiError
          ? error.message
          : "An unexpected error occurred";
      set({ isGenerating: false, generateError: message });
      throw error;
    }
  },

  clearPendingCards: () =>
    set({
      pendingCards: [],
      rejectedCards: [],
      unsuitableContent: [],
      lastGenerateResponse: null,
      selectedCardIds: new Set(),
      generateError: null,
    }),

  removePendingCard: (id) =>
    set((state) => {
      const next = state.pendingCards.filter((c) => c.id !== id);
      const nextSelected = new Set(state.selectedCardIds);
      nextSelected.delete(id);
      return { pendingCards: next, selectedCardIds: nextSelected };
    }),

  updatePendingCard: (id, updates) =>
    set((state) => ({
      pendingCards: state.pendingCards.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    })),

  toggleCardSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedCardIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedCardIds: next };
    }),

  selectAllCards: () =>
    set((state) => ({
      selectedCardIds: new Set(state.pendingCards.map((c) => c.id)),
    })),

  deselectAllCards: () => set({ selectedCardIds: new Set() }),

  fetchLibrary: async (filters) => {
    set({ isLoadingLibrary: true });
    try {
      const response = await api.getCards(filters);
      set({
        libraryCards: response.cards,
        libraryPagination: response.pagination,
        isLoadingLibrary: false,
      });
    } catch {
      set({ isLoadingLibrary: false });
    }
  },

  deleteLibraryCard: async (id) => {
    await api.deleteCard(id);
    set((state) => ({
      libraryCards: state.libraryCards.filter((c) => c.id !== id),
      libraryPagination: {
        ...state.libraryPagination,
        total: state.libraryPagination.total - 1,
      },
    }));
  },
}));
