export const FLAG_REASONS = ["wrong-answer", "unclear", "outdated", "other"] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];
