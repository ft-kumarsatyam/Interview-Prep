import Link from "next/link";
import { Flame, LogOut } from "lucide-react";
import { AiProvider } from "@/components/ai/ai-context";
import { MobileTabBar, SidebarNav, TodayMiniCard, TopBarTitle } from "@/components/layout/app-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { InstallHint } from "@/components/layout/install-hint";
import { NotificationBell, type BellItem } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/dal";
import { timeAgo } from "@/lib/domain/news";
import { env } from "@/lib/env";
import { resolveProviders } from "@/lib/llm/providers";
import { formatDate } from "@/lib/plan-clock";
import { getNavState } from "@/lib/services/nav";
import { todayIn } from "@/lib/services/plan";
import { getSettings } from "@/lib/services/settings";
import { listNotifications } from "@/lib/services/notifications";
import { logout } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  const [notes, nav, settings] = await Promise.all([listNotifications(20), getNavState(), getSettings()]);
  const aiAvailable = resolveProviders(env()).length > 0;
  const now = new Date();
  const bellItems: BellItem[] = notes.items.map((n) => ({ ...n, age: timeAgo(new Date(n.createdAt), now) }));
  const todayLabel = formatDate(todayIn(settings, now), { weekday: "short", day: "numeric", month: "short" });

  return (
    <AiProvider links={settings.geminiLinks} aiAvailable={aiAvailable}>
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh flex-col gap-4 overflow-y-auto border-r bg-sidebar p-4 lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2 px-2 text-lg font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Flame className="size-4" />
          </span>
          PrepOS
        </Link>
        <SidebarNav badges={nav.badges} />
        <div className="mt-auto space-y-2">
          <TodayMiniCard today={nav.today} />
          <form action={logout}>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground" type="submit">
              <LogOut /> Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-3 border-b bg-background/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur lg:px-8">
          <Link href="/dashboard" aria-label="PrepOS home" className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground lg:hidden">
            <Flame className="size-4" />
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <TopBarTitle />
            <span className="hidden text-xs text-muted-foreground md:inline">· {todayLabel}</span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <CommandPalette />
            <NotificationBell items={bellItems} unread={notes.unread} />
            <ThemeToggle />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] outline-none sm:pt-6 lg:px-8 lg:pb-10 has-[[data-ide]]:max-w-none md:has-[[data-ide]]:pt-3 lg:has-[[data-ide]]:px-4 lg:has-[[data-ide]]:pb-3">
          <InstallHint />
          {children}
        </main>
      </div>
      <MobileTabBar badges={nav.badges} today={nav.today} logout={logout} />
    </div>
    </AiProvider>
  );
}
