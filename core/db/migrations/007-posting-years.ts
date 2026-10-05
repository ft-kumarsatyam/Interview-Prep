import { requiredYears } from "@/modules/jobs/domain/job-profile";
import type { Migration } from "@/core/db/migrations/types";

/** Fills `yearsMin` on postings stored before it existed, from the saved description. Shared collection, so no owner scope. */
export const migration: Migration = {
  id: "007-posting-years",
  async up({ models }) {
    const postings = models.find((entry) => entry.modelName === "JobPosting");
    if (!postings) return;
    const cursor = postings.find({ yearsMin: { $exists: false } }, { title: 1, jd: 1 }).lean().cursor();
    let batch: Array<{ updateOne: { filter: object; update: object } }> = [];
    for await (const row of cursor as AsyncIterable<{ _id: unknown; title?: string; jd?: string }>) {
      const years = requiredYears(`${row.title ?? ""}\n${row.jd ?? ""}`);
      batch.push({ updateOne: { filter: { _id: row._id }, update: { $set: { yearsMin: years } } } });
      if (batch.length >= 500) {
        await postings.bulkWrite(batch as never);
        batch = [];
      }
    }
    if (batch.length) await postings.bulkWrite(batch as never);
  },
};
