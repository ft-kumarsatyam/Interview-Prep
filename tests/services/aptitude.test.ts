import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Settings } from "@/lib/models/system";
import { drillQuestions, getAptitudeOverview, getTopicHistory, mockQuestions, recordAptitudeResults } from "@/lib/services/aptitude";
import { exportBackup } from "@/lib/services/export";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
});

const answers = (topic: string, correct: number, wrong: number, ms = 20_000) => [
  ...Array(correct).fill(null).map(() => ({ topic, correct: true, ms })),
  ...Array(wrong).fill(null).map(() => ({ topic, correct: false, ms })),
];

describe("aptitude sessions", () => {
  it("rolls answers up per topic and ignores unknown topics", async () => {
    const res = await recordAptitudeResults([...answers("percentage", 3, 1), ...answers("algebra", 1, 0), { topic: "nope", correct: true, ms: 1 }], "mock");
    expect(res.saved).toBe(2);
    const history = await getTopicHistory("percentage");
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ total: 4, correct: 3, totalMs: 80_000, mode: "mock" });
    expect(history[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("saves nothing when no known topic answered", async () => {
    expect((await recordAptitudeResults([{ topic: "nope", correct: true, ms: 5 }], "topic")).saved).toBe(0);
  });

  it("marks a topic mastered after 20 answers at 80%", async () => {
    await recordAptitudeResults(answers("percentage", 9, 1), "topic");
    expect((await getAptitudeOverview()).stats.percentage.status).toBe("practising");
    await recordAptitudeResults(answers("percentage", 8, 2), "topic");
    const overview = await getAptitudeOverview();
    expect(overview.stats.percentage).toMatchObject({ status: "mastered", attempted: 20, correct: 17 });
    expect(overview.stats.algebra.status).toBe("new");
    expect(overview.today).toEqual({ answered: 20, correct: 17 });
    expect(overview.totalAnswered).toBe(20);
  });

  it("is included in the backup export", async () => {
    await recordAptitudeResults(answers("ages", 2, 0), "topic");
    const backup = await exportBackup();
    expect(backup.collections.aptitudesessions).toHaveLength(1);
  });
});

describe("question builders", () => {
  it("serve a full drill and mock", () => {
    expect(drillQuestions("time-work", 5)).toHaveLength(10);
    expect(mockQuestions("verbal", 5).length).toBeGreaterThanOrEqual(8);
    expect(mockQuestions("logical", 5)).toHaveLength(20);
  });
});
