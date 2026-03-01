import { Link } from "react-router";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <MarketingLayout>
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <FileQuestion className="mx-auto h-16 w-16 text-muted-foreground/50" />
          <h1 className="mt-6 text-6xl font-bold tracking-tight">404</h1>
          <p className="mt-2 text-xl font-medium text-foreground">
            Page not found
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/">Go home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app">Go to app</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
