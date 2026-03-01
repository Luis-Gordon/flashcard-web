import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportAccountData, deleteAccount, ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

beforeEach(() => {
  mockFetch.mockReset();
});

// ---------------------------------------------------------------------------
// exportAccountData
// ---------------------------------------------------------------------------

describe("exportAccountData", () => {
  it("sends GET to /account/export", async () => {
    const responseBody = {
      request_id: "req-1",
      account: { email: "test@example.com", created_at: "2024-01-01" },
      cards: [],
      usage_records: [],
      generation_requests: [],
    };
    mockFetch.mockResolvedValue(jsonResponse(200, responseBody));

    const result = await exportAccountData();

    expect(result.request_id).toBe("req-1");
    expect(result.account.email).toBe("test@example.com");
    expect(result.cards).toEqual([]);

    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain("/account/export");
    expect(init.method).toBe("GET");
  });

  it("includes authorization header", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, {
        request_id: "req-2",
        account: { email: "test@example.com", created_at: "2024-01-01" },
        cards: [],
        usage_records: [],
        generation_requests: [],
      }),
    );

    await exportAccountData();

    const [, init] = mockFetch.mock.calls[0]!;
    expect(init.headers.Authorization).toBe("Bearer test-token");
  });

  it("throws ApiError on 401", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(401, {
        error: "Unauthorized",
        code: "UNAUTHORIZED",
        request_id: "req-3",
      }),
    );

    try {
      await exportAccountData();
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const e = error as ApiError;
      expect(e.status).toBe(401);
      expect(e.code).toBe("UNAUTHORIZED");
    }
  });

  it("throws ApiError on 500", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(500, {
        error: "Something went wrong",
        code: "INTERNAL_ERROR",
        request_id: "req-4",
      }),
    );

    try {
      await exportAccountData();
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const e = error as ApiError;
      expect(e.status).toBe(500);
      expect(e.requestId).toBe("req-4");
    }
  });
});

// ---------------------------------------------------------------------------
// deleteAccount
// ---------------------------------------------------------------------------

describe("deleteAccount", () => {
  it("sends DELETE with confirm and product_source", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, { request_id: "req-d1", deleted: true }),
    );

    const result = await deleteAccount();

    expect(result.deleted).toBe(true);
    expect(result.request_id).toBe("req-d1");

    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain("/account");
    expect(init.method).toBe("DELETE");

    const body = JSON.parse(init.body as string);
    expect(body.confirm).toBe(true);
    expect(body.product_source).toBe("web_app");
  });

  it("throws ApiError on 401", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(401, {
        error: "Unauthorized",
        code: "UNAUTHORIZED",
        request_id: "req-d2",
      }),
    );

    try {
      await deleteAccount();
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const e = error as ApiError;
      expect(e.status).toBe(401);
    }
  });

  it("throws ApiError on 500", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(500, {
        error: "Something went wrong",
        code: "INTERNAL_ERROR",
        request_id: "req-d3",
      }),
    );

    try {
      await deleteAccount();
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const e = error as ApiError;
      expect(e.status).toBe(500);
    }
  });
});
