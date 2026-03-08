/**
 * Component-level tests for Generate.tsx hasResults logic.
 *
 * Verifies that the review panel (CardReview) renders when any of
 * pendingCards, rejectedCards, or unsuitableContent is non-empty —
 * not just pendingCards. This was the directive mode silent failure bug.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";

// ---------------------------------------------------------------------------
// Mocks — stub out heavy child components and hooks
// ---------------------------------------------------------------------------

const mockUseCards = vi.fn();
const mockSetExportCards = vi.fn();

vi.mock("@/lib/hooks/useCards", () => ({
  useCards: () => mockUseCards(),
  useExportCards: () => ({ setExportCards: mockSetExportCards }),
}));

// Stub CardReview — just render a marker div
vi.mock("@/components/cards/CardReview", () => ({
  CardReview: () => <div data-testid="card-review" />,
}));

// Stub GenerateForm — just render a marker div
vi.mock("@/components/cards/GenerateForm", () => ({
  GenerateForm: () => <div data-testid="generate-form" />,
}));

// Stub UpgradeModal — render nothing
vi.mock("@/components/billing/UpgradeModal", () => ({
  UpgradeModal: () => null,
}));

import Generate from "@/routes/app/Generate";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseHookReturn = {
  pendingCards: [],
  rejectedCards: [],
  unsuitableContent: [],
  isGenerating: false,
  generateError: null,
  lastGenerateResponse: null,
  selectedCardIds: new Set<string>(),
};

function renderGenerate() {
  return render(
    <MemoryRouter>
      <Generate />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Generate page — review panel visibility", () => {
  it("shows GenerateForm when all result arrays are empty", () => {
    mockUseCards.mockReturnValue(baseHookReturn);
    renderGenerate();
    expect(screen.getByTestId("generate-form")).toBeDefined();
    expect(screen.queryByTestId("card-review")).toBeNull();
  });

  it("shows CardReview when only rejectedCards is non-empty", () => {
    mockUseCards.mockReturnValue({
      ...baseHookReturn,
      rejectedCards: [{ card: { front: "Q", back: "A" }, errors: ["Source quote is missing or too short"] }],
      lastGenerateResponse: { request_id: "r1", cards: [], usage: { cards_generated: 0 } },
    });
    renderGenerate();
    expect(screen.getByTestId("card-review")).toBeDefined();
    expect(screen.queryByTestId("generate-form")).toBeNull();
  });

  it("shows CardReview when only unsuitableContent is non-empty", () => {
    mockUseCards.mockReturnValue({
      ...baseHookReturn,
      unsuitableContent: [{ reason: "Not suitable for flashcards", content_excerpt: "Lorem ipsum" }],
      lastGenerateResponse: { request_id: "r2", cards: [], usage: { cards_generated: 0 } },
    });
    renderGenerate();
    expect(screen.getByTestId("card-review")).toBeDefined();
    expect(screen.queryByTestId("generate-form")).toBeNull();
  });

  it("shows GenerateForm when lastGenerateResponse is null even with rejected cards", () => {
    mockUseCards.mockReturnValue({
      ...baseHookReturn,
      rejectedCards: [{ card: { front: "Q", back: "A" }, errors: ["err"] }],
      lastGenerateResponse: null,
    });
    renderGenerate();
    expect(screen.getByTestId("generate-form")).toBeDefined();
    expect(screen.queryByTestId("card-review")).toBeNull();
  });
});
