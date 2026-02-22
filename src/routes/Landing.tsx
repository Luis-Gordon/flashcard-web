import { Link } from "react-router";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  BookOpen,
  Languages,
  FlaskConical,
  Code2,
  Scale,
  Stethoscope,
  Music,
  GraduationCap,
  Landmark,
  Briefcase,
  Wand2,
  Download,
  Zap,
  ArrowRight,
} from "lucide-react";

const DOMAINS = [
  { icon: Languages, label: "Languages", detail: "Japanese, CEFR levels" },
  { icon: FlaskConical, label: "Sciences", detail: "Physics, chemistry, bio" },
  { icon: Stethoscope, label: "Medicine", detail: "Clinical & anatomy" },
  { icon: Scale, label: "Law", detail: "Case law & statutes" },
  { icon: Code2, label: "Programming", detail: "Code & concepts" },
  { icon: GraduationCap, label: "Humanities", detail: "History & philosophy" },
  { icon: Landmark, label: "Economics", detail: "Micro & macro" },
  { icon: Music, label: "Music", detail: "Theory & practice" },
  { icon: Briefcase, label: "Business", detail: "MBA & strategy" },
  { icon: BookOpen, label: "General", detail: "Any topic" },
] as const;

const STEPS = [
  {
    step: "1",
    title: "Paste your content",
    description:
      "Drop in text, URLs, or PDFs. Memogenesis extracts what matters from any source up to 10 MB.",
  },
  {
    step: "2",
    title: "AI generates cards",
    description:
      "Claude AI creates structured flashcards with context, examples, and mnemonics tailored to your domain.",
  },
  {
    step: "3",
    title: "Export to Anki",
    description:
      "Download a ready-to-import .apkg file or sync directly via the Anki add-on. Study in minutes.",
  },
] as const;

export default function Landing() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6">
              <Sparkles className="mr-1 h-3 w-3" />
              AI-powered flashcard generation
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Turn anything into{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                study-ready flashcards
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Paste text, URLs, or PDFs. Memogenesis uses Claude AI to generate
              structured, domain-specific Anki cards — complete with examples,
              audio, and images.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link to="/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/pricing">See Pricing</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              50 free cards per month. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Domains */}
      <section id="features" className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              10 knowledge domains
            </h2>
            <p className="mt-4 text-muted-foreground">
              Every domain has specialized prompts that generate cards matching
              the field&apos;s conventions — from furigana in Japanese to case
              citations in law.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {DOMAINS.map(({ icon: Icon, label, detail }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-lg border bg-background p-4 text-center transition-colors hover:border-primary/50"
              >
                <Icon className="h-6 w-6 text-primary" />
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 md:grid-cols-3">
            <div className="flex flex-col items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Wand2 className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Smart Enhancement</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                AI reviews your existing cards and adds mnemonics, examples,
                context, and formatting — without changing your original content.
              </p>
            </div>
            <div className="flex flex-col items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">.apkg Export</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Export cards as Anki packages directly from your browser.
                Client-side generation means your content never touches a
                server.
              </p>
            </div>
            <div className="flex flex-col items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Usage-Based Pricing</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Start free with 50 cards per month. Scale up with transparent,
                per-card pricing — no surprises, no annual lock-in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            How it works
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map(({ step, title, description }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {step}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Start generating cards today
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join learners who use AI to study smarter. Your first 50 cards are
              free — no credit card needed.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
                <Link to="/signup">
                  Create Free Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
