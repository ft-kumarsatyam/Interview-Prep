import { readFileSync } from "node:fs";
import { expect, type Locator, type Page } from "@playwright/test";

interface BankQ {
  prompt: string;
  options: string[];
  answerIndex: number;
  answerIndices?: number[];
  type?: string;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const BANK: BankQ[] = (JSON.parse(readFileSync("data/quiz-bank.json", "utf8")) as { questions: BankQ[] }).questions;
/** Questions by their set of options: the options are shuffled on screen, but the set is stable. */
const BY_OPTIONS = new Map<string, BankQ[]>();
for (const q of BANK) {
  const key = q.options.map(norm).toSorted().join("\u0000");
  BY_OPTIONS.set(key, [...(BY_OPTIONS.get(key) ?? []), q]);
}

/** The option texts on screen, without the "1", "2" key hint that precedes each. */
async function optionTexts(options: Locator): Promise<string[]> {
  const raw = await options.allInnerTexts();
  return raw.map((t) => norm(t.split("\n").slice(1).join(" ")));
}

/**
 * Answers the question on screen correctly, using the bank as the answer key, and returns false if it is not in the bank
 * (an AI-written question), so the caller can fall back. Works for single choice and "select all that apply".
 */
export async function answerCorrectly(page: Page): Promise<boolean> {
  const options = page.getByRole("radio").or(page.getByRole("checkbox"));
  await expect(options.first()).toBeVisible();
  const texts = await optionTexts(options);
  const pageText = norm(await page.locator("main").innerText());
  const candidates = BY_OPTIONS.get([...texts].toSorted().join("\u0000")) ?? [];
  const q = candidates.find((c) => pageText.includes(norm(c.prompt))) ?? candidates[0];
  if (!q) return false;
  const correct = (q.type === "multi" && q.answerIndices ? q.answerIndices : [q.answerIndex]).map((i) => norm(q.options[i]!));
  for (const [i, t] of texts.entries()) if (correct.includes(t)) await options.nth(i).click();
  return true;
}

/** Answers the question on screen wrongly (the first option that is not correct), so a run can be failed on purpose. */
export async function answerWrongly(page: Page): Promise<void> {
  const options = page.getByRole("radio").or(page.getByRole("checkbox"));
  await expect(options.first()).toBeVisible();
  const texts = await optionTexts(options);
  const pageText = norm(await page.locator("main").innerText());
  const candidates = BY_OPTIONS.get([...texts].toSorted().join("\u0000")) ?? [];
  const q = candidates.find((c) => pageText.includes(norm(c.prompt))) ?? candidates[0];
  const correct = q ? (q.type === "multi" && q.answerIndices ? q.answerIndices : [q.answerIndex]).map((i) => norm(q.options[i]!)) : [];
  const wrong = texts.findIndex((t) => !correct.includes(t));
  await options.nth(wrong === -1 ? 0 : wrong).click();
}
