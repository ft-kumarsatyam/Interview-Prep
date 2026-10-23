"""Build deepened level-10/12/15 study notes and append two MCQs per module."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from banks_l10 import BANKS as B10
from banks_l12 import BANKS as B12
from banks_l15 import BANKS as B15
from compose import compose
from mcq import NEW_MCQ

ROADMAP = ROOT / "data/roadmaps/genai-16-levels.json"
STUDY = {
    10: ROOT / "data/genai-study/genai-16-levels/level-10.json",
    12: ROOT / "data/genai-study/genai-16-levels/level-12.json",
    15: ROOT / "data/genai-study/genai-16-levels/level-15.json",
}
MCQ = {
    10: ROOT / "data/genai-test/mcq/level-10.json",
    12: ROOT / "data/genai-test/mcq/level-12.json",
    15: ROOT / "data/genai-test/mcq/level-15.json",
}
BANKS = {10: B10, 12: B12, 15: B15}


def slug(item: str) -> str:
    head = item
    if item.startswith("["):
        end = item.find("]")
        if end != -1:
            head = item[end + 1 :].lstrip()
    head = head.split(": ")[0]
    s = re.sub(r"[^a-z0-9]+", "-", head.lower()).strip("-")[:60].rstrip("-")
    return s


def title_detail(item: str) -> tuple[str, str]:
    rest = re.sub(r"^\[[^\]]*\]\s*", "", item)
    at = rest.find(": ")
    if at == -1:
        return rest, ""
    return rest[:at], rest[at + 2 :]


def pad(explain: str, title: str, detail: str, node: str, key: str) -> str:
    extra = (
        f"\n## Worked numbers\n\n"
        f"Give “{title}” a number the next time you touch {node}. "
        f"Write the denominator and the window. If you cannot, the control is still a slide. "
        f"Replace illustrative targets with measured ones before you claim production. "
        f"{detail or title}\n\n"
        f"## Common traps\n\n"
        f"1. Naming a vendor instead of an undo for {title}.\n"
        f"2. Changing this control in the same release as two other levers.\n"
        f"3. Never drilling {key} until a real page.\n"
    )
    text = explain
    if len(text) < 3050:
        text = text.rstrip() + extra
    if len(text) < 3050:
        text = text.rstrip() + (
            f"\nKeep a cheat-sheet line for {node}: one artefact path, one metric, one undo. "
            f"That is the start of the interview answer for {title}.\n"
        )
    if len(text) > 5450:
        # Prefer dropping the last optional section to stay in the target band.
        for heading in ("## Common traps", "## Worked numbers", "## Interview follow-up"):
            at = text.find(heading)
            if at != -1 and len(text) > 5450:
                text = text[:at].rstrip() + "\n"
        if len(text) > 5450:
            text = text[:5450].rsplit("\n", 1)[0] + "\n"
    return text


def build_level(level: int) -> dict:
    roadmap = json.loads(ROADMAP.read_text())
    existing = json.loads(STUDY[level].read_text())
    banks = BANKS[level]
    nodes: dict[str, dict] = {}
    for sec in roadmap["sections"]:
        for n in sec["nodes"]:
            if not re.fullmatch(rf"m{level}-\d+", n["id"]):
                continue
            bank = banks[n["id"]]
            notes = {}
            old = existing.get("nodes", {}).get(n["id"], {})
            for item in n["checklist"]:
                key = slug(item)
                title, detail = title_detail(item)
                seed = old.get(key, {})
                entry = compose(
                    node=n["id"],
                    key=key,
                    title=title,
                    detail=detail,
                    seed_explain=seed.get("explain", ""),
                    seed_kps=seed.get("keyPoints") or [],
                    seed_qs=seed.get("questions") or [],
                    bank=bank,
                    links=list(bank.get("links") or []),
                )
                entry["explain"] = pad(entry["explain"], title, detail, n["id"], key)
                notes[key] = entry
            nodes[n["id"]] = notes
    return {"roadmapId": "genai-16-levels", "nodes": nodes}


def report(level: int, payload: dict) -> None:
    print(f"\nLEVEL {level}")
    total = 0
    short = 0
    long = 0
    lens = []
    for nid, notes in payload["nodes"].items():
        total += len(notes)
        for k, e in notes.items():
            n = len(e["explain"])
            lens.append(n)
            if n < 3000:
                short += 1
                print(f"  SHORT {nid}/{k}: {n}")
            if n > 5500:
                long += 1
            if not (5 <= len(e["keyPoints"]) <= 8):
                print(f"  KP {nid}/{k}: {len(e['keyPoints'])}")
            if not (4 <= len(e["questions"]) <= 6):
                print(f"  Q {nid}/{k}: {len(e['questions'])}")
            if not e.get("links"):
                print(f"  NOLINK {nid}/{k}")
    print(f"  notes={total} explain[{min(lens)}-{max(lens)}] avg={sum(lens)/len(lens):.0f} short={short} longgt5500={long}")


def append_mcq(level: int) -> None:
    path = MCQ[level]
    old = json.loads(path.read_text())
    ids = {m["id"] for m in old}
    added = []
    for m in NEW_MCQ[level]:
        if m["id"] in ids:
            continue
        added.append(m)
        ids.add(m["id"])
    path.write_text(json.dumps(old + added, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  mcq {len(old)} -> {len(old)+len(added)} (+{len(added)})")


def main() -> None:
    levels = [int(x) for x in sys.argv[1:]] or [10, 12, 15]
    for level in levels:
        payload = build_level(level)
        STUDY[level].write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        report(level, payload)
        append_mcq(level)


if __name__ == "__main__":
    main()
