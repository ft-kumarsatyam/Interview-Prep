import { describe, expect, it } from "vitest";
import { filterQuestions, interviewProblems, interviewStats, practiceOrder, type InterviewFile, type InterviewStatus } from "@/modules/learn/domain/web-interview";

const answer = "**Short answer.** " + "Detail. ".repeat(50);
const q = (id: string, level: "junior" | "mid" | "senior", text: string, extra: Partial<InterviewFile["questions"][number]> = {}) => ({ id, level, q: text, answer, followUps: [], mistakes: ["m"], ...extra });

describe("interviewProblems", () => {
  const file = (id: string, questions: InterviewFile["questions"]): InterviewFile => ({ track: { id, name: id, blurb: "a track blurb", area: "frontend" }, questions });

  it("is empty for a consistent bank", () => {
    expect(interviewProblems([file("a", [q("a-1", "junior", "What is one?", { lesson: "l1" })]), file("b", [q("b-1", "mid", "What is one?")])], new Set(["l1"]))).toEqual([]);
  });

  it("flags duplicate ids, duplicate questions in a track, unknown lessons and raw HTML", () => {
    const problems = interviewProblems(
      [
        file("a", [q("a-1", "junior", "Same question?"), q("a-1", "mid", "same question?"), q("a-2", "senior", "Other?", { lesson: "nope", answer: answer + " <script>x</script>" })]),
        file("a", []),
      ],
      new Set(),
    );
    expect(problems).toEqual(expect.arrayContaining(["duplicate track a", "duplicate question id a-1", 'a: duplicate question "same question?"', "a-2: unknown lesson nope", "a-2: raw HTML in answer"]));
  });

  it("allows HTML inside code fences", () => {
    expect(interviewProblems([file("a", [q("a-1", "junior", "Q?", { answer: answer + "\n```html\n<script defer src=\"x.js\"></script>\n```" })])], new Set())).toEqual([]);
  });
});

describe("stats and filters", () => {
  const qs = [q("a", "junior", "Event loop basics", { answer: answer + " microtask" }), q("b", "mid", "Closures"), q("c", "senior", "Raft leader election")];
  const status = new Map<string, InterviewStatus>([["a", "known"], ["b", "review"]]);

  it("counts known, review and new", () => {
    expect(interviewStats(qs, status)).toEqual({ total: 3, known: 1, review: 1, fresh: 1, pct: 33 });
    expect(interviewStats([], status).pct).toBe(0);
  });

  it("filters by level, status and every search term across question and answer", () => {
    expect(filterQuestions(qs, status, { level: "mid" }).map((x) => x.id)).toEqual(["b"]);
    expect(filterQuestions(qs, status, { status: "new" }).map((x) => x.id)).toEqual(["c"]);
    expect(filterQuestions(qs, status, { search: "event MICROTASK" }).map((x) => x.id)).toEqual(["a"]);
    expect(filterQuestions(qs, status, { search: "event raft" })).toEqual([]);
    expect(filterQuestions(qs, status, { level: "all", status: "all", search: "  " })).toHaveLength(3);
  });
});

describe("practiceOrder", () => {
  const ids = ["k1", "n1", "r1", "k2", "n2", "r2"];
  const status = new Map<string, InterviewStatus>([["k1", "known"], ["k2", "known"], ["r1", "review"], ["r2", "review"]]);

  it("puts review first, then new, then known", () => {
    const order = practiceOrder(ids, status, 42);
    expect(order.slice(0, 2).toSorted()).toEqual(["r1", "r2"]);
    expect(order.slice(2, 4).toSorted()).toEqual(["n1", "n2"]);
    expect(order.slice(4).toSorted()).toEqual(["k1", "k2"]);
  });

  it("is stable for a seed and keeps every id once", () => {
    expect(practiceOrder(ids, status, 7)).toEqual(practiceOrder(ids, status, 7));
    expect(practiceOrder(ids, new Map(), 7).toSorted()).toEqual(ids.toSorted());
  });
});
