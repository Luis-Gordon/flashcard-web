import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function Generate() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Generate Cards</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">Card Generation</p>
            <p className="text-sm text-muted-foreground">Coming in Phase 2</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
