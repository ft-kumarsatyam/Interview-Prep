"""Turn a unique scene plus an optional existing note into a full study entry."""

from __future__ import annotations

from helper import entry

TARGET_MIN = 3000
TARGET_MAX = 5500


def sc(
    why: str,
    how: str,
    failures: str,
    line: str,
    walk: str,
    follow: str,
    measure: str,
    kps: list[str],
    qs: list[dict],
    links: list[dict],
    what: str | None = None,
) -> dict:
    d = {
        "why": why,
        "how": how,
        "failures": failures,
        "line": line,
        "walk": walk,
        "follow": follow,
        "measure": measure,
        "kps": kps,
        "qs": qs,
        "links": links,
    }
    if what:
        d["what"] = what
    return d


def _one_line(text: str) -> str:
    return " ".join((text or "").split())


def _pad_sections(scene: dict) -> list[str]:
    kps = scene["kps"]
    qs = scene["qs"]
    measure = _one_line(scene["measure"])
    line = _one_line(scene["line"])
    follow = _one_line(scene["follow"])
    walk = _one_line(scene["walk"])
    why = _one_line(scene["why"])
    how = _one_line(scene["how"])
    apply_q = next((q for q in qs if q.get("kind") == "apply"), qs[0] if qs else None)
    debug_q = next((q for q in qs if q.get("kind") == "debug"), qs[-1] if qs else None)
    kp0 = kps[0] if kps else "name the mechanism before the vendor"
    kp1 = kps[1] if len(kps) > 1 else kp0
    kp2 = kps[2] if len(kps) > 2 else kp1
    return [
        (
            "## How I would implement this tomorrow\n\n"
            "I would not start by rewriting a prompt. I would start by making one check real. "
            f"The first numbers I would collect are: {measure} "
            "That means a small fixture, a checker that can fail on purpose, and a stored score so tomorrow's change has a baseline. "
            f"The first key point I would encode as a test is: {kp0} "
            "If I cannot fail a run on purpose, I do not yet have an implementation — I have a story."
        ),
        (
            "## Common interview traps\n\n"
            "The cheap answer is a vendor name or a slogan. The answer I want is a mechanism plus a fail. "
            f"My thirty-second line is: {line} "
            f"If they ask the obvious follow-up I continue with: {follow} "
            "I will not invent a metric I cannot compute on a napkin fixture. "
            f"A second point I will say out loud: {kp1}"
        ),
        (
            "## What would change my mind\n\n"
            f"{why} "
            "I change the design when a held-out slice moves, not when a demo is prettier. "
            f"A third point that would force a redesign is: {kp2} "
            "One counter-example that lives in the golden set beats a week of vibe testing."
        ),
        (
            "## How this shows up in a log\n\n"
            "In a real trace I want to see the decision, the evidence, and the stop. "
            f"A reviewer should be able to replay this walk-through from the log: {walk} "
            "If the log cannot support that story, the feature is not observable yet. "
            "I also want the cheap how-it-works sketch nearby so a new teammate can implement the same check: "
            f"{how}"
        ),
        (
            "## What I would practise this week\n\n"
            "I would answer one apply question and one debug question without notes, then write the checker that would score my own answer. "
            + (
                f"Apply: {apply_q['q']} {apply_q['a']} "
                if apply_q
                else ""
            )
            + (
                f"Debug: {debug_q['q']} {debug_q['a']} "
                if debug_q
                else ""
            )
            + "If I cannot do that in a few sentences and name a metric, I do not know the topic yet."
        ),
    ]


def _with_target_length(explain: str, scene: dict) -> str:
    text = explain.rstrip() + "\n"
    if len(text) >= TARGET_MIN:
        return text
    for section in _pad_sections(scene):
        nxt = text.rstrip() + "\n\n" + section.strip() + "\n"
        if len(text) >= TARGET_MIN:
            break
        if len(nxt) > TARGET_MAX and len(text) >= TARGET_MIN:
            break
        if len(nxt) > 8000:
            break
        text = nxt
        if len(text) >= TARGET_MIN:
            break
    return text if len(text) >= 200 else text + "\nSee the key points and questions.\n"


def deepen(scene: dict, existing: dict | None = None) -> dict:
    existing_explain = (existing or {}).get("explain") or ""
    if existing_explain.lstrip().startswith("## What it is"):
        what = scene.get("what") or existing_explain
    else:
        what = existing_explain or scene.get("what") or ""
    if not what.strip():
        raise ValueError("scene needs what or an existing explain")
    why = scene["why"]
    how = scene["how"]
    failures = scene["failures"]
    line = scene["line"]
    walk = scene["walk"]
    follow = scene["follow"]
    measure = scene["measure"]
    kps = list(scene["kps"])
    if existing:
        for kp in existing.get("keyPoints", []):
            if kp not in kps and len(kps) < 8:
                kps.append(kp)
    kps = kps[:8]
    if len(kps) < 5:
        raise ValueError(f"need 5 key points, got {len(kps)}")
    qs = list(existing.get("questions", []) if existing else [])
    seen = {q["q"] for q in qs}
    for q in scene["qs"]:
        if q["q"] not in seen:
            qs.append(q)
            seen.add(q["q"])
    qs = qs[:6]
    if len(qs) < 4:
        raise ValueError("need 4 questions")
    built = entry(what, why, how, failures, line, walk, follow, measure, kps, qs, scene.get("links") or [])
    built["explain"] = _with_target_length(built["explain"], scene)
    if len(built["explain"]) > 8000:
        built["explain"] = built["explain"][:8000].rsplit("\n", 1)[0] + "\n"
    return built
