import "server-only";

import testcasesJson from "@/data/dsa-testcases.json";
import { normaliseHints, type HintLevel } from "@/modules/dsa/domain/dsa-runner";
import type { ProblemTestcaseEntry } from "@/core/content/types";

type RawTestcaseEntry = Omit<ProblemTestcaseEntry, "hints"> & { hints: Array<string | HintLevel> };

function loadTestcases(raw: Record<string, RawTestcaseEntry>): Map<string, ProblemTestcaseEntry> {
  return new Map(Object.entries(raw).map(([slug, e]) => [slug, { ...e, hints: normaliseHints(e.hints) }]));
}

export const testcaseBySlug = loadTestcases(testcasesJson as unknown as Record<string, RawTestcaseEntry>);
