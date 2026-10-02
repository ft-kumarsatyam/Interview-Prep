import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <h2 className="font-medium">{title}</h2>
      {children && <div className="mt-2 max-w-md text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

/** Placeholder for a page whose feature lands in a later build phase. */
export function ComingInPhase({ icon, title, phase, children }: { icon: LucideIcon; title: string; phase: number; children: React.ReactNode }) {
  return (
    <EmptyState icon={icon} title={title}>
      <p>{children}</p>
      <p className="mt-3 font-mono text-xs">Built in Phase {phase} · docs/BUILD_PLAN.md</p>
    </EmptyState>
  );
}
