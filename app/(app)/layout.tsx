import Link from "next/link";
import { Flame, LogOut } from "lucide-react";
import { MobileTabBar, SidebarNav } from "@/components/layout/app-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { NotificationBell, type BellItem } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/dal";
import { timeAgo } from "@/lib/domain/news";
import { getNavBadges } from "@/lib/services/nav";
import { listNotifications } from "@/lib/services/notifications";
import { logout } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  const [notes, badges] = await Promise.all([listNotifications(20), getNavBadges()]);
  const now = new Date();
  const bellItems: BellItem[] = notes.items.map((n) => ({ ...n, age: timeAgo(new Date(n.createdAt), now) }));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-sidebar p-4 lg:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Flame className="size-4" />
          </span>
          PrepOS
        </Link>
        <SidebarNav badges={badges} />
        <form action={logout} className="mt-auto">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" type="submit">
            <LogOut /> Sign out
          </Button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold lg:hidden">
            <Flame className="size-5 text-primary" /> PrepOS
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <CommandPalette />
            <NotificationBell items={bellItems} unread={notes.unread} />
            <ThemeToggle />
            <form action={logout} className="lg:hidden">
              <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
                <LogOut />
              </Button>
            </form>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-[1200px] flex-1 px-4 pt-6 pb-24 lg:px-8 lg:pb-10">{children}</main>
      </div>
      <MobileTabBar badges={badges} />
    </div>
  );
}
