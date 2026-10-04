import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { Flame } from "lucide-react";
import { AiProvider } from "@/modules/ai/components/ai-context";
import { CaptureListener } from "@/modules/jobs/components/capture-listener";
import { LiveProvider } from "@/core/components/live/live-provider";
import { LiveRefresh } from "@/core/components/live/live-refresh";
import { HubTabs, MobileTabBar, TopBarTitle } from "@/components/layout/app-nav";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { SIDEBAR_COOKIE } from "@/components/layout/nav-items";
import { InstallHint } from "@/components/layout/install-hint";
import { NotificationBell, type BellItem } from "@/components/layout/notification-bell";
import { RouteProgress } from "@/components/layout/route-progress";
import { SessionBar } from "@/components/layout/session-bar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { requireSession } from "@/core/auth/dal";
import { timeAgo } from "@/modules/news/domain/news";
import { env } from "@/core/env";
import { resolveProviders } from "@/core/llm/providers";
import { formatDate } from "@/core/plan-clock";
import { getNavState } from "@/core/services/nav";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";
import { listNotifications } from "@/modules/notifications/services/notifications";
import { logout } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  // If MongoDB is unreachable the shell still renders, so /setup can say what is wrong instead of an opaque error.
  const loaded = await Promise.all([listNotifications(20), getNavState(), getSettings()]).catch(() => null);
  const [notes, nav, settings] = loaded ?? [{ items: [], unread: 0 }, { badges: {}, today: null }, null];
  const aiAvailable = resolveProviders(env()).length > 0;
  const now = new Date();
  const bellItems: BellItem[] = notes.items.map((n) => ({ ...n, age: timeAgo(new Date(n.createdAt), now) }));
  const sidebarCollapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";
  const todayLabel = settings ? formatDate(todayIn(settings, now), { weekday: "short", day: "numeric", month: "short" }) : "";

  return (
    <AiProvider links={settings?.geminiLinks ?? {}} aiAvailable={aiAvailable}>
    <LiveProvider>
    <CaptureListener />
    <LiveRefresh types={["notification", "capture"]} />
    <Suspense fallback={null}>
      <RouteProgress />
    </Suspense>
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:transition-[grid-template-columns] lg:duration-200 lg:has-[>aside[data-collapsed=true]]:grid-cols-[64px_minmax(0,1fr)] motion-reduce:transition-none">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <AppSidebar badges={nav.badges} today={nav.today} initialCollapsed={sidebarCollapsed} logout={logout} />

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-3 border-b bg-background/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur lg:px-8">
          <Link href="/dashboard" aria-label="PrepOS home" className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground lg:hidden">
            <Flame className="size-4" />
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <TopBarTitle />
            {todayLabel && <span className="hidden text-xs text-muted-foreground md:inline">· {todayLabel}</span>}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <CommandPalette />
            <NotificationBell items={bellItems} unread={notes.unread} />
            <ThemeToggle />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] outline-none sm:pt-6 lg:px-8 lg:pb-10 has-[[data-ide]]:max-w-none md:has-[[data-ide]]:pt-3 lg:has-[[data-ide]]:px-4 lg:has-[[data-ide]]:pb-3">
          <InstallHint />
          <HubTabs badges={nav.badges} />
          <SessionBar today={nav.today} badges={nav.badges} />
          {children}
        </main>
      </div>
      <MobileTabBar badges={nav.badges} today={nav.today} logout={logout} />
    </div>
    </LiveProvider>
    </AiProvider>
  );
}
