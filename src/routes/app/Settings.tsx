import { Card, CardContent } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <SettingsIcon className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">Account Settings</p>
            <p className="text-sm text-muted-foreground">Coming in Phase 5</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
