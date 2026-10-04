"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      className={className}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}

const OPTIONS = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "Device", icon: Monitor },
] as const;

/** Light / Dark / Device as three buttons, for the mobile "More" sheet (only rendered on the client, inside the sheet). */
export function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  return (
    <div role="group" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-xl border bg-muted p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={theme === o.id}
          onClick={() => setTheme(o.id)}
          className={cn(
            "flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            theme === o.id && "bg-card font-medium text-foreground shadow-xs",
          )}
        >
          <o.icon className="size-4" aria-hidden /> {o.label}
        </button>
      ))}
    </div>
  );
}
