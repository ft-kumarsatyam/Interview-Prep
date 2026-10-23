import "server-only";

import notesCsJson from "@/data/notes/cs.json";
import notesHldAJson from "@/data/notes/hld-a.json";
import notesHldBJson from "@/data/notes/hld-b.json";
import notesHldCJson from "@/data/notes/hld-c.json";
import notesLldJson from "@/data/notes/lld.json";
import notesJsJson from "@/data/notes/js.json";
import notesNodeJson from "@/data/notes/node.json";
import notesDsaJson from "@/data/notes/dsa.json";
import notesDbmsJson from "@/data/notes/dbms.json";
import notesAiJson from "@/data/notes/ai.json";
import notesBehavioralJson from "@/data/notes/behavioral.json";
import notesOsJson from "@/data/notes/os.json";
import notesOopJson from "@/data/notes/oop.json";
import type { NotesFile, SubtopicNote } from "@/modules/learn/domain/notes";

export const noteFiles: NotesFile[] = [
  notesHldAJson, notesHldBJson, notesHldCJson, notesCsJson, notesOsJson, notesOopJson, notesLldJson,
  notesJsJson, notesNodeJson, notesDsaJson, notesDbmsJson, notesAiJson, notesBehavioralJson,
] as NotesFile[];
export const subtopicNotes: ReadonlyMap<string, SubtopicNote> = new Map(noteFiles.flatMap((f) => Object.entries(f)));
