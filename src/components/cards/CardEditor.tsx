import { useState } from "react";
import type { Card } from "@/types/cards";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";

interface CardEditorProps {
  card: Card;
  onSave: (id: string, updates: Partial<Pick<Card, "front" | "back" | "tags">>) => void;
  onCancel: () => void;
}

export function CardEditor({ card, onSave, onCancel }: CardEditorProps) {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [tagsInput, setTagsInput] = useState(card.tags.join(", "));

  const handleSave = () => {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSave(card.id, { front, back, tags });
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Front</Label>
        <Textarea
          value={front}
          onChange={(e) => setFront(e.target.value)}
          className="min-h-[60px] resize-y text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Back</Label>
        <Textarea
          value={back}
          onChange={(e) => setBack(e.target.value)}
          className="min-h-[80px] resize-y text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Tags (comma-separated)</Label>
        <Input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="tag1, tag2, tag3"
          className="text-sm"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={handleSave}>
          <Check className="mr-1.5 h-3.5 w-3.5" />
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="mr-1.5 h-3.5 w-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
