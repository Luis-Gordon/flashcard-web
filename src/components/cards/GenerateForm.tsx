import { useState, useRef, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { useKeyboardShortcut, isMac } from "@/lib/hooks/useKeyboardShortcut";
import {
  generateFormSchema,
  type GenerateFormValues,
} from "@/lib/validation/cards";
import { useCardActions } from "@/lib/hooks/useCards";
import { useSettingsStore } from "@/stores/settings";
import { ApiError } from "@/lib/api";
import type { CardDomain } from "@/types/cards";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Sparkles,
  Loader2,
  Languages,
  BookOpen,
  Stethoscope,
  Calculator,
  Code,
  Landmark,
  Scale,
  Palette,
  Wrench,
  Brain,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Domain configuration
// ---------------------------------------------------------------------------

interface DomainOption {
  value: CardDomain;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DOMAIN_OPTIONS: DomainOption[] = [
  { value: "lang", label: "Language", description: "Vocabulary, grammar & translations", icon: Languages },
  { value: "general", label: "General Knowledge", description: "Academic facts, definitions, concepts", icon: BookOpen },
  { value: "med", label: "Medical", description: "Pharmacology, pathology, anatomy", icon: Stethoscope },
  { value: "stem-m", label: "Mathematics", description: "Formulas, theorems, proofs", icon: Calculator },
  { value: "stem-cs", label: "Computer Science", description: "Programming, algorithms, data structures", icon: Code },
  { value: "fin", label: "Finance", description: "CFA, CPA, accounting, investments", icon: Landmark },
  { value: "law", label: "Legal", description: "Bar exam, case law, statutes", icon: Scale },
  { value: "arts", label: "Arts & Humanities", description: "Art history, music, literature", icon: Palette },
  { value: "skill", label: "Hobbies & Skills", description: "Chess, cooking, sports, crafts", icon: Wrench },
  { value: "mem", label: "Memory Techniques", description: "Mnemonics, memory palaces, PAO", icon: Brain },
];

/** hook_key mapping for lang domain sub-hooks */
const LANG_HOOK_OPTIONS = [
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
  { value: "ko", label: "Korean" },
  { value: "ar", label: "Arabic" },
  { value: "ru", label: "Russian" },
  { value: "default", label: "Other" },
] as const;

const MAX_HIGHLIGHTS = 5;
const MAX_HIGHLIGHT_LENGTH = 80;
const MAX_GUIDANCE_LENGTH = 500;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface GenerateFormProps {
  onUsageExceeded?: () => void;
}

export function GenerateForm({ onUsageExceeded }: GenerateFormProps) {
  const { generateCards } = useCardActions();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GenerateFormValues>({
    resolver: zodResolver(generateFormSchema),
    defaultValues: {
      content: "",
      domain: undefined,
      hookKey: undefined,
      cardStyle: "mixed",
      difficulty: "intermediate",
      maxCards: 10,
    },
  });

  const selectedDomain = watch("domain");
  const maxCards = watch("maxCards");
  const contentValue = watch("content");

  // Focus state (not part of react-hook-form)
  const [highlights, setHighlights] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [focusButtonPos, setFocusButtonPos] = useState<{ top: number; left: number } | null>(null);
  const [pendingSelection, setPendingSelection] = useState("");
  const highlightDivRef = useRef<HTMLDivElement>(null);

  // Language state (not in react-hook-form)
  const [sourceLanguage, setSourceLanguage] = useState(() => useSettingsStore.getState().userLanguage ?? "");
  const [outputLanguage, setOutputLanguage] = useState("");

  // Extension handoff: read URL params on mount
  useEffect(() => {
    const content = searchParams.get("content");
    const domain = searchParams.get("domain");

    if (content) {
      setValue("content", content);
    }
    if (domain && DOMAIN_OPTIONS.some((d) => d.value === domain)) {
      setValue("domain", domain as CardDomain);
    }

    // Clean URL params
    if (content || domain) {
      setSearchParams({}, { replace: true });
    }

  }, []);

  // Unified selection detection (desktop + mobile)
  useEffect(() => {
    let debounceId: number = 0;

    const showButtonForSelection = () => {
      const sel = window.getSelection();
      const div = highlightDivRef.current;
      if (!sel || sel.isCollapsed || !sel.toString().trim() || !div || !div.contains(sel.anchorNode)) {
        return;
      }
      const text = sel.toString().trim();
      if (!text) return;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setPendingSelection(text.slice(0, MAX_HIGHLIGHT_LENGTH));
      setFocusButtonPos({
        top: rect.top - 36,
        left: rect.left + rect.width / 2 - 45,
      });
    };

    const handleSelectionChange = () => {
      const sel = window.getSelection();
      const div = highlightDivRef.current;

      // Hide immediately when selection is empty or outside highlight div
      if (!sel || sel.isCollapsed || !sel.toString().trim() || !div || !div.contains(sel.anchorNode)) {
        clearTimeout(debounceId);
        setFocusButtonPos(null);
        setPendingSelection("");
        return;
      }

      // Debounce show (300ms) — prevents flash during mobile drag
      clearTimeout(debounceId);
      debounceId = window.setTimeout(showButtonForSelection, 300);
    };

    const handleTouchEnd = () => {
      // Short delay lets the browser finalize the selection after touch
      window.setTimeout(showButtonForSelection, 50);
    };

    const div = highlightDivRef.current;
    document.addEventListener("selectionchange", handleSelectionChange);
    div?.addEventListener("touchend", handleTouchEnd);
    return () => {
      clearTimeout(debounceId);
      document.removeEventListener("selectionchange", handleSelectionChange);
      div?.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  // Clear floating button on scroll (prevents drift)
  useEffect(() => {
    const div = highlightDivRef.current;
    const clearButton = () => setFocusButtonPos(null);
    if (div) {
      div.addEventListener("scroll", clearButton);
    }
    window.addEventListener("scroll", clearButton, true);
    return () => {
      if (div) {
        div.removeEventListener("scroll", clearButton);
      }
      window.removeEventListener("scroll", clearButton, true);
    };
  }, []);

  const addHighlight = useCallback(() => {
    if (!pendingSelection || highlights.length >= MAX_HIGHLIGHTS) return;
    // Avoid duplicates
    if (!highlights.includes(pendingSelection)) {
      setHighlights((prev) => [...prev, pendingSelection]);
    }
    setPendingSelection("");
    setFocusButtonPos(null);
    window.getSelection()?.removeAllRanges();
  }, [pendingSelection, highlights]);

  const removeHighlight = useCallback((index: number) => {
    setHighlights((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const onSubmit = async (values: GenerateFormValues) => {
    // Derive userGuidance from highlights + freeText
    const serialized = highlights.length ? `Focus on: ${highlights.join("; ")}.` : "";
    const userGuidance = [serialized, freeText.trim()].filter(Boolean).join(" ").slice(0, MAX_GUIDANCE_LENGTH) || undefined;

    // Language fields: pass only the relevant one for the current domain
    const srcLang = values.domain === "lang" ? sourceLanguage.trim() || undefined : undefined;
    const outLang = values.domain !== "lang" ? outputLanguage.trim() || undefined : undefined;

    try {
      await generateCards({
        content: values.content,
        domain: values.domain,
        cardStyle: values.cardStyle,
        difficulty: values.difficulty,
        maxCards: values.maxCards,
        hookKey: values.hookKey,
        userGuidance,
        sourceLanguage: srcLang,
        outputLanguage: outLang,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        switch (error.code) {
          case "USAGE_EXCEEDED":
            onUsageExceeded?.();
            toast.error("Card limit reached", {
              description: "Upgrade your plan to generate more cards.",
            });
            return;
          case "RATE_LIMITED":
            toast.error("Too many requests", {
              description: "Please try again in a moment.",
            });
            return;
          case "VALIDATION_ERROR":
            // Inline errors handled by react-hook-form
            return;
          default:
            toast.error("Generation failed", {
              description: error.requestId
                ? `${error.message} (Reference: ${error.requestId})`
                : error.message || "Something went wrong. Please try again.",
            });
            return;
        }
      }
      toast.error("Network error", {
        description: "Could not reach the server. Check your connection.",
      });
    }
  };

  // Ctrl+Enter / ⌘+Enter to submit from textarea
  useKeyboardShortcut(
    { key: "Enter", ctrl: true },
    useCallback(() => { handleSubmit(onSubmit)(); }, [handleSubmit, onSubmit]),
    { enabled: !isSubmitting },
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content">
          Content
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            Paste text to generate flashcards from
          </span>
        </Label>
        <Textarea
          id="content"
          placeholder="Paste article text, lecture notes, textbook excerpts..."
          className="min-h-[160px] resize-y"
          {...register("content")}
        />
        {errors.content && (
          <p className="text-sm text-destructive">{errors.content.message}</p>
        )}
      </div>

      {/* Focus section — highlight + guidance */}
      {contentValue.length >= 10 && (
        <div className="space-y-3">
          <Label>
            Focus
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              Select text below to highlight key terms, or add guidance
            </span>
          </Label>

          {/* Read-only content mirror for text selection */}
          <div
            ref={highlightDivRef}
            className="max-h-40 overflow-y-auto rounded-md border bg-muted/40 p-2 text-sm whitespace-pre-wrap select-text"
          >
            {contentValue}
          </div>

          {/* Floating "Add focus" button */}
          {focusButtonPos && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="fixed z-50 shadow-md"
              style={{ top: focusButtonPos.top, left: focusButtonPos.left }}
              disabled={highlights.length >= MAX_HIGHLIGHTS}
              onClick={addHighlight}
            >
              Add focus
            </Button>
          )}

          {/* Highlight pills */}
          {highlights.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {highlights.map((h, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  <span className="max-w-[10rem] truncate">{h}</span>
                  <button
                    type="button"
                    className="ml-0.5 rounded-sm p-0.5 hover:bg-muted"
                    onClick={() => removeHighlight(i)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <span className="text-xs text-muted-foreground">
                {highlights.length}/{MAX_HIGHLIGHTS}
              </span>
            </div>
          )}

          {/* Free-text guidance */}
          <div className="space-y-1.5">
            <Label htmlFor="guidance">
              Guidance
              <Badge variant="secondary" className="ml-1.5 text-[10px]">optional</Badge>
            </Label>
            <Textarea
              id="guidance"
              rows={2}
              className="resize-none"
              maxLength={MAX_GUIDANCE_LENGTH}
              placeholder="Optional: describe what to focus on (e.g. 'emphasize drug mechanisms', 'avoid historical context')"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
            />
            <p className={`text-right text-xs ${freeText.length > 480 ? "text-destructive" : "text-muted-foreground"}`}>
              {freeText.length}/{MAX_GUIDANCE_LENGTH}
            </p>
          </div>
        </div>
      )}

      {/* Domain + Language row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Domain</Label>
          <Controller
            name="domain"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(val) => {
                  field.onChange(val);
                  // Set hookKey to "ja" when switching to lang (before Select mounts),
                  // clear it for non-lang domains so it's not sent in the request
                  setValue("hookKey", val === "lang" ? "ja" : undefined);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a domain" />
                </SelectTrigger>
                <SelectContent>
                  {DOMAIN_OPTIONS.map(({ value, label, description, icon: Icon }) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                          <span>{label}</span>
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            {description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.domain && (
            <p className="text-sm text-destructive">{errors.domain.message}</p>
          )}
        </div>

        {/* hookKey selector — only for lang domain */}
        {selectedDomain === "lang" && (
          <div className="space-y-2">
            <Label>Language</Label>
            <Controller
              name="hookKey"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANG_HOOK_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        {/* Source language — for lang domain */}
        {selectedDomain === "lang" && (
          <div className="space-y-2">
            <Label htmlFor="source-language">Your language</Label>
            <Input
              id="source-language"
              placeholder="e.g. en, es, fr"
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Language for translations and explanations on produced cards.
            </p>
          </div>
        )}

        {/* Output language — for non-lang domains */}
        {selectedDomain && selectedDomain !== "lang" && (
          <div className="space-y-2">
            <Label htmlFor="output-language">Output language</Label>
            <Input
              id="output-language"
              placeholder="e.g. en, fr, de"
              value={outputLanguage}
              onChange={(e) => setOutputLanguage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to match your source content.
            </p>
          </div>
        )}
      </div>

      {/* Card style + Difficulty row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Card style</Label>
          <Controller
            name="cardStyle"
            control={control}
            render={({ field }) => (
              <ToggleGroup
                type="single"
                value={field.value}
                onValueChange={(val) => {
                  if (val) field.onChange(val);
                }}
                className="justify-start"
              >
                <ToggleGroupItem value="basic" className="text-xs">
                  Basic
                </ToggleGroupItem>
                <ToggleGroupItem value="cloze" className="text-xs">
                  Cloze
                </ToggleGroupItem>
                <ToggleGroupItem value="mixed" className="text-xs">
                  Mixed
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Controller
            name="difficulty"
            control={control}
            render={({ field }) => (
              <ToggleGroup
                type="single"
                value={field.value}
                onValueChange={(val) => {
                  if (val) field.onChange(val);
                }}
                className="justify-start"
              >
                <ToggleGroupItem value="beginner" className="text-xs">
                  Beginner
                </ToggleGroupItem>
                <ToggleGroupItem value="intermediate" className="text-xs">
                  Intermediate
                </ToggleGroupItem>
                <ToggleGroupItem value="advanced" className="text-xs">
                  Advanced
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          />
        </div>
      </div>

      {/* Max cards slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Max cards</Label>
          <span className="text-sm tabular-nums text-muted-foreground">
            {maxCards}
          </span>
        </div>
        <Controller
          name="maxCards"
          control={control}
          render={({ field }) => (
            <Slider
              min={1}
              max={50}
              step={1}
              value={[field.value]}
              onValueChange={([val]) => field.onChange(val)}
            />
          )}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>50</span>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Cards
          </>
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {isMac() ? "⌘" : "Ctrl"}+Enter
      </p>
    </form>
  );
}
