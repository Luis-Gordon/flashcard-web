import { useState, useRef, useEffect, useMemo } from "react";
import { format } from "date-fns";
import type { CardFilters, CardDomain, LibraryCard } from "@/types/cards";
import { CARD_DOMAINS } from "@/lib/validation/cards";
import { DOMAIN_LABELS } from "@/lib/constants/domains";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X, CalendarIcon, Tag, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LibraryToolbarProps {
  filters: CardFilters;
  libraryCards: LibraryCard[];
  onFilterChange: (updates: Partial<CardFilters>) => void;
  onClearFilters: () => void;
}

export function LibraryToolbar({
  filters,
  libraryCards,
  onFilterChange,
  onClearFilters,
}: LibraryToolbarProps) {
  // --- Search (debounced) ---
  const [searchValue, setSearchValue] = useState(filters.search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Sync external filter changes (e.g., clear filters) back to local state
    setSearchValue(filters.search ?? "");
  }, [filters.search]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFilterChange({ search: value || undefined });
    }, 300);
  };

  // --- Tag combobox ---
  const [tagOpen, setTagOpen] = useState(false);
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const card of libraryCards) {
      for (const tag of card.tags) tagSet.add(tag);
    }
    return [...tagSet].sort();
  }, [libraryCards]);

  // --- Date pickers ---
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  const fromDate = filters.created_after ? new Date(filters.created_after) : undefined;
  const toDate = filters.created_before ? new Date(filters.created_before) : undefined;

  // --- Active filter pills ---
  const sortLabel =
    filters.sort === "domain"
      ? "By domain"
      : filters.order === "asc"
        ? "Oldest first"
        : "Newest first";
  const isNonDefaultSort = filters.sort === "domain" || filters.order === "asc";

  const hasActiveFilters =
    filters.domain !== undefined ||
    filters.search !== undefined ||
    filters.tag !== undefined ||
    filters.created_after !== undefined ||
    filters.created_before !== undefined ||
    isNonDefaultSort;

  return (
    <div className="space-y-2">
      {/* Main toolbar row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Domain filter */}
        <Select
          value={filters.domain ?? "all"}
          onValueChange={(value) =>
            onFilterChange({ domain: value === "all" ? undefined : (value as CardDomain) })
          }
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="All domains" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All domains</SelectItem>
            {CARD_DOMAINS.map((d) => (
              <SelectItem key={d} value={d}>
                {DOMAIN_LABELS[d] ?? d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search input */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search cards..."
            className="h-8 w-[180px] pl-8 pr-7 text-xs"
          />
          {searchValue && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Clear search</span>
            </button>
          )}
        </div>

        {/* Tag combobox */}
        {availableTags.length > 0 && (
          <Popover open={tagOpen} onOpenChange={setTagOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 text-xs font-normal",
                  filters.tag && "border-primary/50 bg-primary/5",
                )}
              >
                <Tag className="h-3 w-3" />
                {filters.tag ?? "Tag"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search tags..." className="h-8 text-xs" />
                <CommandList>
                  <CommandEmpty>No tags found.</CommandEmpty>
                  <CommandGroup>
                    {availableTags.map((tag) => (
                      <CommandItem
                        key={tag}
                        value={tag}
                        onSelect={() => {
                          onFilterChange({
                            tag: filters.tag === tag ? undefined : tag,
                          });
                          setTagOpen(false);
                        }}
                        className="text-xs"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5",
                            filters.tag === tag ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {tag}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        {/* Date: From */}
        <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 text-xs font-normal",
                fromDate && "border-primary/50 bg-primary/5",
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              {fromDate ? format(fromDate, "MMM d, yyyy") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={(date) => {
                onFilterChange({
                  created_after: date
                    ? format(date, "yyyy-MM-dd'T'HH:mm:ss'Z'")
                    : undefined,
                });
                setFromDateOpen(false);
              }}
              disabled={(date) => (toDate ? date > toDate : false)}
              initialFocus
            />
            {fromDate && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full text-xs"
                  onClick={() => {
                    onFilterChange({ created_after: undefined });
                    setFromDateOpen(false);
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Date: To */}
        <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 text-xs font-normal",
                toDate && "border-primary/50 bg-primary/5",
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              {toDate ? format(toDate, "MMM d, yyyy") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={(date) => {
                onFilterChange({
                  created_before: date
                    ? format(date, "yyyy-MM-dd'T'HH:mm:ss'Z'")
                    : undefined,
                });
                setToDateOpen(false);
              }}
              disabled={(date) => (fromDate ? date < fromDate : false)}
              initialFocus
            />
            {toDate && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full text-xs"
                  onClick={() => {
                    onFilterChange({ created_before: undefined });
                    setToDateOpen(false);
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Sort */}
        <Select
          value={filters.sort === "domain" ? "domain-asc" : `created_at-${filters.order ?? "desc"}`}
          onValueChange={(value) => {
            if (value === "domain-asc") {
              onFilterChange({ sort: "domain", order: "asc" });
            } else {
              const order = value.split("-")[1] as "asc" | "desc";
              onFilterChange({ sort: "created_at", order });
            }
          }}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue>{sortLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at-desc">Newest first</SelectItem>
            <SelectItem value="created_at-asc">Oldest first</SelectItem>
            <SelectItem value="domain-asc">By domain</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.domain && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-[10px]"
            >
              {DOMAIN_LABELS[filters.domain] ?? filters.domain}
              <button
                onClick={() => onFilterChange({ domain: undefined })}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-muted-foreground/20"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {filters.search && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-[10px]"
            >
              &ldquo;{filters.search}&rdquo;
              <button
                onClick={() => {
                  setSearchValue("");
                  onFilterChange({ search: undefined });
                }}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-muted-foreground/20"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {filters.tag && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-[10px]"
            >
              <Tag className="h-2.5 w-2.5" />
              {filters.tag}
              <button
                onClick={() => onFilterChange({ tag: undefined })}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-muted-foreground/20"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {fromDate && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-[10px]"
            >
              From {format(fromDate, "MMM d")}
              <button
                onClick={() => onFilterChange({ created_after: undefined })}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-muted-foreground/20"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {toDate && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-[10px]"
            >
              Until {format(toDate, "MMM d")}
              <button
                onClick={() => onFilterChange({ created_before: undefined })}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-muted-foreground/20"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {isNonDefaultSort && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-[10px]"
            >
              {sortLabel}
              <button
                onClick={() => onFilterChange({ sort: "created_at", order: "desc" })}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-muted-foreground/20"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          <button
            onClick={onClearFilters}
            className="text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
