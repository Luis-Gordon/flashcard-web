import { Card, CardContent } from "@/components/ui/card";
import { LibraryBig } from "lucide-react";

export default function Library() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold">Card Library</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <LibraryBig className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">Card Library</p>
            <p className="text-sm text-muted-foreground">Coming in Phase 3</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
