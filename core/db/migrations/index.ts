import { migration as ownerId } from "@/core/db/migrations/001-owner-id";
import { migration as eventIndexes } from "@/core/db/migrations/002-event-indexes";
import { migration as vectorIndex } from "@/core/db/migrations/003-vector-index";
import { migration as aiChatIndexes } from "@/core/db/migrations/004-ai-chat-indexes";
import { migration as capturedNotes } from "@/core/db/migrations/005-captured-notes";
import { migration as jobProfiles } from "@/core/db/migrations/006-job-profiles";
import { migration as postingYears } from "@/core/db/migrations/007-posting-years";
import { migration as questionFlags } from "@/core/db/migrations/008-question-flags";
import { migration as interviewBank } from "@/core/db/migrations/009-interview-bank";
import type { Migration } from "@/core/db/migrations/types";

/** Append new migrations to the end. Ids must be in order (a test checks it). */
export const MIGRATIONS: Migration[] = [ownerId, eventIndexes, vectorIndex, aiChatIndexes, capturedNotes, jobProfiles, postingYears, questionFlags, interviewBank];
