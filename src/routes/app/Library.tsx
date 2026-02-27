import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useLibrary, useLibrarySelection, useLibraryUndoDelete, useExportCards } from "@/lib/hooks/useCards";
import { useSettingsStore } from "@/stores/settings";
import * as api from "@/lib/api";
import type { CardFilters, LibraryCard, UpdateCardRequest } from "@/types/cards";
import { LibraryCardItem } from "@/components/cards/LibraryCardItem";
import { LibraryToolbar } from "@/components/cards/LibraryToolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  LayoutGrid,
  List,
  LibraryBig,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DEFAULT_FILTERS: CardFilters = {
  page: 1,
  limit: 20,
  sort: "created_at",
  order: "desc",
};

export default function Library() {
  const {
    libraryCards,
    libraryPagination,
    isLoadingLibrary,
    fetchLibrary,
    updateLibraryCard,
    bulkDeleteLibraryCards,
  } = useLibrary();

  const {
    librarySelectedIds,
    toggleLibrarySelection,
    selectAllLibraryCards,
    deselectAllLibraryCards,
  } = useLibrarySelection();

  const { removeLibraryCardLocally, restoreLibraryCard } = useLibraryUndoDelete();
  const { setExportCards } = useExportCards();
  const navigate = useNavigate();

  const libraryViewMode = useSettingsStore((s) => s.libraryViewMode);
  const setLibraryViewMode = useSettingsStore((s) => s.setLibraryViewMode);

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<CardFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    fetchLibrary(currentFilters);
  }, [currentFilters, fetchLibrary]);

  const { page, total, total_pages } = libraryPagination;
  const hasActiveFilters =
    currentFilters.domain !== undefined ||
    currentFilters.search !== undefined ||
    currentFilters.tag !== undefined ||
    currentFilters.created_after !== undefined ||
    currentFilters.created_before !== undefined;

  const allSelected = libraryCards.length > 0 && librarySelectedIds.size === libraryCards.length;
  const someSelected = librarySelectedIds.size > 0;

  const handlePageChange = (newPage: number) => {
    setCurrentFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (updates: Partial<CardFilters>) => {
    setCurrentFilters((prev) => ({ ...prev, ...updates, page: 1 }));
  };

  const clearFilters = () => {
    setCurrentFilters(DEFAULT_FILTERS);
  };

  // --- Undo delete ---
  const pendingDeletes = useRef<
    Map<string, { card: LibraryCard; index: number; timeoutId: ReturnType<typeof setTimeout> }>
  >(new Map());

  const handleDelete = (id: string) => {
    const result = removeLibraryCardLocally(id);
    if (!result) return;

    const existing = pendingDeletes.current.get(id);
    if (existing) clearTimeout(existing.timeoutId);

    const timeoutId = setTimeout(async () => {
      pendingDeletes.current.delete(id);
      try {
        await api.deleteCard(id);
      } catch {
        // fire-and-forget — card already removed from UI
      }
    }, 5000);

    pendingDeletes.current.set(id, { card: result.card, index: result.index, timeoutId });

    toast("Card deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          const pending = pendingDeletes.current.get(id);
          if (pending) {
            clearTimeout(pending.timeoutId);
            pendingDeletes.current.delete(id);
            restoreLibraryCard(pending.card, pending.index);
          }
        },
      },
      duration: 5000,
    });
  };

  // Flush pending deletes on unmount
  useEffect(() => {
    return () => {
      for (const [, { timeoutId }] of pendingDeletes.current.entries()) {
        clearTimeout(timeoutId);
      }
      for (const [id] of pendingDeletes.current.entries()) {
        api.deleteCard(id).catch(() => {});
      }
      pendingDeletes.current.clear();
    };
  }, []);

  const handleSave = async (id: string, updates: UpdateCardRequest) => {
    try {
      await updateLibraryCard(id, updates);
      setEditingCardId(null);
      toast.success("Card updated");
    } catch {
      toast.error("Failed to update card");
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...librarySelectedIds];
    try {
      await bulkDeleteLibraryCards(ids);
      toast.success(`Deleted ${ids.length} card${ids.length > 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to delete cards");
    }
  };

  const handleExportSelected = () => {
    const selectedCards = libraryCards.filter((c) => librarySelectedIds.has(c.id));
    setExportCards(selectedCards);
    navigate("/app/export");
  };

  // --- Loading state ---
  if (isLoadingLibrary && libraryCards.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="ml-auto h-3 w-20" />
              </div>
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="mt-3 flex gap-1">
                <Skeleton className="h-4 w-12 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Empty state (no cards at all) ---
  if (!isLoadingLibrary && libraryCards.length === 0 && !hasActiveFilters) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Card Library</h1>
        <div className="flex flex-col items-center gap-5 py-20 text-center">
          <div className="rounded-2xl bg-muted/50 p-5">
            <LibraryBig className="h-12 w-12 text-muted-foreground/60" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">No cards yet</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Generate your first flashcards and they&apos;ll appear here for review, editing, and export.
            </p>
          </div>
          <Button asChild className="mt-2">
            <Link to="/app">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate your first cards
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // --- Filter-empty state ---
  if (!isLoadingLibrary && libraryCards.length === 0 && hasActiveFilters) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Card Library</h1>
        <LibraryToolbar
          filters={currentFilters}
          libraryCards={libraryCards}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
        />
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-sm text-muted-foreground">No cards match your filters.</p>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </div>
    );
  }

  // --- Main library view ---
  return (
    <div className="mx-auto max-w-6xl">
      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Card Library</h1>
        <Badge variant="secondary" className="tabular-nums">
          {total} card{total !== 1 ? "s" : ""}
        </Badge>

        <div className="ml-auto flex items-center gap-2">
          {/* Bulk actions */}
          {someSelected && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportSelected}>
                <Download className="h-3.5 w-3.5" />
                Export {librarySelectedIds.size}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete {librarySelectedIds.size}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {librarySelectedIds.size} card{librarySelectedIds.size > 1 ? "s" : ""}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The selected cards will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {/* View mode toggle */}
          <div className="flex rounded-md border">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-r-none",
                libraryViewMode === "grid" && "bg-accent",
              )}
              onClick={() => setLibraryViewMode("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="sr-only">Grid view</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-l-none",
                libraryViewMode === "list" && "bg-accent",
              )}
              onClick={() => setLibraryViewMode("list")}
            >
              <List className="h-3.5 w-3.5" />
              <span className="sr-only">List view</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="mb-4">
        <LibraryToolbar
          filters={currentFilters}
          libraryCards={libraryCards}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
        />
      </div>

      {/* Select all bar */}
      {libraryCards.length > 1 && (
        <div className="mb-4 flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => {
              if (allSelected) deselectAllLibraryCards();
              else selectAllLibraryCards();
            }}
          />
          <span className="text-sm text-muted-foreground">
            {allSelected ? "Deselect all" : "Select all"}{" "}
            ({librarySelectedIds.size}/{libraryCards.length})
          </span>
        </div>
      )}

      {/* Card grid */}
      {libraryViewMode === "grid" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {libraryCards.map((card) => (
            <LibraryCardItem
              key={card.id}
              card={card}
              isSelected={librarySelectedIds.has(card.id)}
              isEditing={editingCardId === card.id}
              onToggleSelect={() => toggleLibrarySelection(card.id)}
              onEdit={() => setEditingCardId(card.id)}
              onDelete={() => handleDelete(card.id)}
              onSave={handleSave}
              onCancelEdit={() => setEditingCardId(null)}
            />
          ))}
        </div>
      )}

      {/* Card list */}
      {libraryViewMode === "list" && (
        <div className="space-y-2">
          {libraryCards.map((card) => (
            <LibraryCardItem
              key={card.id}
              card={card}
              isSelected={librarySelectedIds.has(card.id)}
              isEditing={editingCardId === card.id}
              onToggleSelect={() => toggleLibrarySelection(card.id)}
              onEdit={() => setEditingCardId(card.id)}
              onDelete={() => handleDelete(card.id)}
              onSave={handleSave}
              onCancelEdit={() => setEditingCardId(null)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total_pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            Previous
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">
            Page {page} of {total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= total_pages}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Loading overlay for page transitions */}
      {isLoadingLibrary && libraryCards.length > 0 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">Loading...</div>
      )}
    </div>
  );
}
