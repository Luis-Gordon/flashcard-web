import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { SanitizedHTML } from "@/components/cards/SanitizedHTML";
import { CardEditor } from "@/components/cards/CardEditor";
import type { LibraryCard, EditableCard, UpdateCardRequest } from "@/types/cards";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const DOMAIN_LABELS: Record<string, string> = {
  lang: "Language",
  general: "General",
  med: "Medicine",
  "stem-m": "Math",
  "stem-cs": "CS",
  fin: "Finance",
  law: "Law",
  arts: "Arts",
  skill: "Skills",
  mem: "Memory",
};

const DOMAIN_COLORS: Record<string, string> = {
  lang: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  general: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
  med: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  "stem-m": "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  "stem-cs": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  fin: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  law: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  arts: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
  skill: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  mem: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

interface LibraryCardItemProps {
  card: LibraryCard;
  isSelected: boolean;
  isEditing: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (id: string, updates: UpdateCardRequest) => void;
  onCancelEdit: () => void;
}

export function LibraryCardItem({
  card,
  isSelected,
  isEditing,
  onToggleSelect,
  onEdit,
  onDelete,
  onSave,
  onCancelEdit,
}: LibraryCardItemProps) {
  const [expanded, setExpanded] = useState(false);

  if (isEditing) {
    return (
      <CardEditor
        card={card as EditableCard}
        showNotes
        onSave={(id, updates) => onSave(id, updates as UpdateCardRequest)}
        onCancel={onCancelEdit}
      />
    );
  }

  const domainLabel = DOMAIN_LABELS[card.domain] ?? card.domain;
  const domainColor = DOMAIN_COLORS[card.domain] ?? DOMAIN_COLORS.general;
  const timeAgo = formatDistanceToNow(new Date(card.created_at), { addSuffix: true });

  return (
    <Card
      className={cn(
        "group relative transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        isSelected && "ring-2 ring-primary/40 shadow-sm",
      )}
    >
      <CardContent className="p-4">
        {/* Top bar: checkbox + domain + time + actions */}
        <div className="mb-3 flex items-center gap-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="shrink-0"
          />
          <Badge
            variant="secondary"
            className={cn("text-[10px] font-semibold uppercase tracking-wider border-0", domainColor)}
          >
            {domainLabel}
          </Badge>
          <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
            {timeAgo}
          </span>
          <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>

        {/* Front preview */}
        <SanitizedHTML
          html={card.front}
          className={cn(
            "text-sm leading-relaxed",
            "[&_.fc-word]:font-semibold [&_ruby_rt]:text-xs [&_ruby_rt]:text-muted-foreground",
            !expanded && "line-clamp-3",
          )}
        />

        {/* Expand toggle + back content */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex w-full items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Hide answer
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show answer
            </>
          )}
        </button>

        {expanded && (
          <div className="mt-2 rounded-md border border-dashed bg-muted/30 p-3">
            <SanitizedHTML
              html={card.back}
              className="text-sm leading-relaxed [&_.fc-section]:mb-1 [&_.fc-heading]:font-medium [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs"
            />
          </div>
        )}

        {/* Tags */}
        {card.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {card.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Notes */}
        {card.notes && (
          <p className="mt-2 text-xs italic text-muted-foreground">{card.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
