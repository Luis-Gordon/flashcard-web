import { useShallow } from "zustand/react/shallow";
import { useCardStore } from "@/stores/cards";

/** Thin selector wrappers on the card store for use in components */
export function useCards() {
  return useCardStore(useShallow((s) => ({
    pendingCards: s.pendingCards,
    rejectedCards: s.rejectedCards,
    unsuitableContent: s.unsuitableContent,
    isGenerating: s.isGenerating,
    generateError: s.generateError,
    lastGenerateResponse: s.lastGenerateResponse,
    selectedCardIds: s.selectedCardIds,
  })));
}

export function useCardActions() {
  return useCardStore(useShallow((s) => ({
    generateCards: s.generateCards,
    clearPendingCards: s.clearPendingCards,
    removePendingCard: s.removePendingCard,
    updatePendingCard: s.updatePendingCard,
    toggleCardSelection: s.toggleCardSelection,
    selectAllCards: s.selectAllCards,
    deselectAllCards: s.deselectAllCards,
  })));
}

export function useLibrary() {
  return useCardStore(useShallow((s) => ({
    libraryCards: s.libraryCards,
    libraryPagination: s.libraryPagination,
    isLoadingLibrary: s.isLoadingLibrary,
    fetchLibrary: s.fetchLibrary,
    deleteLibraryCard: s.deleteLibraryCard,
    updateLibraryCard: s.updateLibraryCard,
    bulkDeleteLibraryCards: s.bulkDeleteLibraryCards,
  })));
}

export function useLibrarySelection() {
  return useCardStore(useShallow((s) => ({
    librarySelectedIds: s.librarySelectedIds,
    toggleLibrarySelection: s.toggleLibrarySelection,
    selectAllLibraryCards: s.selectAllLibraryCards,
    deselectAllLibraryCards: s.deselectAllLibraryCards,
  })));
}

export function useLibraryUndoDelete() {
  return useCardStore(useShallow((s) => ({
    removeLibraryCardLocally: s.removeLibraryCardLocally,
    restoreLibraryCard: s.restoreLibraryCard,
  })));
}

export function useExportCards() {
  return useCardStore(useShallow((s) => ({
    exportCards: s.exportCards,
    setExportCards: s.setExportCards,
    clearExportCards: s.clearExportCards,
  })));
}
