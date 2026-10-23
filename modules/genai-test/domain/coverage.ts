/**
 * How much of the syllabus you have covered. A topic is `${node}/${subtopicKey}`. It counts as covered when you ticked
 * it on the roadmap, marked its node done, or rated it "review" or "known" in the study notes. Pure.
 */

export interface LevelTopics {
  level: number;
  /** Every topic key of the level, as `${node}/${key}`. */
  topics: string[];
}

export interface NodeTicks {
  nodeId: string;
  checked: readonly number[];
  manualDone: boolean;
}

export interface CoverageStat {
  covered: number;
  expected: number;
  pct: number;
}

/** `nodeKeys` maps a node id to its checklist's topic keys in order, so a tick index becomes a key. */
export function coveredTopics(nodeKeys: ReadonlyMap<string, readonly string[]>, ticks: readonly NodeTicks[], rated: readonly { nodeId: string; key: string }[]): Set<string> {
  const out = new Set<string>();
  for (const t of ticks) {
    const keys = nodeKeys.get(t.nodeId) ?? [];
    if (t.manualDone) for (const k of keys) out.add(`${t.nodeId}/${k}`);
    for (const i of t.checked) if (keys[i]) out.add(`${t.nodeId}/${keys[i]}`);
  }
  for (const r of rated) out.add(`${r.nodeId}/${r.key}`);
  return out;
}

export function coverageStat(expected: ReadonlySet<string>, covered: ReadonlySet<string>): CoverageStat {
  let c = 0;
  for (const t of expected) if (covered.has(t)) c++;
  return { covered: c, expected: expected.size, pct: expected.size ? Math.round((100 * c) / expected.size) : 0 };
}

/** Topics a learner on the dated plan should have met by `weekIdx`: those of every level mapped to weeks 1..weekIdx. */
export function expectedTopics(levels: readonly LevelTopics[], weekLevels: readonly (readonly number[])[], weekIdx: number): Set<string> {
  const due = new Set<number>();
  for (let i = 0; i < Math.min(weekIdx, weekLevels.length); i++) for (const l of weekLevels[i]) due.add(l);
  const out = new Set<string>();
  for (const l of levels) if (due.has(l.level)) for (const t of l.topics) out.add(t);
  return out;
}

export function levelCoverage(levels: readonly LevelTopics[], covered: ReadonlySet<string>): Map<number, CoverageStat> {
  return new Map(levels.map((l) => [l.level, coverageStat(new Set(l.topics), covered)]));
}

export const nodeOf = (topic: string): string => topic.split("/")[0];
