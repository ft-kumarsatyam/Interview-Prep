import { SPECS } from "@/core/api/specs";
import { v1Route } from "@/core/api/v1";
import { publish } from "@/core/realtime";
import type { ProfileCapture } from "@/modules/jobs/domain/jobs";
import { saveProfileSnapshot } from "@/modules/resume/services/resume";

export const maxDuration = 30;

export const POST = v1Route<ProfileCapture>(SPECS.createProfile, async ({ body }) => {
  const saved = await saveProfileSnapshot(body);
  await publish({ type: "capture", kind: "profile" });
  return { body: { id: saved.id } };
});
