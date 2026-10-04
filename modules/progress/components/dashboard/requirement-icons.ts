import { BookOpen, Code2, ListChecks, Lock, Newspaper, type LucideIcon } from "lucide-react";
import type { RequirementIcon } from "@/modules/progress/domain/dashboard-view";

export const REQUIREMENT_ICONS: Record<RequirementIcon, LucideIcon> = {
  dsa: Code2,
  theory: BookOpen,
  quiz: ListChecks,
  "quiz-locked": Lock,
  read: Newspaper,
};
