import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useUsage } from "@/lib/hooks/useUsage";
import { USAGE_CHANGED_EVENT } from "@/lib/api";
import type { UsageResponse } from "@/types/cards";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUsageResponse: UsageResponse = {
  request_id: "req-usage-1",
  tier: "free",
  status: "active",
  period: { start: "2026-02-01T00:00:00Z", end: "2026-03-01T00:00:00Z" },
  usage: {
    cards_generated: 10,
    cards_limit: 50,
    cards_remaining: 40,
    overage_cards: 0,
    overage_cost_cents: 0,
  },
  actions: { generate: 5, enhance: 2, tts: 3, image: 1 },
};

const mockGetUsage = vi.fn<() => Promise<UsageResponse>>();

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getUsage: (...args: Parameters<typeof actual.getUsage>) => mockGetUsage(...args),
  };
});

beforeEach(() => {
  mockGetUsage.mockReset();
  mockGetUsage.mockResolvedValue(mockUsageResponse);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useUsage hook", () => {
  it("fetches usage on mount", async () => {
    const { result } = renderHook(() => useUsage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.usage).toEqual(mockUsageResponse);
    expect(mockGetUsage).toHaveBeenCalledTimes(1);
  });

  it("returns error on fetch failure", async () => {
    mockGetUsage.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useUsage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.usage).toBeNull();
  });

  it("refetches when USAGE_CHANGED_EVENT is dispatched", async () => {
    const { result } = renderHook(() => useUsage());

    // Wait for initial load to settle
    await waitFor(() => {
      expect(result.current.usage?.usage.cards_generated).toBe(10);
    });

    // Update mock to return different data
    const updatedResponse: UsageResponse = {
      ...mockUsageResponse,
      usage: { ...mockUsageResponse.usage, cards_generated: 15, cards_remaining: 35 },
    };
    mockGetUsage.mockResolvedValue(updatedResponse);

    // Dispatch the usage changed event
    act(() => {
      window.dispatchEvent(new Event(USAGE_CHANGED_EVENT));
    });

    // Wait for the updated data to appear
    await waitFor(() => {
      expect(result.current.usage?.usage.cards_generated).toBe(15);
    });
  });

  it("cleans up event listener on unmount", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useUsage());

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith(
        USAGE_CHANGED_EVENT,
        expect.any(Function),
      );
    });

    unmount();

    expect(removeSpy).toHaveBeenCalledWith(
      USAGE_CHANGED_EVENT,
      expect.any(Function),
    );
  });

  it("refetch can be called manually", async () => {
    const { result } = renderHook(() => useUsage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetUsage).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetUsage).toHaveBeenCalledTimes(2);
  });
});
