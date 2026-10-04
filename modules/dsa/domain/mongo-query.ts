/**
 * A small, safe MongoDB-shell emulator for interview practice: it parses
 * `db.<collection>.find(...)/.aggregate([...])/.countDocuments(...)` and runs it over in-memory
 * documents. It never evaluates user code (no eval/Function): arguments are read by a relaxed
 * JSON parser (unquoted keys, single quotes, trailing commas). Only a documented subset is supported.
 */

export type Doc = Record<string, unknown>;
export type Collections = Record<string, Doc[]>;

export type MongoResult = { ok: true; docs: unknown[]; kind: "docs" | "count" } | { ok: false; error: string };

class MongoError extends Error {}
const fail = (msg: string): never => {
  throw new MongoError(msg);
};

/* ----------------------------- relaxed JSON parser ----------------------------- */

class Reader {
  i = 0;
  constructor(readonly s: string) {}
  ws() {
    while (this.i < this.s.length && /\s/.test(this.s[this.i]!)) this.i++;
  }
  peek() {
    this.ws();
    return this.s[this.i];
  }
  eat(ch: string) {
    if (this.peek() !== ch) fail(`Expected "${ch}" at position ${this.i}`);
    this.i++;
  }
  done() {
    this.ws();
    return this.i >= this.s.length;
  }
}

function parseString(r: Reader): string {
  const quote = r.s[r.i++]!;
  let out = "";
  while (r.i < r.s.length) {
    const c = r.s[r.i++]!;
    if (c === quote) return out;
    if (c === "\\") {
      const n = r.s[r.i++];
      out += n === "n" ? "\n" : n === "t" ? "\t" : (n ?? "");
    } else out += c;
  }
  return fail("Unterminated string");
}

function parseValue(r: Reader, depth = 0): unknown {
  if (depth > 40) fail("Query is nested too deeply");
  const c = r.peek();
  if (c === "{") return parseObject(r, depth);
  if (c === "[") {
    r.eat("[");
    const arr: unknown[] = [];
    while (r.peek() !== "]") {
      if (r.done()) fail("Unterminated array");
      arr.push(parseValue(r, depth + 1));
      if (r.peek() === ",") r.i++;
      else break;
    }
    r.eat("]");
    return arr;
  }
  if (c === '"' || c === "'") return parseString(r);
  if (c === "/") return parseRegex(r);
  const m = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(r.s.slice(r.i));
  if (m) {
    r.i += m[0].length;
    return Number(m[0]);
  }
  const word = /^[A-Za-z_$][\w$]*/.exec(r.s.slice(r.i));
  if (word) {
    r.i += word[0].length;
    switch (word[0]) {
      case "true":
        return true;
      case "false":
        return false;
      case "null":
        return null;
      default:
        return fail(`Unsupported value "${word[0]}"`);
    }
  }
  return fail(`Unexpected "${c ?? "end of input"}" at position ${r.i}`);
}

function parseRegex(r: Reader): { $regex: string; $options: string } {
  r.i++; // opening /
  let body = "";
  while (r.i < r.s.length && r.s[r.i] !== "/") {
    if (r.s[r.i] === "\\") body += r.s[r.i++];
    body += r.s[r.i++] ?? "";
  }
  if (r.s[r.i] !== "/") fail("Unterminated regex");
  r.i++;
  const flags = /^[a-z]*/.exec(r.s.slice(r.i))![0];
  r.i += flags.length;
  return { $regex: body, $options: flags };
}

function parseObject(r: Reader, depth: number): Doc {
  r.eat("{");
  const obj: Doc = Object.create(null) as Doc;
  while (r.peek() !== "}") {
    if (r.done()) fail("Unterminated object");
    const c = r.peek();
    let key: string;
    if (c === '"' || c === "'") key = parseString(r);
    else {
      const m = /^[A-Za-z_$][\w$.]*/.exec(r.s.slice(r.i));
      if (!m) fail(`Expected a field name at position ${r.i}`);
      key = m![0];
      r.i += key.length;
    }
    if (key === "__proto__" || key === "constructor" || key === "prototype") fail(`Field name "${key}" is not allowed`);
    r.eat(":");
    obj[key] = parseValue(r, depth + 1);
    if (r.peek() === ",") r.i++;
    else break;
  }
  r.eat("}");
  return obj;
}

/** Split `a, b, c` call arguments at top level and parse each. */
export function parseArgs(src: string): unknown[] {
  const r = new Reader(src);
  const args: unknown[] = [];
  while (!r.done()) {
    args.push(parseValue(r));
    if (r.peek() === ",") r.i++;
    else break;
  }
  if (!r.done()) fail(`Unexpected "${r.s[r.i]}" in arguments`);
  return args;
}

/* ------------------------------- shell parsing -------------------------------- */

export interface ParsedQuery {
  collection: string;
  ops: Array<{ name: string; args: unknown[] }>;
}

/** Find the matching close paren for the "(" at `open`, skipping strings. */
function closeParen(s: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < s.length; i++) {
    const c = s[i]!;
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return i;
  }
  return fail("Missing closing parenthesis");
}

export function parseShell(source: string): ParsedQuery {
  const s = source.replace(/\/\/[^\n]*$/gm, "").trim().replace(/;\s*$/, "");
  const head = /^db\s*\.\s*([A-Za-z_][\w]*)\s*\.\s*/.exec(s) ?? /^db\s*\[\s*["']([^"']+)["']\s*\]\s*\.\s*/.exec(s);
  if (!head) return fail('Start with db.<collection>, for example db.users.find({ age: { $gt: 30 } })');
  const collection = head[1]!;
  let i = head[0].length;
  const ops: ParsedQuery["ops"] = [];
  while (i < s.length) {
    const m = /^([A-Za-z_]\w*)\s*\(/.exec(s.slice(i));
    if (!m) return fail(`Unexpected text near "${s.slice(i, i + 20)}"`);
    const open = i + m[0].length - 1;
    const close = closeParen(s, open);
    ops.push({ name: m[1]!, args: parseArgs(s.slice(open + 1, close)) });
    i = close + 1;
    while (/\s/.test(s[i] ?? "")) i++;
    if (i < s.length) {
      if (s[i] !== ".") fail(`Expected "." before "${s.slice(i, i + 15)}"`);
      i++;
      while (/\s/.test(s[i] ?? "")) i++;
    }
  }
  if (ops.length === 0) fail("Add a method, for example .find() or .aggregate([...])");
  return { collection, ops };
}

/* ------------------------------ value helpers --------------------------------- */

const isObj = (v: unknown): v is Doc => typeof v === "object" && v !== null && !Array.isArray(v);

export function getPath(doc: unknown, path: string): unknown {
  let cur: unknown = doc;
  for (const part of path.split(".")) {
    if (Array.isArray(cur)) {
      const idx = Number(part);
      if (Number.isInteger(idx)) cur = cur[idx];
      else {
        cur = cur.map((x) => (isObj(x) ? x[part] : undefined)).filter((x) => x !== undefined);
      }
    } else if (isObj(cur)) cur = cur[part];
    else return undefined;
  }
  return cur;
}

function setPath(doc: Doc, path: string, value: unknown): void {
  const parts = path.split(".");
  let cur = doc;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]!;
    if (!isObj(cur[p])) cur[p] = Object.create(null) as Doc;
    cur = cur[p] as Doc;
  }
  cur[parts.at(-1)!] = value;
}

const typeRank = (v: unknown): number => (v === null || v === undefined ? 0 : typeof v === "number" ? 1 : typeof v === "string" ? 2 : isObj(v) ? 3 : Array.isArray(v) ? 4 : typeof v === "boolean" ? 5 : 6);

export function compareValues(a: unknown, b: unknown): number {
  const ra = typeRank(a);
  const rb = typeRank(b);
  if (ra !== rb) return ra - rb;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0;
}

const equal = (a: unknown, b: unknown) => compareValues(a, b) === 0 && JSON.stringify(a) === JSON.stringify(b);

const ARRAY_AWARE = (docVal: unknown, test: (v: unknown) => boolean): boolean =>
  Array.isArray(docVal) ? docVal.some(test) || test(docVal) : test(docVal);

/* ------------------------------ query matching -------------------------------- */

function matchOperator(docVal: unknown, op: string, arg: unknown): boolean {
  switch (op) {
    case "$eq":
      return ARRAY_AWARE(docVal, (v) => equal(v, arg));
    case "$ne":
      return !ARRAY_AWARE(docVal, (v) => equal(v, arg));
    case "$gt":
      return ARRAY_AWARE(docVal, (v) => v != null && typeRank(v) === typeRank(arg) && compareValues(v, arg) > 0);
    case "$gte":
      return ARRAY_AWARE(docVal, (v) => v != null && typeRank(v) === typeRank(arg) && compareValues(v, arg) >= 0);
    case "$lt":
      return ARRAY_AWARE(docVal, (v) => v != null && typeRank(v) === typeRank(arg) && compareValues(v, arg) < 0);
    case "$lte":
      return ARRAY_AWARE(docVal, (v) => v != null && typeRank(v) === typeRank(arg) && compareValues(v, arg) <= 0);
    case "$in":
      return Array.isArray(arg) ? arg.some((a) => ARRAY_AWARE(docVal, (v) => equal(v, a))) : fail("$in needs an array");
    case "$nin":
      return Array.isArray(arg) ? !arg.some((a) => ARRAY_AWARE(docVal, (v) => equal(v, a))) : fail("$nin needs an array");
    case "$exists":
      return (docVal !== undefined) === Boolean(arg);
    case "$size":
      return Array.isArray(docVal) && docVal.length === arg;
    case "$all":
      return Array.isArray(arg) && Array.isArray(docVal) && arg.every((a) => docVal.some((v) => equal(v, a)));
    case "$not":
      return !matchCondition(docVal, arg);
    case "$elemMatch":
      return Array.isArray(docVal) && docVal.some((el) => (isObj(el) ? matches(el, arg as Doc) : matchCondition(el, arg)));
    case "$regex":
      return typeof docVal === "string" && new RegExp(String(arg)).test(docVal);
    case "$options":
      return true;
    default:
      return fail(`Unsupported query operator ${op}`);
  }
}

function matchCondition(docVal: unknown, cond: unknown): boolean {
  if (isObj(cond) && Object.keys(cond).some((k) => k.startsWith("$"))) {
    if ("$regex" in cond) {
      const flags = typeof cond.$options === "string" ? cond.$options : "";
      let re: RegExp;
      try {
        re = new RegExp(String(cond.$regex), flags);
      } catch {
        return fail("Invalid regular expression");
      }
      if (!ARRAY_AWARE(docVal, (v) => typeof v === "string" && re.test(v))) return false;
    }
    return Object.entries(cond).every(([op, arg]) => op === "$regex" || op === "$options" || matchOperator(docVal, op, arg));
  }
  return ARRAY_AWARE(docVal, (v) => equal(v, cond));
}

export function matches(doc: Doc, filter: Doc): boolean {
  for (const [key, cond] of Object.entries(filter)) {
    if (key === "$and") {
      if (!Array.isArray(cond) || !cond.every((f) => matches(doc, f as Doc))) return false;
    } else if (key === "$or") {
      if (!Array.isArray(cond) || !cond.some((f) => matches(doc, f as Doc))) return false;
    } else if (key === "$nor") {
      if (!Array.isArray(cond) || cond.some((f) => matches(doc, f as Doc))) return false;
    } else if (key.startsWith("$")) {
      fail(`Unsupported top-level operator ${key}`);
    } else if (!matchCondition(getPath(doc, key), cond)) return false;
  }
  return true;
}

/* ------------------------------- expressions ---------------------------------- */

function evalExpr(expr: unknown, doc: Doc): unknown {
  if (typeof expr === "string" && expr.startsWith("$$")) return fail(`Variable ${expr} is not supported`);
  if (typeof expr === "string" && expr.startsWith("$")) return getPath(doc, expr.slice(1));
  if (Array.isArray(expr)) return expr.map((e) => evalExpr(e, doc));
  if (!isObj(expr)) return expr;
  const keys = Object.keys(expr);
  const op = keys[0];
  if (keys.length === 1 && op?.startsWith("$")) {
    const arg = expr[op];
    const args = (Array.isArray(arg) ? arg : [arg]).map((a) => evalExpr(a, doc));
    const num = (i: number) => (typeof args[i] === "number" ? (args[i] as number) : null);
    switch (op) {
      case "$add":
        return args.reduce<number>((a, b) => a + (b as number), 0);
      case "$subtract":
        return num(0) === null || num(1) === null ? null : num(0)! - num(1)!;
      case "$multiply":
        return args.reduce<number>((a, b) => a * (b as number), 1);
      case "$divide":
        return num(0) === null || !num(1) ? null : num(0)! / num(1)!;
      case "$mod":
        return num(0) === null || !num(1) ? null : num(0)! % num(1)!;
      case "$round": {
        const places = num(1) ?? 0;
        const f = 10 ** places;
        return num(0) === null ? null : Math.round(num(0)! * f) / f;
      }
      case "$concat":
        return args.some((a) => a == null) ? null : args.join("");
      case "$toUpper":
        return typeof args[0] === "string" ? args[0].toUpperCase() : "";
      case "$toLower":
        return typeof args[0] === "string" ? args[0].toLowerCase() : "";
      case "$size":
        return Array.isArray(args[0]) ? args[0].length : null;
      case "$cond": {
        const c = isObj(arg) && !Array.isArray(arg) ? [arg.if, arg.then, arg.else] : (arg as unknown[]);
        return evalExpr(c[0], doc) ? evalExpr(c[1], doc) : evalExpr(c[2], doc);
      }
      case "$ifNull":
        return args[0] ?? args[1];
      case "$eq":
        return equal(args[0], args[1]);
      case "$gt":
        return compareValues(args[0], args[1]) > 0;
      case "$gte":
        return compareValues(args[0], args[1]) >= 0;
      case "$lt":
        return compareValues(args[0], args[1]) < 0;
      case "$lte":
        return compareValues(args[0], args[1]) <= 0;
      default:
        return fail(`Unsupported expression operator ${op}`);
    }
  }
  const out: Doc = Object.create(null) as Doc;
  for (const [k, v] of Object.entries(expr)) out[k] = evalExpr(v, doc);
  return out;
}

/* ------------------------------- aggregation ---------------------------------- */

function accumulate(spec: unknown, docs: Doc[]): unknown {
  if (!isObj(spec) || Object.keys(spec).length !== 1) return fail("Each $group accumulator needs one operator, e.g. { $sum: 1 }");
  const [op, arg] = Object.entries(spec)[0]!;
  const vals = () => docs.map((d) => evalExpr(arg, d));
  const nums = () => vals().filter((v): v is number => typeof v === "number");
  switch (op) {
    case "$sum":
      return nums().reduce((a, b) => a + b, 0);
    case "$avg": {
      const n = nums();
      return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
    }
    case "$min": {
      const v = vals().filter((x) => x != null);
      return v.length ? v.reduce((a, b) => (compareValues(a, b) <= 0 ? a : b)) : null;
    }
    case "$max": {
      const v = vals().filter((x) => x != null);
      return v.length ? v.reduce((a, b) => (compareValues(a, b) >= 0 ? a : b)) : null;
    }
    case "$push":
      return vals();
    case "$addToSet":
      return vals().filter((v, i, all) => all.findIndex((x) => equal(x, v)) === i);
    case "$first":
      return docs.length ? evalExpr(arg, docs[0]!) : null;
    case "$last":
      return docs.length ? evalExpr(arg, docs.at(-1)!) : null;
    case "$count":
      return docs.length;
    default:
      return fail(`Unsupported accumulator ${op}`);
  }
}

function sortDocs(docs: Doc[], spec: Doc): Doc[] {
  const keys = Object.entries(spec).map(([k, v]) => [k, v === -1 ? -1 : 1] as const);
  for (const [, dir] of keys) if (dir !== 1 && dir !== -1) fail("sort directions must be 1 or -1");
  return docs.toSorted((a, b) => {
    for (const [k, dir] of keys) {
      const c = compareValues(getPath(a, k), getPath(b, k));
      if (c !== 0) return c * dir;
    }
    return 0;
  });
}

function project(doc: Doc, spec: Doc): Doc {
  const entries = Object.entries(spec);
  const hasInclusion = entries.some(([k, v]) => k !== "_id" && v !== 0 && v !== false);
  const out: Doc = Object.create(null) as Doc;
  if (hasInclusion) {
    if (!(("_id" in spec) && (spec._id === 0 || spec._id === false)) && "_id" in doc) out._id = doc._id;
    for (const [k, v] of entries) {
      if (k === "_id" && (v === 0 || v === false)) continue;
      if (v === 1 || v === true) {
        const val = getPath(doc, k);
        if (val !== undefined) setPath(out, k, val);
      } else if (v !== 0 && v !== false) setPath(out, k, evalExpr(v, doc));
    }
    return out;
  }
  const copy = structuredClone(doc);
  for (const [k] of entries) {
    const parts = k.split(".");
    let cur: unknown = copy;
    for (let i = 0; i < parts.length - 1 && isObj(cur); i++) cur = cur[parts[i]!];
    if (isObj(cur)) delete cur[parts.at(-1)!];
  }
  return copy;
}

function runPipeline(input: Doc[], pipeline: unknown, lookup: (name: string) => Doc[]): Doc[] {
  if (!Array.isArray(pipeline)) return fail("aggregate() needs an array of stages");
  let docs = input;
  for (const stage of pipeline) {
    if (!isObj(stage) || Object.keys(stage).length !== 1) return fail("Each pipeline stage is an object with one $stage key");
    const [name, arg] = Object.entries(stage)[0]!;
    switch (name) {
      case "$match":
        docs = docs.filter((d) => matches(d, arg as Doc));
        break;
      case "$project":
        docs = docs.map((d) => project(d, arg as Doc));
        break;
      case "$addFields":
      case "$set":
        docs = docs.map((d) => {
          const out = structuredClone(d);
          for (const [k, v] of Object.entries(arg as Doc)) setPath(out, k, evalExpr(v, d));
          return out;
        });
        break;
      case "$sort":
        docs = sortDocs(docs, arg as Doc);
        break;
      case "$limit":
        if (typeof arg !== "number" || arg < 0) fail("$limit needs a non-negative number");
        docs = docs.slice(0, arg as number);
        break;
      case "$skip":
        if (typeof arg !== "number" || arg < 0) fail("$skip needs a non-negative number");
        docs = docs.slice(arg as number);
        break;
      case "$count":
        docs = [{ [String(arg)]: docs.length }];
        break;
      case "$unwind": {
        const path = String(isObj(arg) ? arg.path : arg).replace(/^\$/, "");
        const keepEmpty = isObj(arg) && arg.preserveNullAndEmptyArrays === true;
        docs = docs.flatMap((d) => {
          const v = getPath(d, path);
          if (Array.isArray(v) && v.length) return v.map((el) => {
            const c = structuredClone(d);
            setPath(c, path, el);
            return c;
          });
          return keepEmpty && (v === undefined || v === null || (Array.isArray(v) && v.length === 0)) ? [d] : [];
        });
        break;
      }
      case "$lookup": {
        const a = arg as Doc;
        const from = lookup(String(a.from));
        docs = docs.map((d) => {
          const c = structuredClone(d);
          const local = getPath(d, String(a.localField));
          c[String(a.as)] = from.filter((f) => ARRAY_AWARE(local, (v) => equal(getPath(f, String(a.foreignField)), v)));
          return c;
        });
        break;
      }
      case "$group": {
        const spec = arg as Doc;
        if (!("_id" in spec)) fail("$group needs an _id");
        const groups = new Map<string, { id: unknown; docs: Doc[] }>();
        for (const d of docs) {
          const id = evalExpr(spec._id, d);
          const key = JSON.stringify(id ?? null);
          const g = groups.get(key);
          if (g) g.docs.push(d);
          else groups.set(key, { id, docs: [d] });
        }
        docs = [...groups.values()].map((g) => {
          const out: Doc = Object.create(null) as Doc;
          out._id = g.id ?? null;
          for (const [k, v] of Object.entries(spec)) if (k !== "_id") out[k] = accumulate(v, g.docs);
          return out;
        });
        break;
      }
      default:
        return fail(`Unsupported pipeline stage ${name}`);
    }
  }
  return docs;
}

/* ---------------------------------- runner ------------------------------------ */

const MAX_DOCS = 500;

function plain(v: unknown): unknown {
  return JSON.parse(JSON.stringify(v ?? null)) as unknown;
}

export function runMongo(source: string, collections: Collections): MongoResult {
  try {
    const q = parseShell(source);
    const base = collections[q.collection];
    if (!base) return fail(`No collection "${q.collection}". Available: ${Object.keys(collections).join(", ")}`);
    const lookup = (name: string) => collections[name] ?? fail(`$lookup: no collection "${name}"`);

    const [first, ...rest] = q.ops;
    let docs: Doc[];
    let projection: Doc | undefined;
    if (first!.name === "find") {
      const [filter = {}, proj] = first!.args;
      if (!isObj(filter)) fail("find() filter must be an object");
      docs = base.filter((d) => matches(d, filter as Doc));
      if (proj !== undefined) {
        if (!isObj(proj)) fail("find() projection must be an object");
        projection = proj as Doc;
      }
    } else if (first!.name === "aggregate") {
      docs = runPipeline(base, first!.args[0], lookup);
      if (rest.length) fail("aggregate() can't be chained; add stages inside the pipeline");
    } else if (first!.name === "countDocuments" || first!.name === "count") {
      const filter = (first!.args[0] ?? {}) as Doc;
      if (rest.length) fail("countDocuments() can't be chained");
      return { ok: true, kind: "count", docs: [base.filter((d) => matches(d, filter)).length] };
    } else if (first!.name === "distinct") {
      const field = String(first!.args[0]);
      const filter = (first!.args[1] ?? {}) as Doc;
      const vals = base.filter((d) => matches(d, filter)).flatMap((d) => {
        const v = getPath(d, field);
        return Array.isArray(v) ? v : v === undefined ? [] : [v];
      });
      return { ok: true, kind: "docs", docs: plain(vals.filter((v, i) => vals.findIndex((x) => equal(x, v)) === i).toSorted(compareValues)) as unknown[] };
    } else return fail(`Start with find(), aggregate(), countDocuments() or distinct(); got ${first!.name}()`);

    for (const op of rest) {
      if (op.name === "sort") docs = sortDocs(docs, (op.args[0] ?? fail("sort() needs an object")) as Doc);
      else if (op.name === "limit") docs = docs.slice(0, Number(op.args[0]));
      else if (op.name === "skip") docs = docs.slice(Number(op.args[0]));
      else if (op.name === "count") return { ok: true, kind: "count", docs: [docs.length] };
      else if (op.name === "toArray" || op.name === "pretty") continue;
      else fail(`Unsupported cursor method ${op.name}()`);
    }
    if (projection) docs = docs.map((d) => project(d, projection!));
    return { ok: true, kind: "docs", docs: plain(docs.slice(0, MAX_DOCS)) as unknown[] };
  } catch (e) {
    if (e instanceof MongoError) return { ok: false, error: e.message };
    return { ok: false, error: "Couldn't run that query" };
  }
}
