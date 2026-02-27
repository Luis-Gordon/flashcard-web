import { useState } from "react";
import type { Card, EditableCard, RejectedCard, UnsuitableContent, GenerateResponse } from "@/types/cards";
import { useCardActions } from "@/lib/hooks/useCards";
import { SanitizedHTML } from "@/components/cards/SanitizedHTML";
import { CardEditor } from "@/components/cards/CardEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Pencil,
  Trash2,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Download,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Single card component
// ---------------------------------------------------------------------------

interface CardItemProps {
  card: EditableCard;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  onSave: (id: string, updates: Partial<Pick<EditableCard, "front" | "back" | "tags" | "notes">>) => void;
  onCancelEdit: () => void;
}

function CardItem({
  card,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  isEditing,
  onSave,
  onCancelEdit,
}: CardItemProps) {
  if (isEditing) {
    return <CardEditor card={card} onSave={onSave} onCancel={onCancelEdit} />;
  }

  return (
    <div className="group rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30">
      <div className="mb-3 flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          className="mt-0.5"
        />
        <div className="flex-1 space-y-2">
          {/* Front */}
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Front
            </span>
            <SanitizedHTML
              html={card.front}
              className="mt-0.5 text-sm leading-relaxed [&_.fc-word]:font-semibold [&_ruby_rt]:text-xs [&_ruby_rt]:text-muted-foreground"
            />
          </div>

          {/* Back */}
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Back
            </span>
            <SanitizedHTML
              html={card.back}
              className="mt-0.5 text-sm leading-relaxed [&_.fc-section]:mb-1 [&_.fc-heading]:font-medium [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs"
            />
          </div>

          {/* Tags */}
          {card.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {card.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Notes */}
          {card.notes && (
            <p className="text-xs text-muted-foreground italic">{card.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quality filter section (rejected / unsuitable)
// ---------------------------------------------------------------------------

function QualityFilter({
  rejected,
  unsuitable,
}: {
  rejected: RejectedCard[];
  unsuitable: UnsuitableContent[];
}) {
  if (rejected.length === 0 && unsuitable.length === 0) return null;

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-amber-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          {rejected.length > 0 && `${rejected.length} rejected`}
          {rejected.length > 0 && unsuitable.length > 0 && " · "}
          {unsuitable.length > 0 && `${unsuitable.length} unsuitable`}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {rejected.map((r, i) => (
          <div key={i} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Rejected: low confidence
            </p>
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              {r.errors.join("; ")}
            </p>
          </div>
        ))}
        {unsuitable.map((u, i) => (
          <div key={i} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Unsuitable: {u.reason.replace(/_/g, " ")}
            </p>
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              {u.explanation}
            </p>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Main CardReview component
// ---------------------------------------------------------------------------

interface CardReviewProps {
  cards: Card[];
  selectedCardIds: Set<string>;
  rejected: RejectedCard[];
  unsuitable: UnsuitableContent[];
  response: GenerateResponse;
  onGenerateMore: () => void;
  onExportSelected?: () => void;
}

export function CardReview({
  cards,
  selectedCardIds,
  rejected,
  unsuitable,
  response,
  onGenerateMore,
  onExportSelected,
}: CardReviewProps) {
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const {
    removePendingCard,
    updatePendingCard,
    toggleCardSelection,
    selectAllCards,
    deselectAllCards,
    clearPendingCards,
  } = useCardActions();

  const allSelected = cards.length > 0 && selectedCardIds.size === cards.length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">
            {response.usage.cards_generated} cards generated
          </span>
        </div>
        {response.usage.cards_remaining !== null && (
          <span className="text-xs text-muted-foreground">
            {response.usage.cards_remaining} remaining this period
          </span>
        )}
        <div className="ml-auto flex gap-2">
          {onExportSelected && selectedCardIds.size > 0 && (
            <Button variant="default" size="sm" className="gap-1.5" onClick={onExportSelected}>
              <Download className="h-3.5 w-3.5" />
              Export {selectedCardIds.size}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onGenerateMore}>
            Generate more
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={clearPendingCards}
          >
            Discard all
          </Button>
        </div>
      </div>

      {/* Quality filter */}
      <QualityFilter rejected={rejected} unsuitable={unsuitable} />

      {/* Select all / deselect */}
      {cards.length > 1 && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => {
              if (allSelected) deselectAllCards();
              else selectAllCards();
            }}
          />
          <span className="text-sm text-muted-foreground">
            {allSelected ? "Deselect all" : "Select all"} ({selectedCardIds.size}/{cards.length})
          </span>
        </div>
      )}

      {/* Card list */}
      <div className="space-y-2">
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            isSelected={selectedCardIds.has(card.id)}
            onToggleSelect={() => toggleCardSelection(card.id)}
            onEdit={() => setEditingCardId(card.id)}
            onDelete={() => removePendingCard(card.id)}
            isEditing={editingCardId === card.id}
            onSave={(id, updates) => {
              updatePendingCard(id, updates);
              setEditingCardId(null);
            }}
            onCancelEdit={() => setEditingCardId(null)}
          />
        ))}
      </div>
    </div>
  );
}
