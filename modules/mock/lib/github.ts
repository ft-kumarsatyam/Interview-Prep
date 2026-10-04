import "server-only";
import { fetchSafe } from "@/core/http-safe";
import { pLimit } from "@/core/http";
import { parseSiteHtml, pickFiles, type RepoMeta, type RepoRef, type SiteInfo, type TreeEntry } from "@/modules/mock/domain/project-brief";

/** The HTTP call, injectable so tests never touch the network. */
export type Get = (url: string, headers?: Record<string, string>) => Promise<{ status: number; text: string }>;

export const defaultGet: Get = async (url, headers) => {
  const res = await fetchSafe(url, { timeoutMs: 15_000, maxBytes: 2_500_000, ...(headers ? { headers } : {}) });
  return { status: res.status, text: res.text };
};

export class RepoReadError extends Error {}

const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";

const apiHeaders = (token?: string): Record<string, string> => ({ accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", ...(token ? { authorization: `Bearer ${token}` } : {}) });
const enc = (path: string) => path.split("/").map(encodeURIComponent).join("/");

function failure(status: number, what: string): RepoReadError {
  if (status === 404) return new RepoReadError("That repository wasn't found, or it's private. PrepOS can only read public repositories");
  if (status === 403 || status === 429) return new RepoReadError("GitHub's request limit was reached. Try again in a few minutes, or add a GITHUB_TOKEN to raise it");
  return new RepoReadError(`GitHub couldn't be read (${what}, HTTP ${status})`);
}

export interface RepoSnapshot {
  meta: RepoMeta;
  tree: TreeEntry[];
  files: Record<string, string>;
}

/** Reads a public repository: its details, its file list and the contents of the few files worth reading. */
export async function readRepo(ref: RepoRef, opts: { get?: Get; token?: string; maxFiles?: number } = {}): Promise<RepoSnapshot> {
  const get = opts.get ?? defaultGet;
  const headers = apiHeaders(opts.token);
  const repoRes = await get(`${API}/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`, headers);
  if (repoRes.status !== 200) throw failure(repoRes.status, "repository");
  let j: { full_name?: string; description?: string | null; language?: string | null; topics?: string[]; stargazers_count?: number; pushed_at?: string; default_branch?: string; private?: boolean };
  try {
    j = JSON.parse(repoRes.text);
  } catch {
    throw new RepoReadError("GitHub sent a reply PrepOS couldn't read");
  }
  if (j.private) throw failure(404, "repository");
  const branch = j.default_branch ?? "main";
  const meta: RepoMeta = { fullName: j.full_name ?? `${ref.owner}/${ref.repo}`, description: (j.description ?? "").slice(0, 300), language: j.language ?? "", topics: (j.topics ?? []).slice(0, 10), stars: j.stargazers_count ?? 0, pushedAt: j.pushed_at ?? new Date(0).toISOString(), defaultBranch: branch };

  const treeRes = await get(`${API}/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`, headers);
  if (treeRes.status !== 200) throw failure(treeRes.status, "file list");
  let treeJson: { tree?: Array<{ path?: string; type?: string; size?: number }> };
  try {
    treeJson = JSON.parse(treeRes.text);
  } catch {
    throw new RepoReadError("GitHub sent a file list PrepOS couldn't read");
  }
  const tree: TreeEntry[] = (treeJson.tree ?? []).filter((e) => e.type === "blob" && typeof e.path === "string").map((e) => ({ path: e.path!, size: e.size ?? 0 })).slice(0, 8000);
  if (tree.length === 0) throw new RepoReadError("That repository has no files to ask about yet");

  const wanted = pickFiles(tree, opts.maxFiles ?? 12);
  const limit = pLimit(4);
  const files: Record<string, string> = {};
  await Promise.all(
    wanted.map((path) =>
      limit(async () => {
        try {
          const res = await get(`${RAW}/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/${encodeURIComponent(branch)}/${enc(path)}`);
          if (res.status === 200 && res.text.length > 0) files[path] = res.text;
        } catch {
          // One unreadable file is fine: the brief just has less to say.
        }
      }),
    ),
  );
  return { meta, tree, files };
}

/** The live site's title, description and headings. Null when it can't be read; a missing site never blocks the interview. */
export async function readSite(url: string, get: Get = defaultGet): Promise<SiteInfo | null> {
  try {
    const res = await get(url, { accept: "text/html" });
    if (res.status !== 200) return null;
    const info = parseSiteHtml(res.text, url);
    return info.title || info.headings.length ? info : null;
  } catch {
    return null;
  }
}
