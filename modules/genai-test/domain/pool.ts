/** The question pool a test is drawn from. Pure types; core/genai-test.ts builds the pool from the content files. */

export interface McqQ {
  kind: "mcq";
  id: string;
  /** Playbook week this question belongs to (lesson questions only). */
  weekId?: string;
  level: number;
  node?: string;
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export interface WrittenQ {
  kind: "written";
  id: string;
  weekId?: string;
  level: number;
  node?: string;
  /** `${node}/${topicKey}` for a level question, so coverage can gate it. */
  topic?: string;
  q: string;
  /** What a strong answer covers. */
  points: string[];
  /** A model answer to compare against, or the lesson's key points. */
  reference: string;
}

export type PoolQ = McqQ | WrittenQ;
export interface Pool {
  mcq: McqQ[];
  written: WrittenQ[];
}

export interface QStat {
  right: number;
  wrong: number;
  /** YYYY-MM-DD of the last attempt. */
  last?: string;
  lastCorrect?: boolean;
}
