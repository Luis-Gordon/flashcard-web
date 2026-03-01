import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

export type LibraryViewMode = "grid" | "list";
export type ThemeMode = "system" | "light" | "dark";

interface SettingsState {
  libraryViewMode: LibraryViewMode;
  recentDeckNames: string[];
  themeMode: ThemeMode;
  setLibraryViewMode: (mode: LibraryViewMode) => void;
  addRecentDeckName: (name: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const MAX_RECENT_DECK_NAMES = 5;

export const useSettingsStore = create<SettingsState>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        libraryViewMode: "grid",
        recentDeckNames: [],
        themeMode: "system" as ThemeMode,

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

        setThemeMode: (mode) => set({ themeMode: mode }),
      }),
      { name: "memogenesis-settings" },
    ),
  ),
);
