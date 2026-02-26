import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LibraryViewMode = "grid" | "list";

interface SettingsState {
  libraryViewMode: LibraryViewMode;
  recentDeckNames: string[];
  setLibraryViewMode: (mode: LibraryViewMode) => void;
  addRecentDeckName: (name: string) => void;
}

const MAX_RECENT_DECK_NAMES = 5;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      libraryViewMode: "grid",
      recentDeckNames: [],

      setLibraryViewMode: (mode) => set({ libraryViewMode: mode }),

      addRecentDeckName: (name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          const filtered = state.recentDeckNames.filter((n) => n !== trimmed);
          return {
            recentDeckNames: [trimmed, ...filtered].slice(0, MAX_RECENT_DECK_NAMES),
          };
        }),
    }),
    { name: "memogenesis-settings" },
  ),
);
