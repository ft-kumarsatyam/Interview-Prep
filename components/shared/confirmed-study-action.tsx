"use client";

import { useState } from "react";
import { Check, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rememberStudyAction } from "@/components/shared/study-action-state";

export function ConfirmedStudyAction({ href, title }: { href: string; title: string }) {
  const [selected, setSelected] = useState(false);
  const choose = () => {
    if (!window.confirm(`Make “${title}” your next focus task?`)) return;
    rememberStudyAction({ href, title });
    setSelected(true);
  };
  return (
    <Button type="button" variant={selected ? "outline" : "default"} size="sm" onClick={choose}>
      {selected ? <Check /> : <Play />} {selected ? "Focus task set" : "Focus this gap"}
    </Button>
  );
}
