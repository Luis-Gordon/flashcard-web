import { Link, Outlet, useLocation } from "react-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
}: {
  pathname: string;
  onNavigate?: () => void;
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
          </Link>
        );
      })}
    </nav>
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

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center px-6">
          <Link to="/" className="text-lg font-bold tracking-tight">
            Memogenesis
          </Link>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto p-4">
          <NavItems pathname={pathname} />
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
                <SheetTitle className="text-lg font-bold tracking-tight">
                  Memogenesis
                </SheetTitle>
              </div>
              <Separator />
              <div className="flex-1 p-4">
                <NavItems
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
              <Separator />
              <div className="p-4">
                <UserMenu />
              </div>
            </SheetContent>
          </Sheet>
          <span className="text-lg font-bold">Memogenesis</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
