import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/dal";
import { problems, topics } from "@/lib/content";

/** Search index for the ⌘K palette, loaded lazily on first open. */
export async function GET() {
  await requireSession();
  return NextResponse.json(
    {
      problems: problems.map((p) => ({ slug: p.slug, title: p.title, difficulty: p.difficulty, track: p.track })),
      topics: topics.map((t) => ({ id: t.id, title: t.title, track: t.track, week: t.week })),
    },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
