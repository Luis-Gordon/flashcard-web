import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCheckoutSession, getBillingPortalUrl, ApiError } from "@/lib/api";

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
// createCheckoutSession
// ---------------------------------------------------------------------------

describe("createCheckoutSession", () => {
  it("sends POST with tier, success_url, cancel_url, and product_source", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, {
        request_id: "req-1",
        url: "https://checkout.stripe.com/session/cs_test_123",
      }),
    );

    const result = await createCheckoutSession(
      "plus",
      "https://app.test/billing?checkout=success",
      "https://app.test/billing?checkout=canceled",
    );

    expect(result.url).toBe("https://checkout.stripe.com/session/cs_test_123");
    expect(result.request_id).toBe("req-1");

    // Verify request shape
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain("/billing/checkout");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body as string);
    expect(body.tier).toBe("plus");
    expect(body.success_url).toBe("https://app.test/billing?checkout=success");
    expect(body.cancel_url).toBe("https://app.test/billing?checkout=canceled");
    expect(body.product_source).toBe("web_app");
  });

  it("includes authorization header", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, { request_id: "req-2", url: "https://stripe.com" }),
    );

    await createCheckoutSession("pro", "https://ok", "https://cancel");

    const [, init] = mockFetch.mock.calls[0]!;
    expect(init.headers.Authorization).toBe("Bearer test-token");
  });

  it("throws ApiError on 400 validation error", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(400, {
        error: "Invalid tier",
        code: "VALIDATION_ERROR",
        request_id: "req-3",
      }),
    );

    try {
      await createCheckoutSession("plus", "https://ok", "https://cancel");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const e = error as ApiError;
      expect(e.status).toBe(400);
      expect(e.code).toBe("VALIDATION_ERROR");
    }
  });

  it("throws ApiError on 401 unauthorized", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(401, {
        error: "Unauthorized",
        code: "UNAUTHORIZED",
        request_id: "req-4",
      }),
    );

    try {
      await createCheckoutSession("plus", "https://ok", "https://cancel");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const e = error as ApiError;
      expect(e.status).toBe(401);
    }
  });

  it("throws on 500 internal error with request_id", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(500, {
        error: "Something went wrong",
        code: "INTERNAL_ERROR",
        request_id: "req-5",
      }),
    );

    try {
      await createCheckoutSession("pro", "https://ok", "https://cancel");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const e = error as ApiError;
      expect(e.status).toBe(500);
      expect(e.requestId).toBe("req-5");
    }
  });
});

// ---------------------------------------------------------------------------
// getBillingPortalUrl
// ---------------------------------------------------------------------------

describe("getBillingPortalUrl", () => {
  it("sends GET to /billing/portal without params when no returnUrl", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, {
        request_id: "req-p1",
        url: "https://billing.stripe.com/portal/ses_test_456",
      }),
    );

    const result = await getBillingPortalUrl();

    expect(result.url).toBe("https://billing.stripe.com/portal/ses_test_456");

    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toContain("/billing/portal");
    expect(url).not.toContain("return_url");
  });

  it("includes return_url query param when provided", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, {
        request_id: "req-p2",
        url: "https://billing.stripe.com/portal/ses_test_789",
      }),
    );

    await getBillingPortalUrl("https://app.test/billing");

    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toContain("return_url=");
    expect(url).toContain(encodeURIComponent("https://app.test/billing"));
  });

  it("throws ApiError on 400 for free users", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(400, {
        error: "No active subscription",
        code: "VALIDATION_ERROR",
        request_id: "req-p3",
      }),
    );

    try {
      await getBillingPortalUrl("https://app.test/billing");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const e = error as ApiError;
      expect(e.status).toBe(400);
    }
  });
});
