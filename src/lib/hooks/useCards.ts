import { useCardStore } from "@/stores/cards";

/** Thin selector wrappers on the card store for use in components */
export function useCards() {
  return useCardStore((s) => ({
    pendingCards: s.pendingCards,
    rejectedCards: s.rejectedCards,
    unsuitableContent: s.unsuitableContent,
    isGenerating: s.isGenerating,
    generateError: s.generateError,
    lastGenerateResponse: s.lastGenerateResponse,
    selectedCardIds: s.selectedCardIds,
  }));
}

export function useCardActions() {
  return useCardStore((s) => ({
    generateCards: s.generateCards,
    clearPendingCards: s.clearPendingCards,
    removePendingCard: s.removePendingCard,
    updatePendingCard: s.updatePendingCard,
    toggleCardSelection: s.toggleCardSelection,
    selectAllCards: s.selectAllCards,
    deselectAllCards: s.deselectAllCards,
  }));
}

export function useLibrary() {
  return useCardStore((s) => ({
    libraryCards: s.libraryCards,
    libraryPagination: s.libraryPagination,
    isLoadingLibrary: s.isLoadingLibrary,
    fetchLibrary: s.fetchLibrary,
    deleteLibraryCard: s.deleteLibraryCard,
  }));
}
