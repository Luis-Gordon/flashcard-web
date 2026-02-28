import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiRequest, setOnUnauthorized, _resetUnauthorizedState, ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock Supabase — return a fake session with an access token
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
  mockFetch.mockReset();
  // Reset module-scoped debounce flag + handler between tests
  _resetUnauthorizedState();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// 401 Unauthorized
// ---------------------------------------------------------------------------

describe("401 Unauthorized handling", () => {
  it("calls the unauthorized handler on 401", async () => {
    const handler = vi.fn();
    setOnUnauthorized(handler);

    mockFetch.mockResolvedValue(
      jsonResponse(401, { error: "Token expired", code: "UNAUTHORIZED", request_id: "req-1" }),
    );

    await expect(apiRequest("/test")).rejects.toThrow(ApiError);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("throws ApiError with status 401 and UNAUTHORIZED code", async () => {
    setOnUnauthorized(vi.fn());

    mockFetch.mockResolvedValue(
      jsonResponse(401, { error: "Token expired", code: "UNAUTHORIZED", request_id: "req-1" }),
    );

    try {
      await apiRequest("/test");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(401);
      expect(apiError.code).toBe("UNAUTHORIZED");
      expect(apiError.requestId).toBe("req-1");
    }
  });

  it("debounces concurrent 401 notifications", async () => {
    const handler = vi.fn();
    setOnUnauthorized(handler);

    mockFetch.mockImplementation(() =>
      Promise.resolve(
        jsonResponse(401, { error: "Unauthorized", code: "UNAUTHORIZED" }),
      ),
    );

    // Fire 3 concurrent requests — all return 401
    const promises = [
      apiRequest("/a").catch(() => {}),
      apiRequest("/b").catch(() => {}),
      apiRequest("/c").catch(() => {}),
    ];
    await Promise.all(promises);

    // Handler should be called only once due to debounce
    expect(handler).toHaveBeenCalledOnce();
  });

  it("allows new notification after debounce window", async () => {
    const handler = vi.fn();
    setOnUnauthorized(handler);

    mockFetch.mockImplementation(() =>
      Promise.resolve(
        jsonResponse(401, { error: "Unauthorized", code: "UNAUTHORIZED" }),
      ),
    );

    // First 401
    await apiRequest("/a").catch(() => {});
    expect(handler).toHaveBeenCalledTimes(1);

    // Advance past the 1-second debounce window
    await vi.advanceTimersByTimeAsync(1100);

    // Second 401 — should trigger handler again
    await apiRequest("/b").catch(() => {});
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("never retries 401 responses", async () => {
    setOnUnauthorized(vi.fn());

    mockFetch.mockResolvedValue(
      jsonResponse(401, { error: "Unauthorized", code: "UNAUTHORIZED" }),
    );

    await apiRequest("/test").catch(() => {});

    // Only 1 fetch call — no retries
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// 429 Rate Limited
// ---------------------------------------------------------------------------

describe("429 Rate Limited retry", () => {
  it("retries on 429 and succeeds on second attempt", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse(429, { error: "Rate limited", code: "RATE_LIMITED", retry_after: 2 }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { data: "success" }),
      );

    const resultPromise = apiRequest<{ data: string }>("/test");

    // Advance past the 2-second retry_after wait
    await vi.advanceTimersByTimeAsync(2000);

    const result = await resultPromise;
    expect(result).toEqual({ data: "success" });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries up to 2 times then throws on 3rd 429", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse(429, { error: "Rate limited", code: "RATE_LIMITED", retry_after: 1 }),
      )
      .mockResolvedValueOnce(
        jsonResponse(429, { error: "Rate limited", code: "RATE_LIMITED", retry_after: 1 }),
      )
      .mockResolvedValueOnce(
        jsonResponse(429, { error: "Rate limited", code: "RATE_LIMITED", retry_after: 1 }),
      );

    // Attach rejection handler immediately to prevent unhandled rejection warning
    const resultPromise = apiRequest("/test").catch((e: unknown) => e);

    // Advance past both retry waits (1s + 1s)
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);

    const error = await resultPromise;
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(429);
    expect(apiError.code).toBe("RATE_LIMITED");

    // 3 fetch calls: initial + 2 retries
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("caps retry_after at 60 seconds", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse(429, { error: "Rate limited", code: "RATE_LIMITED", retry_after: 120 }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { data: "ok" }),
      );

    // Use a longer timeout so it doesn't conflict with the 60s capped wait
    const resultPromise = apiRequest<{ data: string }>("/test", { timeout: 120_000 });

    // Advance 59s — should NOT have retried yet
    await vi.advanceTimersByTimeAsync(59_000);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Advance to 60s — now the retry fires
    await vi.advanceTimersByTimeAsync(1000);

    const result = await resultPromise;
    expect(result).toEqual({ data: "ok" });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("defaults to 1 second when retry_after is not provided", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse(429, { error: "Rate limited", code: "RATE_LIMITED" }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { data: "ok" }),
      );

    const resultPromise = apiRequest<{ data: string }>("/test");

    // Advance 1 second (the default retry_after)
    await vi.advanceTimersByTimeAsync(1000);

    const result = await resultPromise;
    expect(result).toEqual({ data: "ok" });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("aborts retry wait when overall timeout expires", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(429, { error: "Rate limited", code: "RATE_LIMITED", retry_after: 30 }),
    );

    // Attach rejection handler immediately to prevent unhandled rejection warning
    const resultPromise = apiRequest("/test", { timeout: 5000 }).catch((e: unknown) => e);

    // Advance 5s — the overall timeout fires, aborting the 30s retry wait
    await vi.advanceTimersByTimeAsync(5000);

    const error = await resultPromise;
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(408);
    expect(apiError.message).toBe("Request timed out");

    // Only 1 fetch call — retry never happened because timeout aborted the wait
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Error Status Handling
// ---------------------------------------------------------------------------

describe("Error status handling", () => {
  it("400 returns ApiError with VALIDATION_ERROR code and details", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(400, {
        error: "Invalid input",
        code: "VALIDATION_ERROR",
        request_id: "req-400",
        details: { field: "content", message: "required" },
      }),
    );

    try {
      await apiRequest("/test", { method: "POST", body: { data: "" } });
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const e = error as ApiError;
      expect(e.status).toBe(400);
      expect(e.code).toBe("VALIDATION_ERROR");
      expect(e.details).toEqual({ field: "content", message: "required" });
    }
  });

  it("402 returns ApiError with USAGE_EXCEEDED code", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(402, {
        error: "Usage exceeded",
        code: "USAGE_EXCEEDED",
        request_id: "req-402",
      }),
    );

    try {
      await apiRequest("/test");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const e = error as ApiError;
      expect(e.status).toBe(402);
      expect(e.code).toBe("USAGE_EXCEEDED");
    }
  });

  it("409 returns ApiError with CONFLICT code", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(409, {
        error: "Account already exists",
        code: "CONFLICT",
        request_id: "req-409",
      }),
    );

    try {
      await apiRequest("/test");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const e = error as ApiError;
      expect(e.status).toBe(409);
      expect(e.code).toBe("CONFLICT");
    }
  });

  it("413 returns ApiError with CONTENT_TOO_LARGE code", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(413, {
        error: "Content too large",
        code: "CONTENT_TOO_LARGE",
        request_id: "req-413",
      }),
    );

    try {
      await apiRequest("/test");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const e = error as ApiError;
      expect(e.status).toBe(413);
      expect(e.code).toBe("CONTENT_TOO_LARGE");
    }
  });

  it("500 returns ApiError with INTERNAL_ERROR code and preserves requestId", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(500, {
        error: "Something went wrong",
        code: "INTERNAL_ERROR",
        request_id: "req-500-abc",
      }),
    );

    try {
      await apiRequest("/test");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const e = error as ApiError;
      expect(e.status).toBe(500);
      expect(e.code).toBe("INTERNAL_ERROR");
      expect(e.requestId).toBe("req-500-abc");
    }
  });
});

// ---------------------------------------------------------------------------
// Network Errors
// ---------------------------------------------------------------------------

describe("Network errors", () => {
  it("fetch rejection with TypeError maps to status 0 network error", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    try {
      await apiRequest("/test");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const e = error as ApiError;
      expect(e.status).toBe(0);
      expect(e.message).toBe("Network error");
    }
  });

  it("timeout produces status 408 with 'Request timed out'", async () => {
    // fetch that respects AbortSignal — rejects with AbortError when signal fires
    mockFetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
    );

    const resultPromise = apiRequest("/test", { timeout: 100 }).catch((e: unknown) => e);

    // Advance past the 100ms timeout
    await vi.advanceTimersByTimeAsync(200);

    const error = await resultPromise;
    expect(error).toBeInstanceOf(ApiError);
    const e = error as ApiError;
    expect(e.status).toBe(408);
    expect(e.message).toBe("Request timed out");
  });
});
