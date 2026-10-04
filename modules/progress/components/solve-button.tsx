"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SolveSheet, type SolveTarget } from "@/modules/progress/components/solve-sheet";

export function SolveButton({
  target,
  label,
  variant = "default",
  size = "lg",
}: {
  target: SolveTarget;
  label: string;
  variant?: "default" | "outline" | "secondary";
  size?: "lg" | "sm";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} className={size === "sm" ? "h-8" : undefined} onClick={() => setOpen(true)}>
        <Check /> {label}
      </Button>
      <SolveSheet target={open ? target : null} onOpenChange={setOpen} />
    </>
  );
}
