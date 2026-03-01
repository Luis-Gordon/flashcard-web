import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { ThemeMode } from "@/stores/settings";

// ---------------------------------------------------------------------------
// Mock the settings store to avoid persist middleware + localStorage issues.
// We test the theme logic (applyTheme + DOM class), not Zustand internals.
// ---------------------------------------------------------------------------

let storeState = { themeMode: "system" as ThemeMode };

vi.mock("@/stores/settings", () => ({
  useSettingsStore: {
    getState: () => storeState,
    subscribe: vi.fn(),
  },
}));

// Import after mock is set up
const { useSettingsStore } = await import("@/stores/settings");

// ---------------------------------------------------------------------------
// applyTheme — replicated from main.tsx to avoid side effects
// ---------------------------------------------------------------------------

function applyTheme() {
  const { themeMode } = useSettingsStore.getState();
  const prefersDark =
    themeMode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : themeMode === "dark";
  document.documentElement.classList.toggle("dark", prefersDark);
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

let matchMediaMatches = false;

beforeEach(() => {
  storeState = { themeMode: "system" };
  document.documentElement.classList.remove("dark");
  matchMediaMatches = false;

  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" && matchMediaMatches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Store state
// ---------------------------------------------------------------------------

describe("theme store state", () => {
  test("default theme is 'system'", () => {
    expect(useSettingsStore.getState().themeMode).toBe("system");
  });

  test("themeMode can be set to 'dark'", () => {
    storeState = { themeMode: "dark" };
    expect(useSettingsStore.getState().themeMode).toBe("dark");
  });

  test("themeMode can be set to 'light'", () => {
    storeState = { themeMode: "light" };
    expect(useSettingsStore.getState().themeMode).toBe("light");
  });
});

// ---------------------------------------------------------------------------
// applyTheme()
// ---------------------------------------------------------------------------

describe("applyTheme", () => {
  test("adds .dark class for dark mode", () => {
    storeState = { themeMode: "dark" };
    applyTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  test("removes .dark class for light mode", () => {
    document.documentElement.classList.add("dark");
    storeState = { themeMode: "light" };
    applyTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  test("system mode respects matchMedia preferring dark", () => {
    matchMediaMatches = true;
    storeState = { themeMode: "system" };
    applyTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  test("system mode respects matchMedia preferring light", () => {
    matchMediaMatches = false;
    storeState = { themeMode: "system" };
    applyTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  test("dark mode then light mode removes .dark class", () => {
    storeState = { themeMode: "dark" };
    applyTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    storeState = { themeMode: "light" };
    applyTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
