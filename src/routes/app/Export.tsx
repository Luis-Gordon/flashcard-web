import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useExportCards } from "@/lib/hooks/useCards";
import { useSettingsStore } from "@/stores/settings";
import { useKeyboardShortcut, isMac } from "@/lib/hooks/useKeyboardShortcut";
import { EXPORT_FORMATS, dispatchExport } from "@/lib/export";
import { triggerDownload } from "@/lib/export/download";
import type { ExportFormat } from "@/types/cards";
import type { ExportFormatConfig, ExportOptionField } from "@/lib/export/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Package,
  Table,
  FileText,
  Braces,
  Download,
  Sparkles,
  LibraryBig,
  ChevronDown,
  Loader2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  Table,
  FileText,
  Braces,
};

/** Build default option values from a format config's options array. */
function buildDefaults(options: ExportOptionField[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const opt of options) {
    defaults[opt.key] = opt.defaultValue;
  }
  return defaults;
}

export default function Export() {
  const { exportCards, clearExportCards } = useExportCards();
  const recentDeckNames = useSettingsStore((s) => s.recentDeckNames);
  const addRecentDeckName = useSettingsStore((s) => s.addRecentDeckName);

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("apkg");
  const [formatOptions, setFormatOptions] = useState<Record<string, unknown>>(() =>
    buildDefaults(EXPORT_FORMATS[0]!.options),
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const exportAbortRef = useRef<AbortController | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>("");

  const currentConfig = useMemo(
    () => EXPORT_FORMATS.find((f) => f.id === selectedFormat)!,
    [selectedFormat],
  );

  // Reset options when format changes
  useEffect(() => {
    setFormatOptions(buildDefaults(currentConfig.options));
    setPreviewContent("");
    setPreviewOpen(false);
  }, [currentConfig]);

  const hasDeckNameOption = currentConfig.options.some((o) => o.key === "deckName");

  const updateOption = useCallback((key: string, value: unknown) => {
    setFormatOptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleGeneratePreview = useCallback(async () => {
    if (exportCards.length === 0) return;

    const previewCards = exportCards.slice(0, 3);
    try {
      const result = await dispatchExport(selectedFormat, previewCards, formatOptions);
      if (typeof result.content === "string") {
        setPreviewContent(result.content.slice(0, 2000));
      } else {
        setPreviewContent(`[Binary .apkg file — ${(result.content.byteLength / 1024).toFixed(1)} KB]`);
      }
      setPreviewOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Preview generation failed";
      toast.error(message);
    }
  }, [exportCards, selectedFormat, formatOptions]);

  const handleExport = useCallback(async () => {
    if (exportCards.length === 0) return;

    const abortController = new AbortController();
    exportAbortRef.current = abortController;
    setIsExporting(true);
    setExportProgress(0);
    try {
      const result = await dispatchExport(
        selectedFormat,
        exportCards,
        formatOptions,
        { onProgress: setExportProgress, signal: abortController.signal },
      );
      triggerDownload(result);

      // Save deck name for recent list
      const deckName = formatOptions.deckName;
      if (typeof deckName === "string" && deckName.trim()) {
        addRecentDeckName(deckName.trim());
      }

      toast.success(`Exported ${exportCards.length} card${exportCards.length !== 1 ? "s" : ""} as ${currentConfig.extension}`);
    } catch (err) {
      if (abortController.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Export failed";
      toast.error(message);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      exportAbortRef.current = null;
    }
  }, [exportCards, selectedFormat, formatOptions, currentConfig, addRecentDeckName]);

  // Ctrl+E / ⌘+E to trigger export
  useKeyboardShortcut(
    { key: "e", ctrl: true },
    handleExport,
    { enabled: !isExporting && exportCards.length > 0 },
  );

  // ── Empty state ──────────────────────────────────────────
  if (exportCards.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Export</h1>
        <div className="flex flex-col items-center gap-5 py-20 text-center">
          <div className="rounded-2xl bg-muted/50 p-5">
            <Download className="h-12 w-12 text-muted-foreground/60" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">No cards to export</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Select cards from the Library or Generate page to export them as Anki packages, CSV, Markdown, or JSON.
            </p>
          </div>
          <div className="mt-2 flex gap-3">
            <Button asChild variant="outline">
              <Link to="/app/library">
                <LibraryBig className="mr-2 h-4 w-4" />
                Browse Library
              </Link>
            </Button>
            <Button asChild>
              <Link to="/app">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Cards
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main export view ─────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Export</h1>
        <Badge variant="secondary" className="tabular-nums">
          {exportCards.length} card{exportCards.length !== 1 ? "s" : ""}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-xs text-muted-foreground"
          onClick={clearExportCards}
        >
          Clear selection
        </Button>
      </div>

      {/* Format selector — 2×2 grid */}
      <div className="mb-6">
        <p id="format-label" className="mb-3 text-sm font-medium">Format</p>
        <RadioGroupPrimitive.Root
          value={selectedFormat}
          onValueChange={(val) => setSelectedFormat(val as ExportFormat)}
          className="grid grid-cols-2 gap-3"
          aria-labelledby="format-label"
        >
          {EXPORT_FORMATS.map((fmt) => (
            <FormatCard
              key={fmt.id}
              config={fmt}
              isSelected={selectedFormat === fmt.id}
            />
          ))}
        </RadioGroupPrimitive.Root>
      </div>

      {/* Options panel */}
      {currentConfig.options.length > 0 && (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <h3 className="mb-4 text-sm font-medium">Options</h3>
          <div className="space-y-4">
            {currentConfig.options.map((opt) => (
              <OptionField
                key={opt.key}
                field={opt}
                value={formatOptions[opt.key]}
                onChange={(val) => updateOption(opt.key, val)}
                recentDeckNames={
                  opt.key === "deckName" && hasDeckNameOption ? recentDeckNames : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Preview section */}
      <Collapsible open={previewOpen} onOpenChange={setPreviewOpen} className="mb-6">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-sm text-muted-foreground"
              onClick={() => {
                if (!previewOpen && !previewContent) {
                  handleGeneratePreview();
                }
              }}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  previewOpen && "rotate-180",
                )}
              />
            </Button>
          </CollapsibleTrigger>
          {previewOpen && (
            <span className="text-xs text-muted-foreground">
              Showing first {Math.min(3, exportCards.length)} card{Math.min(3, exportCards.length) !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <CollapsibleContent>
          {previewContent ? (
            <pre className="mt-2 max-h-64 overflow-auto rounded-md border bg-muted/50 p-3 text-xs leading-relaxed">
              {previewContent}
            </pre>
          ) : (
            <div className="mt-2 flex items-center justify-center rounded-md border bg-muted/50 p-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Export button */}
      <Button
        onClick={isExporting ? () => exportAbortRef.current?.abort() : handleExport}
        variant={isExporting ? "outline" : "default"}
        className="w-full gap-2"
        size="lg"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {selectedFormat === "apkg" && exportCards.length > 100
              ? `Exporting... ${Math.round(exportProgress * 100)}%`
              : "Exporting..."}
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Export {exportCards.length} card{exportCards.length !== 1 ? "s" : ""} as {currentConfig.extension}
          </>
        )}
      </Button>
      {isExporting && selectedFormat === "apkg" && exportCards.length > 100 ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Click the button above to cancel
        </p>
      ) : !isExporting ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {isMac() ? "⌘" : "Ctrl"}+E
        </p>
      ) : null}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function FormatCard({
  config,
  isSelected,
}: {
  config: ExportFormatConfig;
  isSelected: boolean;
}) {
  const Icon = ICON_MAP[config.icon] ?? Package;

  return (
    <RadioGroupPrimitive.Item
      value={config.id}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all outline-none",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-muted-foreground/30 hover:bg-accent/50",
      )}
    >
      <div className="flex w-full items-center gap-2.5">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md",
            isSelected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium">{config.label}</span>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {config.extension}
        </Badge>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {config.description}
      </p>
    </RadioGroupPrimitive.Item>
  );
}

function OptionField({
  field,
  value,
  onChange,
  recentDeckNames,
}: {
  field: ExportOptionField;
  value: unknown;
  onChange: (value: unknown) => void;
  recentDeckNames?: string[];
}) {
  switch (field.type) {
    case "text":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={field.key} className="text-xs">
            {field.label}
          </Label>
          <div className="flex gap-2">
            <Input
              id={field.key}
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value)}
              className="h-9"
            />
            {recentDeckNames && recentDeckNames.length > 0 && (
              <Select onValueChange={onChange}>
                <SelectTrigger className="h-9 w-[140px] shrink-0">
                  <SelectValue placeholder="Recent..." />
                </SelectTrigger>
                <SelectContent>
                  {recentDeckNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={field.key}
            checked={(value as boolean) ?? false}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <Label htmlFor={field.key} className="text-xs font-normal">
            {field.label}
          </Label>
        </div>
      );

    case "select":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={field.key} className="text-xs">
            {field.label}
          </Label>
          <Select
            value={(value as string) ?? ""}
            onValueChange={onChange}
          >
            <SelectTrigger id={field.key} className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.choices?.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
  }
}
