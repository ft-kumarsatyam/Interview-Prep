import { migration as ownerId } from "@/core/db/migrations/001-owner-id";
import type { Migration } from "@/core/db/migrations/types";

/** Append new migrations to the end. Ids must be in order (a test checks it). */
export const MIGRATIONS: Migration[] = [ownerId];
