import { bumpVersion } from "@/core/cache";
import { connectDb } from "@/core/db";
import { JobProfileModel } from "@/core/models/job-profiles";
import { jobProfileSchema, MAX_PROFILES, type JobProfile } from "@/modules/jobs/domain/job-profile";
import type { JobPrefs } from "@/modules/jobs/domain/job-match";

export interface StoredProfile extends JobProfile {
  id: string;
}

const isId = (id: string) => /^[a-f0-9]{24}$/i.test(id);

function toProfile(doc: Record<string, unknown> & { _id: unknown }): StoredProfile | null {
  const parsed = jobProfileSchema.safeParse(doc);
  return parsed.success ? { id: String(doc._id), ...parsed.data } : null;
}

export async function listProfiles(): Promise<StoredProfile[]> {
  await connectDb();
  const rows = await JobProfileModel.find({}).sort({ createdAt: 1 }).limit(MAX_PROFILES).lean();
  return rows.flatMap((r) => toProfile(r as never) ?? []);
}

export async function getProfile(id: string): Promise<StoredProfile | null> {
  if (!isId(id)) return null;
  await connectDb();
  const row = await JobProfileModel.findById(id).lean();
  return row ? toProfile(row as never) : null;
}

/** Creates (no id) or updates a profile. Names are unique per owner and there is a small cap. */
export async function saveProfile(id: string | null, input: unknown): Promise<StoredProfile> {
  const data = jobProfileSchema.parse(input);
  await connectDb();
  if (id) {
    if (!isId(id)) throw new Error("Unknown profile");
    const res = await JobProfileModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean().catch(duplicate);
    if (!res) throw new Error("Unknown profile");
    await bumpVersion("jobs");
    return toProfile(res as never)!;
  }
  if ((await JobProfileModel.countDocuments({})) >= MAX_PROFILES) throw new Error(`You can keep up to ${MAX_PROFILES} profiles`);
  const created = await JobProfileModel.create(data).catch(duplicate);
  await bumpVersion("jobs");
  return toProfile(created.toObject() as never)!;
}

export async function deleteProfile(id: string): Promise<void> {
  if (!isId(id)) throw new Error("Unknown profile");
  await connectDb();
  await JobProfileModel.deleteOne({ _id: id });
  await bumpVersion("jobs");
}

/** First profile from your existing job preferences, so nothing has to be retyped. */
export async function createFromPrefs(prefs: JobPrefs): Promise<StoredProfile> {
  return saveProfile(null, { ...prefs, name: prefs.roles[0] ? `${prefs.roles[0]}`.slice(0, 40) : "My search" });
}

function duplicate(err: unknown): never {
  if ((err as { code?: number } | null)?.code === 11000) throw new Error("You already have a profile with that name");
  throw err;
}
