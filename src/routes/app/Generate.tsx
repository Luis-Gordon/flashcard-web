import { useState, useEffect, useRef } from "react";
import { useCards } from "@/lib/hooks/useCards";
import { GenerateForm } from "@/components/cards/GenerateForm";
import { CardReview } from "@/components/cards/CardReview";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function Generate() {
  const {
    pendingCards,
    rejectedCards,
    unsuitableContent,
    isGenerating,
    generateError,
    lastGenerateResponse,
    selectedCardIds,
  } = useCards();

  const [showUpgrade, setShowUpgrade] = useState(false);

  // Track whether to show the form or review panel
  // After generation completes, auto-switch to review
  const hasResults = pendingCards.length > 0 && lastGenerateResponse !== null;
  const prevHasResults = useRef(hasResults);
  const [forceForm, setForceForm] = useState(false);

  useEffect(() => {
    // When new results arrive, switch to review
    if (hasResults && !prevHasResults.current) {
      setForceForm(false);
    }
    prevHasResults.current = hasResults;
  }, [hasResults]);

  const showReview = hasResults && !forceForm;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Generate Cards</h1>

      {/* Generation error banner */}
      {generateError && !isGenerating && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {generateError}
        </div>
      )}

      {showReview ? (
        <CardReview
          cards={pendingCards}
          selectedCardIds={selectedCardIds}
          rejected={rejectedCards}
          unsuitable={unsuitableContent}
          response={lastGenerateResponse}
          onGenerateMore={() => setForceForm(true)}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" />
              New Generation
            </CardTitle>
            <CardDescription>
              Paste text content and configure how flashcards should be generated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GenerateForm
              onUsageExceeded={() => setShowUpgrade(true)}
            />
          </CardContent>
        </Card>
      )}

      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
    </div>
  );
}
