/**
 * Small, self-contained AI-engineering exercises: judged the same way as any DSA problem (reference,
 * independent brute force, fuzz cross-check), but about the building blocks of RAG and prompting rather
 * than classic algorithms. No network, no model calls, no GPU: everything runs on plain arrays and strings.
 */
import { define, tuf, type ProblemDef } from "./define";
import { gen } from "./gen";

const topKBySimilarity: ProblemDef = {
  slug: "top-k-by-similarity",
  title: "Top-K Passages by Cosine Similarity",
  difficulty: "Medium",
  pattern: "AI Engineering",
  url: tuf("top-k-by-similarity"),
  statement:
    "You are given `vectors`, the embedding of each indexed passage, and `query`, the embedding of a question. " +
    "Return the indices of the `k` passages with the highest cosine similarity to `query`, in descending order of similarity " +
    "(ties broken by the lower index first). This is the core ranking step of a RAG retriever.\n\n" +
    "Cosine similarity between `a` and `b` is `dot(a, b) / (|a| * |b|)`; treat the similarity as `0` if either vector has zero length. " +
    "If `k` is larger than the number of vectors, return all of their indices in similarity order.",
  constraints: ["1 <= vectors.length <= 200", "1 <= vectors[i].length <= 16", "0 <= k <= vectors.length"],
  fn: "topKBySimilarity",
  params: [
    ["vectors", "number[][]"],
    ["query", "number[]"],
    ["k", "number"],
  ],
  returns: "number[]",
  hints: [
    "Cosine similarity only cares about direction, not magnitude. How do you turn a dot product into a similarity that ignores vector length?",
    "Compute each vector's dot product with the query and divide by the product of their magnitudes (treating a zero-length vector as similarity 0). Then sort the indices by similarity, descending, breaking ties by the smaller index, and take the first k.",
    "sims = []\nfor i in 0..n-1:\n  sims[i] = dot(vectors[i], query) / (norm(vectors[i]) * norm(query)), or 0 if either norm is 0\norder = indices 0..n-1 sorted by (sims[i] descending, i ascending)\nreturn first k of order",
  ],
  reference: `function topKBySimilarity(vectors, query, k) {
    function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
    function norm(a) { return Math.sqrt(dot(a, a)); }
    const qn = norm(query);
    const sims = vectors.map(function (v, i) {
      const vn = norm(v);
      const s = (qn === 0 || vn === 0) ? 0 : dot(v, query) / (vn * qn);
      return { i: i, s: s };
    });
    sims.sort(function (a, b) { return b.s - a.s || a.i - b.i; });
    return sims.slice(0, k).map(function (x) { return x.i; });
  }`,
  // A different algorithm shape on purpose: repeatedly scan for the best remaining index instead of sorting once.
  brute: `function topKBySimilarity(vectors, query, k) {
    function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
    function norm(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s); }
    const qn = norm(query);
    const used = new Array(vectors.length).fill(false);
    const out = [];
    const want = Math.min(k, vectors.length);
    for (let step = 0; step < want; step++) {
      let best = -1;
      let bestSim = -Infinity;
      for (let i = 0; i < vectors.length; i++) {
        if (used[i]) continue;
        const vn = norm(vectors[i]);
        const sim = (qn === 0 || vn === 0) ? 0 : dot(vectors[i], query) / (vn * qn);
        if (sim > bestSim) { bestSim = sim; best = i; }
      }
      used[best] = true;
      out.push(best);
    }
    return out;
  }`,
  fuzz: gen(`
    var n = __r(rand, 1, 8);
    var dim = __r(rand, 1, 4);
    var vectors = [];
    for (var i = 0; i < n; i++) {
      var v = [];
      for (var d = 0; d < dim; d++) v.push(__r(rand, -5, 5));
      vectors.push(v);
    }
    var query = [];
    for (var d = 0; d < dim; d++) query.push(__r(rand, -5, 5));
    var k = __r(rand, 0, n);
    return [vectors, query, k];
  `),
  examples: [
    [
      [
        [1, 0],
        [0, 1],
        [1, 1],
      ],
      [1, 0],
      2,
    ],
    [[[2, 0], [1, 0], [0, 1]], [1, 0], 1],
  ],
  edges: [
    ["zeros", [[[0, 0], [1, 0]], [1, 0], 2], "A zero vector has no direction, so its similarity is defined as 0, not NaN."],
    ["negatives", [[[1, 0], [-1, 0], [0, 1]], [1, 0], 3], "A vector pointing the opposite way should rank last, not crash on a negative dot product."],
    ["boundary", [[[1, 0], [0, 1]], [1, 1], 2], "k equals the number of vectors: every index comes back, just ordered by similarity."],
  ],
};

const renderPromptTemplate: ProblemDef = {
  slug: "render-prompt-template",
  title: "Render a Prompt Template",
  difficulty: "Easy",
  pattern: "AI Engineering",
  url: tuf("render-prompt-template"),
  statement:
    "Given a prompt `template` containing `{{name}}`-style placeholders and a `vars` object mapping variable names to values, " +
    "return the template with every placeholder replaced by `String(vars[name])`.\n\n" +
    "If any placeholder's name is missing from `vars`, return `null` instead of a partially-filled string: a prompt builder should " +
    "never silently send a half-filled template to a model. Whitespace inside the braces (e.g. `{{ name }}`) should be ignored.",
  constraints: ["0 <= template.length <= 2000", "placeholder names are letters, digits and underscores only"],
  fn: "renderTemplate",
  params: [
    ["template", "string"],
    ["vars", "Object<string, string>"],
  ],
  returns: "string",
  hints: [
    "You need to find every `{{...}}` placeholder, look up its name (trimmed) in vars, and bail out entirely the moment one is missing.",
    "Scan for `{{` and `}}` pairs. For each one, trim the text between them to get the variable name; if it isn't a key of vars, the whole result is null. Otherwise build up the output by replacing each placeholder with its value.",
    "result = \"\"\nfor each piece of the template, literal text or a {{name}} placeholder:\n  if literal text: append it to result\n  if placeholder: name = trimmed text inside the braces\n    if name not in vars: return null\n    append vars[name] to result\nreturn result",
  ],
  reference: `function renderTemplate(template, vars) {
    let ok = true;
    const out = template.replace(/\\{\\{\\s*([a-zA-Z0-9_]+)\\s*\\}\\}/g, function (match, key) {
      if (!Object.prototype.hasOwnProperty.call(vars, key)) { ok = false; return match; }
      return String(vars[key]);
    });
    return ok ? out : null;
  }`,
  // A manual character scan instead of a regex, so a regex bug in the reference wouldn't be invisible.
  brute: `function renderTemplate(template, vars) {
    let result = "";
    let i = 0;
    while (i < template.length) {
      if (template[i] === "{" && template[i + 1] === "{") {
        const j = template.indexOf("}}", i + 2);
        if (j === -1) { result += template.slice(i); break; }
        const key = template.slice(i + 2, j).trim();
        if (!Object.prototype.hasOwnProperty.call(vars, key)) return null;
        result += String(vars[key]);
        i = j + 2;
      } else {
        result += template[i];
        i++;
      }
    }
    return result;
  }`,
  fuzz: gen(`
    var names = ["name", "company", "role", "city"];
    var n = __r(rand, 1, 3);
    var chosen = [];
    for (var i = 0; i < n; i++) chosen.push(__pick(rand, names));
    var template = "Hello {{" + chosen[0] + "}}";
    for (var i = 1; i < chosen.length; i++) template += ", {{" + chosen[i] + "}}";
    template += "!";
    var vars = {};
    var provideAll = rand() < 0.5;
    for (var i = 0; i < chosen.length; i++) {
      if (provideAll || rand() < 0.7) vars[chosen[i]] = __pick(rand, ["Alice", "Acme", "Engineer", "Austin"]);
    }
    return [template, vars];
  `),
  examples: [
    ["Hello {{name}}, welcome to {{company}}!", { name: "Alice", company: "Acme" }],
    ["{{ greeting }}", { greeting: "hi" }],
  ],
  edges: [
    ["empty", ["", {}], "An empty template with no placeholders renders to an empty string."],
    ["duplicates", ["{{name}} and {{name}} again", { name: "Sam" }], "The same placeholder appearing twice should be filled in both times."],
    ["no-answer", ["Hi {{name}}, from {{company}}", { name: "Sam" }], "A missing variable (company) means the whole render fails: return null, not a half-filled string."],
  ],
};

export const AI_PRACTICAL = [topKBySimilarity, renderPromptTemplate].map(define);
