import { readThrough } from "@/core/cache";
import { CACHE_POLICY } from "@/core/cache/policy";
import { createHash } from "node:crypto";
import { env } from "@/core/env";
import { runAi } from "@/modules/ai/services/ai";
import type { BankPrompt } from "@/modules/mock/domain/mock-bank";
import { buildBrief, groundQuestions, isPublicSiteUrl, parseRepoUrl, projectQuestionSetSchema, projectQuestionsPrompt, type ProjectBrief } from "@/modules/mock/domain/project-brief";
import { readRepo, readSite, RepoReadError, type Get } from "@/modules/mock/lib/github";

export const PROJECT_QUESTIONS = { technical: 3, behavioral: 2 } as const;

export type ReadProjectResult = { ok: true; brief: ProjectBrief; siteRead: boolean; siteSkipped: string | null } | { ok: false; error: string };

/**
 * Reads a public GitHub repository (and optionally its live site) into a project brief. Cached for six hours so
 * previewing and then starting the interview reads GitHub once. Only public repositories; secrets are stripped.
 */
export async function readProject(input: { repoUrl: string; siteUrl?: string }, deps: { get?: Get } = {}): Promise<ReadProjectResult> {
  const ref = parseRepoUrl(input.repoUrl);
  if (!ref) return { ok: false, error: "Paste the link of a public GitHub repository, like https://github.com/you/your-project" };
  const siteUrl = input.siteUrl?.trim() || undefined;
  if (siteUrl && !isPublicSiteUrl(siteUrl)) return { ok: false, error: "The website must be a public https link" };

  const key = createHash("sha256").update(`${ref.owner}/${ref.repo}\u0000${siteUrl ?? ""}`).digest("hex").slice(0, 24);
  try {
    const load = async () => {
      const snap = await readRepo(ref, { ...(deps.get ? { get: deps.get } : {}), ...(env().GITHUB_TOKEN ? { token: env().GITHUB_TOKEN } : {}) });
      const site = siteUrl ? await readSite(siteUrl, deps.get) : null;
      return { brief: buildBrief({ meta: snap.meta, tree: snap.tree, files: snap.files, site }), siteRead: Boolean(site) };
    };
    // The test seam (an injected fetcher) skips the cache so tests stay independent.
    const policy = CACHE_POLICY.publicProject;
    const loaded = deps.get ? await load() : await readThrough(policy.scope, key, load, policy);
    return { ok: true, brief: loaded.brief, siteRead: loaded.siteRead, siteSkipped: siteUrl && !loaded.siteRead ? "The website couldn't be read, so questions come from the code only" : null };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof RepoReadError ? err.message : "The project couldn't be read. Check the link and try again" };
  }
}

export type ProjectPromptsResult = { ok: true; prompts: BankPrompt[]; dropped: number } | { ok: false; error: string };

/**
 * Asks the model for technical and behavioral questions about the project. Technical ones must cite files or technologies
 * that really exist in the repository, so anything invented is dropped. Fails (rather than quietly asking generic
 * questions) when too few grounded questions remain.
 */
export async function projectPrompts(brief: ProjectBrief, counts: { technical: number; behavioral: number } = PROJECT_QUESTIONS): Promise<ProjectPromptsResult> {
  const res = await runAi("generate-questions", {}, (llm) => llm.generateJson(projectQuestionsPrompt(brief, counts), projectQuestionSetSchema));
  if (!res.ok) return { ok: false, error: res.unavailable ? "Add a Gemini or Groq key to generate questions about your project" : res.error };
  const grounded = groundQuestions(res.data.questions, brief, counts);
  const technical = grounded.questions.filter((q) => q.kind === "technical").length;
  if (technical < 2 || grounded.questions.length < 3) return { ok: false, error: "The model couldn't write enough questions tied to your code. Try again, or pick a repository with more source files" };
  return {
    ok: true,
    dropped: grounded.dropped,
    prompts: grounded.questions.map((q, i) => ({
      id: `proj${i}`,
      prompt: q.prompt,
      points: q.points,
      topic: q.kind === "behavioral" ? "behavioral" : "project",
      ...(q.evidence.length ? { context: `About your project ${brief.name}: ${q.evidence.join(", ")}` } : {}),
    })),
  };
}
