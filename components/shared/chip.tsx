import { cn } from "@/core/utils";

/** The chip look as a class string, for chips that are links (`aria-current`) rather than toggle buttons. */
export function chipClass(pressed: boolean, className?: string) {
  return cn(
    "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11",
    pressed ? "border-primary/40 bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
    className,
  );
}

/**
 * A toggle chip for filters and options (aria-pressed). Use inside `role="group"` with an aria-label.
 * Prefer shadcn Tabs when the choices switch a whole view.
 */
export function Chip({
  pressed,
  onClick,
  children,
  className,
  count,
  ...rest
}: Omit<React.ComponentProps<"button">, "onClick" | "type"> & { pressed: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={chipClass(pressed, className)}
      {...rest}
    >
      {children}
      {count !== undefined && <span className="tabular font-mono text-2xs opacity-80">{count}</span>}
    </button>
  );
}
