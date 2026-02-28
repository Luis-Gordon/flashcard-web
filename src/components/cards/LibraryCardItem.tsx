import { memo, useState } from "react";
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
import { DOMAIN_LABELS, DOMAIN_COLORS } from "@/lib/constants/domains";

interface LibraryCardItemProps {
  card: LibraryCard;
  isSelected: boolean;
  isEditing: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSave: (id: string, updates: UpdateCardRequest) => void;
  onCancelEdit: () => void;
}

export const LibraryCardItem = memo(function LibraryCardItem({
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
            onCheckedChange={() => onToggleSelect(card.id)}
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
          <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(card.id)}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(card.id)}
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
          className="mt-2 flex w-full items-center gap-1 rounded py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
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
});
