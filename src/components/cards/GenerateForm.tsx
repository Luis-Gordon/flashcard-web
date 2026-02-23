import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  generateFormSchema,
  type GenerateFormValues,
} from "@/lib/validation/cards";
import { useCardActions } from "@/lib/hooks/useCards";
import { ApiError } from "@/lib/api";
import type { CardDomain } from "@/types/cards";
import { Button } from "@/components/ui/button";
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
  { value: "lang", label: "Language", description: "Japanese-English vocabulary & grammar", icon: Languages },
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

/** hook_key mapping: "ja" → Japanese hook, all others → "default" hook */
const LANGUAGE_OPTIONS = [
  { value: "ja", label: "Japanese" },
  { value: "default", label: "Other (generic)" },
] as const;

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

  const onSubmit = async (values: GenerateFormValues) => {
    try {
      await generateCards({
        content: values.content,
        domain: values.domain,
        cardStyle: values.cardStyle,
        difficulty: values.difficulty,
        maxCards: values.maxCards,
        hookKey: values.hookKey,
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
          case "RATE_LIMITED": {
            const retrySeconds = error.retryAfter ?? 60;
            toast.error("Too many requests", {
              description: `Please wait ${retrySeconds}s before trying again.`,
            });
            return;
          }
          case "VALIDATION_ERROR":
            // Inline errors handled by react-hook-form
            return;
          default:
            toast.error("Generation failed", {
              description: error.requestId
                ? `Something went wrong. Reference: ${error.requestId}`
                : "Something went wrong. Please try again.",
            });
            return;
        }
      }
      toast.error("Network error", {
        description: "Could not reach the server. Check your connection.",
      });
    }
  };

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
                  // Reset hookKey when switching away from lang
                  if (val !== "lang") setValue("hookKey", undefined);
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

        {/* Language — only visible for lang domain */}
        {selectedDomain === "lang" && (
          <div className="space-y-2">
            <Label>Language</Label>
            <Controller
              name="hookKey"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "ja"}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map(({ value, label }) => (
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
    </form>
  );
}
