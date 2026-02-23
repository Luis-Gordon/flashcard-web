import { supabase } from "@/lib/supabase";
import type {
  GenerateRequest,
  GenerateResponse,
  LibraryResponse,
  CardFilters,
  UsageResponse,
} from "@/types/cards";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "USAGE_EXCEEDED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "CONTENT_TOO_LARGE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: ErrorCode | undefined,
    public requestId: string | undefined,
    public retryAfter: number | undefined,
    public details: Record<string, unknown> | undefined,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: Record<string, unknown>;
  params?: Record<string, string | number | undefined>;
  timeout?: number;
}

const API_URL = import.meta.env.VITE_API_URL;

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, params, timeout = 60_000, ...fetchOptions } = options;

  // Get fresh auth token
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Inject product_source into all request bodies
  const requestBody = body ? { ...body, product_source: "web_app" } : undefined;

  // Build URL with query params for GET requests
  let url = `${API_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) searchParams.set(key, String(value));
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token && {
          Authorization: `Bearer ${session.access_token}`,
        }),
        ...fetchOptions.headers,
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined,
      signal: controller.signal,
    });

    const json = (await response.json()) as Record<string, unknown> & {
      request_id?: string;
      error?: string;
      code?: ErrorCode;
      retry_after?: number;
      details?: Record<string, unknown>;
    };

    if (!response.ok) {
      throw new ApiError(
        json.error ?? `Request failed with status ${response.status}`,
        response.status,
        json.code,
        json.request_id,
        json.retry_after,
        json.details,
      );
    }

    return json as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out", 408, undefined, undefined, undefined, undefined);
    }

    throw new ApiError(
      "Network error",
      0,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Card generation
// ---------------------------------------------------------------------------

export function generateCards(request: GenerateRequest): Promise<GenerateResponse> {
  return apiRequest<GenerateResponse>("/cards/generate", {
    method: "POST",
    body: request as unknown as Record<string, unknown>,
    timeout: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Card library
// ---------------------------------------------------------------------------

export function getCards(filters: CardFilters = {}): Promise<LibraryResponse> {
  return apiRequest<LibraryResponse>("/cards", {
    method: "GET",
    params: filters as Record<string, string | number | undefined>,
  });
}

export function deleteCard(id: string): Promise<{ request_id: string; deleted: boolean }> {
  return apiRequest(`/cards/${id}`, { method: "DELETE" });
}

export function deleteCards(ids: string[]): Promise<{ request_id: string; deleted: boolean; count: number }> {
  return apiRequest("/cards", {
    method: "DELETE",
    body: { ids },
  });
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export function getUsage(): Promise<UsageResponse> {
  return apiRequest<UsageResponse>("/usage/current", { method: "GET" });
}
