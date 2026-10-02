"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SolveSheet, type SolveTarget } from "./solve-sheet";

export function SolveButton({ target, label, variant = "default" }: { target: SolveTarget; label: string; variant?: "default" | "outline" | "secondary" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size="lg" onClick={() => setOpen(true)}>
        <Check /> {label}
      </Button>
      <SolveSheet target={open ? target : null} onOpenChange={setOpen} />
    </>
  );
}
