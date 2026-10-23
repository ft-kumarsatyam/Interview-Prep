import "server-only";

import wiA11y from "@/data/web-interview/a11y.json";
import wiFeTesting from "@/data/web-interview/fe-testing.json";
import wiStateData from "@/data/web-interview/state-data.json";
import wiHttpApis from "@/data/web-interview/http-apis.json";
import wiAuthSecurity from "@/data/web-interview/auth-security.json";
import wiCachingQueues from "@/data/web-interview/caching-queues.json";
import wiCloudDevops from "@/data/web-interview/cloud-devops.json";
import wiObservability from "@/data/web-interview/observability.json";
import wiSdCases from "@/data/web-interview/sd-cases.json";
import wiMlFoundations from "@/data/web-interview/ml-foundations.json";
import wiLlmEvalsOps from "@/data/web-interview/llm-evals-ops.json";
import wiAgents from "@/data/web-interview/agents.json";
import wiHtmlCss from "@/data/web-interview/html-css.json";
import wiBrowserJs from "@/data/web-interview/browser-js.json";
import wiTypescript from "@/data/web-interview/typescript.json";
import wiReact from "@/data/web-interview/react.json";
import wiNext from "@/data/web-interview/nextjs.json";
import wiNode from "@/data/web-interview/node.json";
import wiHttp from "@/data/web-interview/http.json";
import wiSecurity from "@/data/web-interview/security.json";
import wiPerf from "@/data/web-interview/perf.json";
import wiQuality from "@/data/web-interview/quality.json";
import wiSql from "@/data/web-interview/sql.json";
import wiMongo from "@/data/web-interview/mongo.json";
import wiDistdb from "@/data/web-interview/distdb.json";
import wiArch from "@/data/web-interview/arch.json";
import wiFeCore from "@/data/web-interview/fe-core.json";
import wiFeScale from "@/data/web-interview/fe-scale.json";
import wiFeSd from "@/data/web-interview/fe-sd.json";
import wiLlm from "@/data/web-interview/llm.json";
import wiRag from "@/data/web-interview/rag.json";
import wiGenaiEng from "@/data/web-interview/genai-eng.json";
import wiGenaiSprint from "@/data/web-interview/genai-sprint.json";
import type { InterviewFile, TrackedQuestion } from "@/modules/learn/domain/web-interview";

export const interviewFiles = [
  wiHtmlCss, wiBrowserJs, wiFeCore, wiTypescript, wiA11y, wiReact, wiNext, wiStateData, wiPerf, wiFeTesting, wiFeScale, wiFeSd,
  wiHttp, wiHttpApis, wiNode, wiSql, wiMongo, wiAuthSecurity, wiSecurity, wiCachingQueues, wiDistdb, wiQuality,
  wiArch, wiSdCases, wiCloudDevops, wiObservability,
  wiMlFoundations, wiLlm, wiRag, wiGenaiEng, wiGenaiSprint, wiAgents, wiLlmEvalsOps,
] as InterviewFile[];
export const interviewTracks = interviewFiles.map((f) => f.track);
export const interviewQuestions: TrackedQuestion[] = interviewFiles.flatMap((f) => f.questions.map((q) => ({ ...q, track: f.track.id })));
export const interviewQuestionById = new Map(interviewQuestions.map((q) => [q.id, q]));
