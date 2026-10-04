export const TONE = { good: "text-success", ok: "text-warning", low: "text-destructive", neutral: "text-foreground" } as const;
export const BAR = { good: "[&>div]:bg-success", ok: "[&>div]:bg-warning", low: "[&>div]:bg-destructive", neutral: "" } as const;
export const STATUS = {
  upcoming: ["Upcoming", "bg-muted text-muted-foreground"],
  active: ["This week", "bg-primary/12 text-primary"],
  completed: ["Completed", "bg-success/12 text-success"],
  behind: ["Missed items rolled forward", "bg-warning/12 text-warning"],
} as const;
export const KIND_LABEL = { study: "Study", sunday: "Review", rest: "Rest", revision: "Revision", outside: "Outside plan" } as const;
export const CHANGE_LABEL = {
  goals: "Goals",
  availability: "Availability",
  "rest-days": "Rest days",
  "plan-window": "Plan window",
  "replan-hours": "Re-plan",
  "carry-over": "Carried over",
  intake: "Intake",
  rebalance: "Rebalance",
  reset: "Reset",
  restore: "Restored",
} as const;
