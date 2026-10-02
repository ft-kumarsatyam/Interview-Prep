import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuizPlayer } from "@/components/quiz/quiz-player";
import { maskOf } from "@/lib/domain/quiz";
import type { PublicQuestion, QuizOutcome } from "@/lib/quiz/question";

const submit = async () => ({ ok: false as const, error: "unused" });
const render = (questions: PublicQuestion[], extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(QuizPlayer, { questions, seed: 1, passPct: 60, submit, ...extra }));

const single: PublicQuestion = { id: "s", prompt: "Pick one", options: ["a", "b", "c", "d"] };
const multi: PublicQuestion = { id: "m", prompt: "Pick all that apply", options: ["a", "b", "c", "d", "e"], type: "multi" };
const tf: PublicQuestion = { id: "t", prompt: "A statement", options: ["True", "False"], type: "truefalse" };

describe("QuizPlayer question screen", () => {
  it("renders a single question as a radio group, as before", () => {
    const html = render([single]);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('role="radio"');
    expect(html).not.toContain("Select all that apply");
  });

  it("renders multi-select as checkboxes with an instruction and all options", () => {
    const html = render([multi]);
    expect(html).toContain('role="group"');
    expect(html.match(/role="checkbox"/g)).toHaveLength(5);
    expect(html).toContain("Select all that apply");
    expect(html).not.toContain('role="radio"');
  });

  it("renders true/false with both options, always in the same order", () => {
    for (const seed of [1, 2, 3, 99]) {
      const html = renderToStaticMarkup(createElement(QuizPlayer, { questions: [tf], seed, passPct: 60, submit }));
      expect(html.indexOf("True")).toBeGreaterThan(-1);
      expect(html.indexOf("True")).toBeLessThan(html.indexOf("False"));
    }
  });

  it("shows six keyboard hints for a six-option question", () => {
    const six: PublicQuestion = { id: "x", prompt: "Six", options: ["1", "2", "3", "4", "5", "6"], type: "multi" };
    expect(render([six]).match(/role="checkbox"/g)).toHaveLength(6);
  });
});

describe("QuizPlayer review screen", () => {
  const outcome = (review: QuizOutcome["review"], correct: number): QuizOutcome => ({ correct, total: review.length, pct: Math.round((correct / review.length) * 100), passed: false, review });

  it("lists every correct option for a missed multi-select question and what you chose", () => {
    const html = render([multi], {
      initial: {
        outcome: outcome([{ id: "m", type: "multi", answerIndex: 0, answerIndices: [0, 2, 4], explanation: "because" }], 0),
        answers: [maskOf([0, 1])],
      },
    });
    expect(html).toContain("Your answers:");
    expect(html).toContain("Correct answers:");
    expect(html).toContain("because");
    // chosen a, b; correct a, c, e
    expect(html.match(/<li/g)!.length).toBeGreaterThanOrEqual(5);
  });

  it("marks an exact multi-select match as correct with no 'Your answers' block", () => {
    const html = render([multi], {
      initial: { outcome: outcome([{ id: "m", type: "multi", answerIndex: 0, answerIndices: [0, 2], explanation: "" }], 1), answers: [maskOf([0, 2])] },
    });
    expect(html).not.toContain("Your answers:");
    expect(html).toContain("border-l-success");
  });

  it("handles single, multi and true/false in one review", () => {
    const html = render([single, multi, tf], {
      initial: {
        outcome: outcome(
          [
            { id: "s", answerIndex: 1, explanation: "" },
            { id: "m", type: "multi", answerIndex: 0, answerIndices: [0, 2], explanation: "" },
            { id: "t", type: "truefalse", answerIndex: 0, explanation: "" },
          ],
          2,
        ),
        answers: [1, maskOf([0, 2]), 1],
      },
    });
    expect(html.match(/border-l-success/g)).toHaveLength(2);
    expect(html.match(/border-l-destructive/g)).toHaveLength(1);
    expect(html).toContain("Your answer:");
  });

  it("shows (skipped) when nothing was chosen", () => {
    const html = render([multi], { initial: { outcome: outcome([{ id: "m", type: "multi", answerIndex: 0, answerIndices: [0, 2], explanation: "" }], 0), answers: [null] } });
    expect(html).toContain("(skipped)");
  });
});
