import { Card, CardContent } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export default function Billing() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Billing & Usage</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">Billing & Usage</p>
            <p className="text-sm text-muted-foreground">Coming in Phase 4</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
