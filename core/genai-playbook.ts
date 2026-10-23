/**
 * Typed access to data/genai-playbook (the Oct 26 2026 - Mar 31 2027 GenAI interview playbook schedule).
 */
import planJson from "@/data/genai-playbook/plan.json";
import sourceMapJson from "@/data/genai-playbook/source-map.json";
import { planSchema, sourceMapSchema, type Plan, type SourceMap } from "@/modules/genai-playbook/domain/schemas";

/** Parsed through the schema so a bad file fails loudly. */
export const genaiPlaybookPlan: Plan = planSchema.parse(planJson);

/** Source-to-lesson mapping and curriculum coverage matrix (see data/genai-playbook/ATTRIBUTION.md). */
export const genaiPlaybookSourceMap: SourceMap = sourceMapSchema.parse(sourceMapJson);
