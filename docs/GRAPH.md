# The code graph (graphify)

PrepOS has a queryable knowledge graph of its own code and docs, built with [graphify](https://github.com/safishamsi/graphify). It answers "who calls this?", "how are these two things connected?" and "what is this?" in a few lines, instead of grepping 650 files. It complements [`STRUCTURE.md`](./STRUCTURE.md): STRUCTURE.md says how the code **should** be shaped; the graph shows how it **is** connected.

## What is in it

- **Code** (AST, no LLM, free): every TypeScript/TSX file under `app/`, `modules/`, `core/`, `components/`, `scripts/`, `tests/`: files, functions, classes, imports, calls. About 5,000 nodes and 15,000+ edges, grouped into communities that mostly follow the feature modules.
- **Docs** (one-time LLM pass, about 170 concept nodes): `README.md`, `AGENTS.md`, `docs/*.md` and the GitHub workflows, linked to the code concepts they describe. This first pass read `ARCHITECTURE.md` fully but only the opening of `BUILD_PLAN`, `DESIGN`, `ROADMAP` and `README`, so those are thinly covered; run `/graphify . --update` in Claude Code for a fuller pass.
- **Left out on purpose** (`.graphifyignore`): `node_modules`, `.next`, the extension, icons and splash images, and the big content banks (`data/quiz-bank.json`, `dsa-problems.json`...). The loaders and tests that use them are in the graph.

Everything lives in `graphify-out/`, which is **not committed**: it rebuilds in about six seconds.

## Use it

```bash
npm run graph                                  # rebuild after changing code (AST only, free)
graphify query "what calls recomputeDay"       # scoped subgraph for a question (BFS)
graphify query "how does a quiz pass update mastery" --dfs   # trace one path
graphify path "settlePastDays" "DayLog"        # shortest path between two things
graphify explain "recomputeDay"                # one node, its neighbours and where it lives
graphify affected "toggleSubtopic"             # what is impacted if this changes
npm run graph:tree                             # collapsible tree HTML: graphify-out/GRAPH_TREE.html
```

`npm run graph:query -- "<question>"` works too. The full interactive `graph.html` is skipped because the graph has more than 5,000 nodes; use `graph:tree` (or `GRAPHIFY_VIZ_NODE_LIMIT=` to force it).

Read `graphify-out/GRAPH_REPORT.md` for the big picture: the most connected nodes ("god nodes"), surprising cross-module links and suggested questions.

Good questions to ask before a refactor: "what depends on `planner`?", "which tests cover `isDayComplete`?", "what writes `DayLog`?", "path from `submitQuiz` to `DayLog`".

## How it is wired in

| Piece | What it does |
|---|---|
| `.graphifyignore` | what to skip (gitignore syntax) |
| `npm run graph` | `graphify update .`: re-extract code, rebuild `graph.json` and the report |
| `graphify claude install` | added the `## graphify` section to `CLAUDE.md` and advisory hooks in `.claude/settings.json`, so Claude Code checks the graph before grepping and rebuilds it after code changes |
| `graphify hook install` (`npm run graph:hook`) | git `post-commit` and `post-checkout` hooks rebuild the graph after each commit or checkout (code only, free). Hooks live in `.git/hooks`, so run this once in every fresh clone. Set `GRAPHIFY_SKIP_HOOK=1` to skip one run. |
| `docs/GRAPH.md` (this file) | how to use it |

## Keeping it fresh

- Code changes: the post-commit hook handles it, or run `npm run graph`.
- Docs changed a lot: re-run the semantic pass in Claude Code with `/graphify . --update` (it only re-reads changed docs). Doc and image changes are not picked up by the free rebuild.
- After a big refactor that deletes code: `graphify update . --force` so the graph is allowed to shrink.

## Honesty

Edges are labelled `EXTRACTED` (found in the source), `INFERRED` (a reasoned link, with a score) or `AMBIGUOUS`. Treat inferred links as leads to check, not facts. When the graph and the code disagree, the code is right: run `npm run graph`.
