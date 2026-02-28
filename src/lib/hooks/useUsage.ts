import { useState, useEffect, useCallback } from "react";
import type { UsageResponse } from "@/types/cards";
import { getUsage, USAGE_CHANGED_EVENT } from "@/lib/api";

export function useUsage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUsage();
      setUsage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Re-fetch when usage changes (e.g., after card generation)
  useEffect(() => {
    const handler = () => { refetch(); };
    window.addEventListener(USAGE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(USAGE_CHANGED_EVENT, handler);
  }, [refetch]);

  return { usage, isLoading, error, refetch };
}
