import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useEnhance } from "@/lib/hooks/useCards";
import { ApiError } from "@/lib/api";
import { CARD_DOMAINS } from "@/lib/validation/cards";
import { DOMAIN_LABELS } from "@/lib/constants/domains";
import type { CardDomain, EnhanceResponse, LibraryCard } from "@/types/cards";

interface EnhanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCards: LibraryCard[];
}

type Step = "configure" | "enhancing" | "results";

export function EnhanceModal({ open, onOpenChange, selectedCards }: EnhanceModalProps) {
  const { enhanceLibraryCards } = useEnhance();

  const [step, setStep] = useState<Step>("configure");
  const [domain, setDomain] = useState<CardDomain | "">("");
  const [addContext, setAddContext] = useState(true);
  const [addTags, setAddTags] = useState(true);
  const [fixFormatting, setFixFormatting] = useState(true);
  const [result, setResult] = useState<EnhanceResponse | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep("configure");
      setResult(null);
      setAddContext(true);
      setAddTags(true);
      setFixFormatting(true);

      // Pre-select domain if all selected cards share one
      const domains = new Set(selectedCards.map((c) => c.domain));
      setDomain(domains.size === 1 ? [...domains][0]! : "");
    }
  }, [open, selectedCards]);

  const noCheckboxChecked = !addContext && !addTags && !fixFormatting;
  const canSubmit = domain !== "" && !noCheckboxChecked;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStep("enhancing");

    try {
      const response = await enhanceLibraryCards({
        cardIds: selectedCards.map((c) => c.id),
        domain: domain as CardDomain,
        enhancements: {
          add_context: addContext,
          add_tags: addTags,
          fix_formatting: fixFormatting,
        },
      });
      setResult(response);
      setStep("results");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "USAGE_EXCEEDED") {
          toast.error("Usage limit exceeded. Please upgrade your plan.");
          onOpenChange(false);
          return;
        }
        if (error.code === "RATE_LIMITED") {
          toast.error("Rate limited. Please wait a moment and try again.");
          setStep("configure");
          return;
        }
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred");
      }
      setStep("configure");
    }
  };

  const handleOpenChange = (value: boolean) => {
    // Block dismiss during enhancement
    if (step === "enhancing") return;
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={step !== "enhancing"}>
        {step === "configure" && (
          <>
            <DialogHeader>
              <DialogTitle>
                Enhance {selectedCards.length} card{selectedCards.length !== 1 ? "s" : ""}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Domain</label>
                <Select value={domain} onValueChange={(v) => setDomain(v as CardDomain)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_DOMAINS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {DOMAIN_LABELS[d] ?? d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Enhancements</label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="add-context"
                    checked={addContext}
                    onCheckedChange={(v) => setAddContext(v === true)}
                  />
                  <label htmlFor="add-context" className="text-sm">Add context</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="add-tags"
                    checked={addTags}
                    onCheckedChange={(v) => setAddTags(v === true)}
                  />
                  <label htmlFor="add-tags" className="text-sm">Add tags</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="fix-formatting"
                    checked={fixFormatting}
                    onCheckedChange={(v) => setFixFormatting(v === true)}
                  />
                  <label htmlFor="fix-formatting" className="text-sm">Fix formatting</label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                Enhance
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "enhancing" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Enhancing {selectedCards.length} card{selectedCards.length !== 1 ? "s" : ""}...
            </p>
          </div>
        )}

        {step === "results" && result && (
          <>
            <DialogHeader>
              <DialogTitle>Enhancement Results</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {result.enhanced_cards.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {result.enhanced_cards.length} enhanced successfully
                </div>
              )}

              {result.failed_cards.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <XCircle className="h-4 w-4" />
                    {result.failed_cards.length} failed
                  </div>
                  <ul className="ml-6 list-disc space-y-1 text-xs text-muted-foreground">
                    {result.failed_cards.map((fc) => {
                      const card = selectedCards.find((c) => c.id === fc.id);
                      const snippet = card ? card.front.slice(0, 60) : fc.id;
                      return (
                        <li key={fc.id}>
                          {snippet}{card && card.front.length > 60 ? "..." : ""}: {fc.error}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {result.enhanced_cards.some((c) => c.skipped_enhancements.length > 0) && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    Some enhancements were skipped
                  </div>
                  <ul className="ml-6 list-disc space-y-1 text-xs text-muted-foreground">
                    {result.enhanced_cards
                      .filter((c) => c.skipped_enhancements.length > 0)
                      .map((c) => {
                        const card = selectedCards.find((sc) => sc.id === c.id);
                        const snippet = card ? card.front.slice(0, 40) : c.id;
                        return c.skipped_enhancements.map((se) => (
                          <li key={`${c.id}-${se.type}`}>
                            {snippet}{card && card.front.length > 40 ? "..." : ""}: {se.type} — {se.reason}
                          </li>
                        ));
                      })}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
