import { Link, Outlet, useLocation } from "react-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useUsage } from "@/lib/hooks/useUsage";
import { useCardCount } from "@/lib/hooks/useCardCount";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  LibraryBig,
  Download,
  CreditCard,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/app", label: "Generate", icon: Sparkles },
  { href: "/app/library", label: "Library", icon: LibraryBig },
  { href: "/app/export", label: "Export", icon: Download },
  { href: "/app/billing", label: "Billing", icon: CreditCard },
  { href: "/app/settings", label: "Settings", icon: Settings },
] as const;

function NavItems({
  pathname,
  onNavigate,
  cardCount,
}: {
  pathname: string;
  onNavigate?: () => void;
  cardCount?: number | null;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/app" ? pathname === "/app" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            to={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {label === "Library" && cardCount != null && cardCount > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  "ml-auto h-5 min-w-5 justify-center px-1.5 text-[10px] tabular-nums",
                  isActive && "bg-primary-foreground/20 text-primary-foreground",
                )}
              >
                {cardCount > 999 ? "999+" : cardCount}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function UsageDisplay() {
  const { usage, isLoading } = useUsage();

  if (isLoading) {
    return (
      <div className="space-y-2 px-3 py-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }

  if (!usage) return null;

  const { cards_generated, cards_limit, cards_remaining } = usage.usage;
  const pct = cards_limit > 0 ? Math.min(100, (cards_generated / cards_limit) * 100) : 0;

  return (
    <Link
      to="/app/billing"
      className="block rounded-md px-3 py-2 transition-colors hover:bg-accent"
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{cards_generated} / {cards_limit} cards</span>
        <span>{cards_remaining} left</span>
      </div>
      <Progress value={pct} className="mt-1.5 h-1.5" />
    </Link>
  );
}

function UserMenu() {
  const { user, signOut } = useAuthStore();
  const email = user?.email ?? "";
  const initials = email.substring(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-3 px-3">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm">{email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const cardCount = useCardCount();

  return (
    <div className="flex h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <img src="/logo.svg" alt="Memogenesis" className="h-7 w-7" />
            Memogenesis
          </Link>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto p-4">
          <NavItems pathname={pathname} cardCount={cardCount} />
        </div>
        <Separator />
        <div className="px-4 pt-3">
          <UsageDisplay />
        </div>
        <Separator />
        <div className="p-4">
          <UserMenu />
        </div>
      </aside>

      {/* Mobile header + content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b px-4 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-16 items-center px-6">
                <SheetTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
                  <img src="/logo.svg" alt="Memogenesis" className="h-7 w-7" />
                  Memogenesis
                </SheetTitle>
              </div>
              <Separator />
              <div className="flex-1 p-4">
                <NavItems
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                  cardCount={cardCount}
                />
              </div>
              <Separator />
              <div className="px-4 pt-3">
                <UsageDisplay />
              </div>
              <Separator />
              <div className="p-4">
                <UserMenu />
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/" className="flex items-center gap-2 text-lg font-bold">
            <img src="/logo.svg" alt="Memogenesis" className="h-7 w-7" />
            Memogenesis
          </Link>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
