import "server-only";

import webdevJson from "@/data/webdev.json";
import webFeCore from "@/data/webdev/fe-core.json";
import webFeScale from "@/data/webdev/fe-scale.json";
import webFeSd from "@/data/webdev/fe-sd.json";
import webLlm from "@/data/webdev/llm.json";
import webRag from "@/data/webdev/rag.json";
import webGenaiEng from "@/data/webdev/genai-eng.json";
import webHtmlCss from "@/data/webdev/html-css.json";
import webTypescript from "@/data/webdev/typescript.json";
import webA11y from "@/data/webdev/a11y.json";
import webFeTesting from "@/data/webdev/fe-testing.json";
import webStateData from "@/data/webdev/state-data.json";
import webHttpApis from "@/data/webdev/http-apis.json";
import webAuthSecurity from "@/data/webdev/auth-security.json";
import webCachingQueues from "@/data/webdev/caching-queues.json";
import webCloudDevops from "@/data/webdev/cloud-devops.json";
import webObservability from "@/data/webdev/observability.json";
import webSdCases from "@/data/webdev/sd-cases.json";
import webMlFoundations from "@/data/webdev/ml-foundations.json";
import webLlmEvalsOps from "@/data/webdev/llm-evals-ops.json";
import webAgents from "@/data/webdev/agents.json";
import webReactMore from "@/data/webdev/react-more.json";
import webNextjsMore from "@/data/webdev/nextjs-more.json";
import webNodeMore from "@/data/webdev/node-more.json";
import webSqlMore from "@/data/webdev/sql-more.json";
import webMongoMore from "@/data/webdev/mongo-more.json";
import webDistdbMore from "@/data/webdev/distdb-more.json";
import webArchMore from "@/data/webdev/arch-more.json";
import webLlmMore from "@/data/webdev/llm-more.json";
import webRagMore from "@/data/webdev/rag-more.json";
import webGenaiEngMore from "@/data/webdev/genai-eng-more.json";
import type { WebLesson, WebProject, WebTrack } from "@/modules/learn/domain/webdev";

type WebdevFile = { tracks: WebTrack[]; lessons: WebLesson[]; projects: WebProject[] };
const webdevFiles = [
  webdevJson, webFeCore, webFeScale, webFeSd, webLlm, webRag, webGenaiEng,
  webHtmlCss, webTypescript, webA11y, webFeTesting, webStateData, webHttpApis, webAuthSecurity, webCachingQueues,
  webCloudDevops, webObservability, webSdCases, webMlFoundations, webLlmEvalsOps, webAgents,
  webReactMore, webNextjsMore, webNodeMore, webSqlMore, webMongoMore, webDistdbMore, webArchMore, webLlmMore, webRagMore, webGenaiEngMore,
] as unknown as WebdevFile[];

const WEB_TRACK_ORDER = [
  "fe-core", "html-css", "typescript", "a11y", "react", "nextjs", "state-data", "fe-testing", "fe-scale", "fe-sd",
  "http-apis", "node", "sql", "mongo", "auth-security", "caching-queues", "distdb",
  "arch", "sd-cases", "cloud-devops", "observability",
  "ml-foundations", "llm", "rag", "genai-eng", "agents", "llm-evals-ops",
];
const trackRank = (id: string) => (WEB_TRACK_ORDER.indexOf(id) + 1 || WEB_TRACK_ORDER.length + 1);

export const webTracks = webdevFiles.flatMap((f) => f.tracks).toSorted((a, b) => trackRank(a.id) - trackRank(b.id));
export const webLessons = webdevFiles.flatMap((f) => f.lessons).toSorted((a, b) => trackRank(a.track) - trackRank(b.track));
export const webLessonById = new Map(webLessons.map((l) => [l.id, l]));
export const webProjects = webdevFiles.flatMap((f) => f.projects);
export const webProjectBySlug = new Map(webProjects.map((p) => [p.slug, p]));
