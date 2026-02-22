import { supabase } from "@/lib/supabase";

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
  timeout?: number;
}

const API_URL = import.meta.env.VITE_API_URL;

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, timeout = 60_000, ...fetchOptions } = options;

  // Get fresh auth token
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Inject product_source into all request bodies
  const requestBody = body ? { ...body, product_source: "web_app" } : undefined;

  try {
    const response = await fetch(`${API_URL}${path}`, {
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

    const json = (await response.json()) as {
      request_id?: string;
      data?: T;
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

    return json.data as T;
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
