export const STUDY_KINDS = ["dsa", "theory", "revision", "mock", "aptitude", "other"] as const;
export type StudyKind = (typeof STUDY_KINDS)[number];
