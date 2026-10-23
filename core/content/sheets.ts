import "server-only";

import sheetsJson from "@/data/dsa-sheets.json";
import cheatSheetsJson from "@/data/dsa-cheat-sheets.json";
import externalCatalogueJson from "@/data/dsa-external.json";
import laddersJson from "@/data/dsa-ladders.json";
import popularSheetsJson from "@/data/dsa-popular-sheets.json";
import companyTagsJson from "@/data/dsa-company-tags.json";
import externalResourcesJson from "@/data/external-resources.json";
import type { ContentSheet } from "@/core/content/types";
import { cheatSheetsSchema, type CheatSheet } from "@/modules/dsa/domain/dsa-cheat-sheet";
import { externalCatalogueSchema, externalResourcesSchema, type ExternalResource, type ExternalSheet } from "@/modules/dsa/domain/external-catalogue";
import { companyDatasetSchema, type CompanyDataset } from "@/modules/dsa/domain/company-tags";

export const dsaSheets = sheetsJson.sheets as ContentSheet[];
export const dsaCheatSheets: CheatSheet[] = cheatSheetsSchema.parse(cheatSheetsJson).sheets;
export const externalDsaSheets: ExternalSheet[] = externalCatalogueSchema.parse(externalCatalogueJson).sheets;
export const dsaLadders: ExternalSheet[] = externalCatalogueSchema.parse(laddersJson).sheets;
export const popularDsaSheets: ExternalSheet[] = externalCatalogueSchema.parse(popularSheetsJson).sheets;
export const externalResources: ExternalResource[] = externalResourcesSchema.parse(externalResourcesJson).resources;
export const companyDataset: CompanyDataset = companyDatasetSchema.parse(companyTagsJson);
