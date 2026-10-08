import { companyDataset, dsaLadders, dsaSheets, externalDsaSheets, popularDsaSheets, problemBySlug, problems } from "@/core/content";
import { attachCompanyTags } from "@/modules/dsa/domain/company-tags";
import type { ExternalQuestion, ExternalSheet } from "@/modules/dsa/domain/external-catalogue";
import { contentSheetAsExternal, packageSheet, patternSheet, type SheetGroup } from "@/modules/dsa/domain/sheet-hub";

export interface HubSheet {
  sheet: ExternalSheet;
  group: SheetGroup;
}

const BUILT_ON = companyDataset.source.importedAt;

/** Every sheet the hub lists, in display order. Built once per server process from static content. */
export const hubSheets: readonly HubSheet[] = [
  ...externalDsaSheets.map((sheet) => ({ sheet, group: "Popular sheets" as const })),
  ...popularDsaSheets.map((sheet) => ({ sheet, group: "Popular sheets" as const })),
  ...dsaSheets.map((sheet) => ({ sheet: contentSheetAsExternal(sheet, problemBySlug, BUILT_ON), group: "Popular sheets" as const })),
  { sheet: patternSheet(problemBySlug, BUILT_ON), group: "Pattern and ladder sheets" as const },
  ...dsaLadders.map((sheet) => ({ sheet, group: "Pattern and ladder sheets" as const })),
  { sheet: packageSheet(problems, companyDataset, BUILT_ON), group: "Company and package sheets" as const },
];

const byId = new Map(hubSheets.map((entry) => [entry.sheet.id, entry]));
const questionById = new Map<string, ExternalQuestion>(hubSheets.flatMap((entry) => entry.sheet.questions.map((q) => [q.id, q] as const)));

export function hubSheet(id: string): HubSheet | undefined {
  return byId.get(id);
}

/** A sheet row by id, for ticking it done from any sheet. */
export function hubQuestion(itemId: string): ExternalQuestion | undefined {
  return questionById.get(itemId);
}

const tagged = new Map<string, ExternalSheet>();

/** One sheet with dataset company tags on every row that maps to a LeetCode problem (memoised: content is static). */
export function taggedSheet(sheet: ExternalSheet): ExternalSheet {
  let out = tagged.get(sheet.id);
  if (!out) {
    out = { ...sheet, questions: sheet.questions.map((question) => attachCompanyTags(question, problems, companyDataset)) };
    tagged.set(sheet.id, out);
  }
  return out;
}
