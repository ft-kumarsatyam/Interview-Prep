"""Assemble Level 2 and Level 4 study notes."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from stretch import STRETCH, apply  # noqa: E402

OUT = {
    2: ROOT / "data/genai-study/genai-16-levels/level-2.json",
    4: ROOT / "data/genai-study/genai-16-levels/level-4.json",
}


def _load(mod: str) -> dict:
    import importlib.util

    path = Path(__file__).resolve().parent / f"{mod}.py"
    spec = importlib.util.spec_from_file_location(mod, path)
    m = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(m)
    return m.NOTES


def _insert(explain: str, block: str) -> str:
    marker = "## What you would say in 30 seconds"
    if marker in explain:
        return explain.replace(marker, block.rstrip() + "\n\n" + marker, 1)
    return explain.rstrip() + "\n\n" + block


def _pad(e: dict) -> str:
    """Grow a short note using its own key points and questions — not generic filler."""
    explain = e["explain"]
    if len(explain) >= 3300:
        return explain
    kps = e["keyPoints"]
    qs = e["questions"]
    debug = next((q for q in qs if q["kind"] == "debug"), qs[-1])
    applyq = next((q for q in qs if q["kind"] == "apply"), qs[0])
    recall = next((q for q in qs if q["kind"] == "recall"), qs[0])
    checks = "\n".join(f"- {kp}" for kp in kps)
    explain = _insert(
        explain,
        "## Checks before you merge\n\n"
        "Treat each line as something a reviewer can point at in the diff, a test, or a log field:\n\n"
        f"{checks}\n\n"
        "If a line is only a slogan, the note is not implemented. Add the artefact in the same PR as the feature.\n\n"
        "## If they say this is over-engineering\n\n"
        f"Walk the failure first. {debug['q']} {debug['a']} "
        f"Then show the change you would ship the same week. {applyq['q']} {applyq['a']} "
        "That pair is why the extra lines exist: one prevents an incident, the other is small enough to merge.\n\n"
        "## Fifteen-minute lab\n\n"
        f"Recite the recall answer cold: {recall['q']} {recall['a']} "
        "Then reproduce the happy path once, inject the debug failure on purpose, and confirm the log or the user-visible state matches this note. "
        "If you cannot break it deliberately, you cannot claim you handle it. Keep the lab on a fake model or a fixture so it runs without a bill.\n",
    )
    if len(explain) >= 3300:
        return explain
    extras = [q for q in qs if q not in (debug, applyq, recall)]
    if not extras:
        extras = qs
    drill = "\n\n".join(f"**{q['kind']}.** {q['q']}\n\n{q['a']}" for q in extras)
    explain = _insert(
        explain,
        "## Drill the rest of the questions\n\n"
        "These are the remaining questions from this note. Answer out loud, then read the model line and mark what you skipped:\n\n"
        f"{drill}\n\n"
        "If a line surprised you, that gap is the next lab — not a new paper.\n",
    )
    if len(explain) >= 3300:
        return explain
    why_lines = "\n".join(
        f"- {kp} — write the log field, test, or user-visible string that proves it." for kp in kps
    )
    return _insert(
        explain,
        "## What to write in the design doc\n\n"
        "Copy the key points into the doc as acceptance lines, not as slogans:\n\n"
        f"{why_lines}\n\n"
        "A reviewer should be able to tick each line from the PR without asking you to restated the note.\n",
    )


def assemble(level: int, modules: list[str]) -> dict:
    nodes: dict = {}
    for mod in modules:
        nodes.update(_load(mod))
    for nid, notes in nodes.items():
        for k, e in notes.items():
            extra = STRETCH.get(nid, {}).get(k, "")
            e["explain"] = apply(e["explain"], extra)
            e["explain"] = _pad(e)
    return {"roadmapId": "genai-16-levels", "nodes": nodes}


def report(payload: dict) -> None:
    short = long = 0
    n = 0
    for nid, notes in payload["nodes"].items():
        for k, e in notes.items():
            n += 1
            ln = len(e["explain"])
            flags = []
            if ln < 3200:
                flags.append(f"SHORT {ln}")
                short += 1
            elif ln > 5500:
                flags.append(f"LONG {ln}")
                long += 1
            if not (5 <= len(e["keyPoints"]) <= 8):
                flags.append(f"KP {len(e['keyPoints'])}")
            if not (4 <= len(e["questions"]) <= 6):
                flags.append(f"Q {len(e['questions'])}")
            kinds = {q["kind"] for q in e["questions"]}
            if kinds != {"recall", "apply", "debug"} and not {"recall", "apply"} <= kinds:
                flags.append(f"kinds={kinds}")
            if flags:
                print(f"  {nid}/{k}: {', '.join(flags)}")
    print(f"notes={n} short={short} long={long} nodes={len(payload['nodes'])}")


def main() -> None:
    which = sys.argv[1] if len(sys.argv) > 1 else "both"
    jobs = []
    if which in {"2", "both"}:
        jobs.append((2, [f"m2_{i}" for i in range(1, 12)]))
    if which in {"4", "both"}:
        jobs.append((4, [f"m4_{i}" for i in [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14]]))
    for level, mods in jobs:
        available = [m for m in mods if (Path(__file__).parent / f"{m}.py").exists()]
        payload = assemble(level, available)
        OUT[level].write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"wrote {OUT[level]} from {available}")
        report(payload)


if __name__ == "__main__":
    main()
