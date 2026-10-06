import { SETTINGS_ID, Settings } from "@/core/models/system";
import type { Migration } from "@/core/db/migrations/types";

/** Adds defaults for the adaptive study-flow preferences to existing settings. */
export const migration: Migration = {
  id: "010-study-flow-settings",
  async up() {
    await Settings.updateOne(
      { _id: SETTINGS_ID },
      { $setOnInsert: { studyFlowRoadmaps: [], studyFlowCourses: false } },
      { upsert: true },
    );
  },
};
