/**
 * Starter code per language. Problems are authored once, as a JavaScript starter with JSDoc types;
 * the TypeScript and Python stubs are derived from that JSDoc so every runnable problem works in
 * all three languages without hand-written starters.
 */

export const LANGUAGES = [
  { id: "javascript", label: "JavaScript", short: "JS" },
  { id: "typescript", label: "TypeScript", short: "TS" },
  { id: "python", label: "Python", short: "PY" },
] as const;
export type Language = (typeof LANGUAGES)[number]["id"];

export const isLanguage = (v: unknown): v is Language => LANGUAGES.some((l) => l.id === v);

export interface TypedParam {
  name: string;
  /** JSDoc-style type, e.g. `number[]`, `ListNode`, `TreeNode | null`. */
  type: string;
}

export interface TypedSignature {
  functionName: string;
  params: TypedParam[];
  returnType: string;
}

export interface StarterSource {
  signature: { functionName: string; params: string[]; returnType: string };
  starter: string;
  starters?: Partial<Record<Language, string>>;
}

/** Read parameter types out of a JSDoc starter. Missing tags fall back to `any`. */
export function parseSignature(src: StarterSource): TypedSignature {
  const types = new Map<string, string>();
  for (const m of src.starter.matchAll(/@param\s+\{([^}]+)\}\s+(\w+)/g)) types.set(m[2]!, m[1]!.trim());
  const ret = /@returns?\s+\{([^}]+)\}/.exec(src.starter)?.[1]?.trim();
  return {
    functionName: src.signature.functionName,
    params: src.signature.params.map((name) => ({ name, type: types.get(name) ?? "any" })),
    returnType: ret ?? src.signature.returnType ?? "any",
  };
}

const usesNodes = (sig: TypedSignature) => [sig.returnType, ...sig.params.map((p) => p.type)].some((t) => /ListNode|TreeNode/.test(t));

/** Split on `sep` only outside <>, [] and (), so `Array<a | b>` stays one part. */
function splitTop(t: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of t) {
    if ("<[(".includes(ch)) depth++;
    else if (">])".includes(ch)) depth--;
    if (ch === sep && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const unwrap = (t: string) => (t.startsWith("(") && t.endsWith(")") ? t.slice(1, -1).trim() : t);
const generic = (t: string) => /^(Array|Object|Record)<(.+)>$/.exec(t);

export function tsType(jsdoc: string): string {
  const t = unwrap(jsdoc.trim());
  const union = splitTop(t, "|");
  if (union.length > 1) {
    const parts = [...new Set(union.map((p) => tsType(p)).flatMap((p) => splitTop(p, "|")))];
    return parts.join(" | ");
  }
  const g = generic(t);
  if (g) {
    const args = splitTop(g[2]!, ",").map(tsType);
    return g[1] === "Array" ? `Array<${args[0]}>` : `Record<${args.join(", ")}>`;
  }
  if (t.endsWith("[]")) {
    const inner = tsType(t.slice(0, -2));
    return inner.includes(" ") ? `(${inner})[]` : `${inner}[]`;
  }
  if (t === "character" || t === "char") return "string";
  if (t === "integer" || t === "int" || t === "float" || t === "double") return "number";
  if (t === "ListNode" || t === "TreeNode") return `${t} | null`;
  return t;
}

export function pyType(jsdoc: string): string {
  const t = unwrap(jsdoc.trim());
  const union = splitTop(t, "|");
  if (union.length > 1) {
    const parts = union.filter((p) => p !== "null" && p !== "undefined");
    const inner = parts.length === 1 ? pyType(parts[0]!) : `Union[${parts.map(pyType).join(", ")}]`;
    return inner.startsWith("Optional[") ? inner : `Optional[${inner}]`;
  }
  const g = generic(t);
  if (g) {
    const args = splitTop(g[2]!, ",").map(pyType);
    return g[1] === "Array" ? `List[${args[0]}]` : `Dict[${args.join(", ")}]`;
  }
  if (t.endsWith("[]")) return `List[${pyType(t.slice(0, -2))}]`;
  switch (t) {
    case "number":
    case "integer":
    case "int":
      return "int";
    case "float":
    case "double":
      return "float";
    case "string":
    case "character":
    case "char":
      return "str";
    case "boolean":
      return "bool";
    case "void":
    case "undefined":
    case "null":
      return "None";
    case "ListNode":
    case "TreeNode":
      return `Optional[${t}]`;
    default:
      return "Any";
  }
}

export function tsStarter(sig: TypedSignature): string {
  const params = sig.params.map((p) => `${p.name}: ${tsType(p.type)}`).join(", ");
  const note = usesNodes(sig) ? "// ListNode and TreeNode are predefined.\n" : "";
  return `${note}function ${sig.functionName}(${params}): ${tsType(sig.returnType)} {\n  \n}`;
}

export function pyStarter(sig: TypedSignature): string {
  const params = ["self", ...sig.params.map((p) => `${p.name}: ${pyType(p.type)}`)].join(", ");
  const note = usesNodes(sig) ? "# ListNode(val, next) and TreeNode(val, left, right) are predefined.\n" : "";
  return `${note}class Solution:\n    def ${sig.functionName}(${params}) -> ${pyType(sig.returnType)}:\n        pass\n`;
}

/** A JavaScript starter with JSDoc, for problems created from a typed signature (AI-generated or pasted). */
export function jsStarter(sig: TypedSignature): string {
  const doc = ["/**", ...sig.params.map((p) => ` * @param {${p.type}} ${p.name}`), ` * @return {${sig.returnType}}`, " */"].join("\n");
  return `${doc}\nfunction ${sig.functionName}(${sig.params.map((p) => p.name).join(", ")}) {\n  \n}`;
}

export function starterFor(lang: Language, src: StarterSource): string {
  const explicit = src.starters?.[lang];
  if (explicit) return explicit;
  if (lang === "javascript") return src.starter;
  const sig = parseSignature(src);
  return lang === "typescript" ? tsStarter(sig) : pyStarter(sig);
}
