export const MAX_TITLE = 60;
export const DEFAULT_TITLE = "New chat";

/** A thread title from its first question: one line, trailing punctuation dropped, cut at a word boundary. */
export function threadTitle(question: string): string {
  const line = question.replace(/\s+/g, " ").trim().replace(/[\s?.!,:;]+$/, "");
  if (!line) return DEFAULT_TITLE;
  if (line.length <= MAX_TITLE) return line;
  const cut = line.slice(0, MAX_TITLE);
  const space = cut.lastIndexOf(" ");
  return `${(space > MAX_TITLE / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** A title you typed: trimmed, one line, capped. */
export function cleanTitle(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE);
  return t || DEFAULT_TITLE;
}
