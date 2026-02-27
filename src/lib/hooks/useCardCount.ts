import { useState, useEffect } from "react";
import { useCardStore } from "@/stores/cards";
import { getCards } from "@/lib/api";

/**
 * Returns the total card count for the nav badge.
 * Uses store data when available; falls back to a lightweight API fetch.
 */
export function useCardCount() {
  const storeTotal = useCardStore((s) => s.libraryPagination.total);
  const hasStoreData = useCardStore((s) => s.libraryCards.length > 0);
  const [fetchedTotal, setFetchedTotal] = useState<number | null>(null);

  useEffect(() => {
    if (hasStoreData || storeTotal > 0) return;
    let cancelled = false;
    getCards({ page: 1, limit: 1 })
      .then((res) => {
        if (!cancelled) setFetchedTotal(res.pagination.total);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hasStoreData, storeTotal]);

  if (storeTotal > 0 || hasStoreData) return storeTotal;
  return fetchedTotal;
}
