import aptitudeBankJson from "@/data/aptitude-bank.json";
import blogsJson from "@/data/engineering-blogs.json";
import careersJson from "@/data/careers.json";
import companiesJson from "@/data/companies.json";
import type { AptitudeBank } from "@/modules/aptitude/domain/aptitude";
import type { Company, TierProfile } from "@/modules/targets/domain/companies";
import type { CareerDeepLink, EngineeringBlog } from "@/core/content/types";

export const aptitudeBank = aptitudeBankJson as unknown as AptitudeBank;
export const engineeringBlogs = blogsJson.blogs as EngineeringBlog[];
export const tierProfiles = companiesJson.tiers as unknown as TierProfile[];
export const tierById = new Map(tierProfiles.map((t) => [t.id, t]));
export const companyCatalog = companiesJson.companies as Company[];
export const companyById = new Map(companyCatalog.map((c) => [c.id, c]));
export const careerSources = careersJson.sources as unknown as import("@/modules/jobs/domain/job-postings").CareerSource[];
export const careerDeepLinks = careersJson.deepLinks as CareerDeepLink[];
