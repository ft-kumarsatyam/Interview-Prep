import practiceCasesJson from "@/data/os-dbms-cases.json";
import systemDesignJson from "@/data/system-design.json";
import type { DesignBlock, DesignCase, DesignStep, PracticeCase } from "@/core/content/types";

export const systemDesign = {
  framework: systemDesignJson.framework as {
    steps: DesignStep[];
    latency: Array<{ label: string; value: string }>;
    numbers: Array<{ label: string; value: string }>;
    rubric: Array<{ id: string; label: string }>;
  },
  blocks: systemDesignJson.blocks as DesignBlock[],
  cases: systemDesignJson.cases as DesignCase[],
};
export const designCaseBySlug = new Map(systemDesign.cases.map((c) => [c.slug, c]));
export const designBlockById = new Map(systemDesign.blocks.map((b) => [b.id, b]));

export const practiceCases = (practiceCasesJson as { cases: PracticeCase[] }).cases;
export const practiceCaseBySlug = new Map(practiceCases.map((c) => [`${c.kind}:${c.slug}`, c]));
