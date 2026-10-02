/**
 * Hand-written multi-select and true/false questions (scripts/quiz-bank/formats.json).
 * `ref` is a subtopic id (`${topicId}:${index}`). Multi-select options keep their
 * authored order; `answers` are ascending option indices. These are verified by
 * hand/review, not run, so keep them conservative and well established.
 */
import formatsJson from "./formats.json";

export type FormatQuestion =
  | { type: "multi"; ref: string; prompt: string; options: string[]; answers: number[]; explanation: string }
  | { type: "truefalse"; ref: string; prompt: string; answer: boolean; explanation: string };

export const FORMAT_QUESTIONS = formatsJson.questions as FormatQuestion[];
