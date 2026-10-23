"""Coverage + schema checks for L0/L1 study notes and new MCQs."""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

HTML = re.compile(r"</?[a-zA-Z][^>]*>")
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
MCQ_ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def subtopic_key(item: str) -> str:
    head = re.sub(r"^\[[^\]]*\]\s*", "", item).split(": ")[0]
    slug = re.sub(r"[^a-z0-9]+", "-", head.lower()).strip("-")[:60].rstrip("-")
    return slug


def load_checklist(level_id: str) -> dict[str, list[str]]:
    road = json.loads((ROOT / "data/roadmaps/genai-16-levels.json").read_text(encoding="utf-8"))
    out: dict[str, list[str]] = {}
    for section in road["sections"]:
        if section["id"] != level_id:
            continue
        for node in section["nodes"]:
            if not re.match(r"^m\d+-\d+$", node["id"]):
                continue
            out[node["id"]] = [subtopic_key(i) for i in node["checklist"]]
    return out


def check_study(path: Path, level_id: str) -> list[str]:
    problems: list[str] = []
    data = json.loads(path.read_text(encoding="utf-8"))
    want = load_checklist(level_id)
    nodes = data["nodes"]
    extra_nodes = [n for n in nodes if n not in want]
    if extra_nodes:
        problems.append(f"{path.name}: unexpected nodes {extra_nodes}")
    notes_n = 0
    target = [0, 0, 0]  # short, in, long
    for nid, keys in want.items():
        notes = nodes.get(nid) or {}
        have = set(notes)
        missing = [k for k in keys if k not in have]
        extra = sorted(have - set(keys))
        if missing:
            problems.append(f"{nid}: missing {missing}")
        if extra:
            problems.append(f"{nid}: extra {extra}")
        for k, e in notes.items():
            notes_n += 1
            if not SLUG.match(k) or len(k) > 60:
                problems.append(f"{nid}/{k}: bad key")
            expl = e["explain"]
            n = len(expl)
            if n < 200 or n > 8000:
                problems.append(f"{nid}/{k}: explain {n} outside 200-8000")
            if n < 3200:
                target[0] += 1
                problems.append(f"{nid}/{k}: explain {n} SHORT of 3200")
            elif n > 5500:
                target[2] += 1
                if n > 8000:
                    problems.append(f"{nid}/{k}: explain {n} OVER 8000")
                else:
                    problems.append(f"{nid}/{k}: explain {n} LONG over 5500")
            else:
                target[1] += 1
            if HTML.search(expl):
                problems.append(f"{nid}/{k}: HTML in explain")
            kps = e["keyPoints"]
            if not (5 <= len(kps) <= 8):
                problems.append(f"{nid}/{k}: keyPoints {len(kps)}")
            for i, kp in enumerate(kps):
                if not (5 <= len(kp) <= 200):
                    problems.append(f"{nid}/{k}: keyPoint[{i}] len {len(kp)}")
                if HTML.search(kp):
                    problems.append(f"{nid}/{k}: HTML in keyPoint[{i}]")
            qs = e["questions"]
            if not (4 <= len(qs) <= 6):
                problems.append(f"{nid}/{k}: questions {len(qs)}")
            kinds = set()
            for i, q in enumerate(qs):
                kinds.add(q["kind"])
                if not (8 <= len(q["q"]) <= 240):
                    problems.append(f"{nid}/{k}: q[{i}] q-len {len(q['q'])}")
                if not (20 <= len(q["a"]) <= 1500):
                    problems.append(f"{nid}/{k}: q[{i}] a-len {len(q['a'])}")
                if q["kind"] not in {"recall", "apply", "debug"}:
                    problems.append(f"{nid}/{k}: q[{i}] kind {q['kind']}")
                if HTML.search(q["q"]) or HTML.search(q["a"]):
                    problems.append(f"{nid}/{k}: HTML in question[{i}]")
            links = e.get("links") or []
            if len(links) > 6:
                problems.append(f"{nid}/{k}: {len(links)} links")
            for link in links:
                url = link["url"]
                if not url.startswith("https://"):
                    problems.append(f"{nid}/{k}: non-https {url}")
                host = url.split("/")[2]
                unofficial = ("jalammar", "makeareadme", "medium.com", "realpython.com")
                if any(x in host for x in unofficial):
                    problems.append(f"{nid}/{k}: unofficial {url}")
    print(f"{path.name}: {notes_n} notes, explain in-target {target[1]}/{notes_n} short={target[0]} long={target[2]}")
    return problems


def check_mcq(path: Path, level: int, new_ids: set[str]) -> list[str]:
    problems: list[str] = []
    items = json.loads(path.read_text(encoding="utf-8"))
    ids = [m["id"] for m in items]
    if len(ids) != len(set(ids)):
        problems.append(f"{path.name}: duplicate ids")
    new = [m for m in items if m["id"] in new_ids]
    answers = Counter(m["answer"] for m in new)
    print(f"{path.name}: {len(items)} total, {len(new)} new, new-answer mix {dict(sorted(answers.items()))}")
    for m in new:
        if not MCQ_ID.match(m["id"]):
            problems.append(f"{m['id']}: bad id")
        if m["node"].split("-")[0] != f"m{level}" or m["level"] != level:
            problems.append(f"{m['id']}: node/level mismatch")
        if not (10 <= len(m["q"]) <= 300):
            problems.append(f"{m['id']}: q len {len(m['q'])}")
        if not (10 <= len(m["why"]) <= 400):
            problems.append(f"{m['id']}: why len {len(m['why'])}")
        if not (3 <= len(m["options"]) <= 4):
            problems.append(f"{m['id']}: options {len(m['options'])}")
        if not (0 <= m["answer"] < len(m["options"])):
            problems.append(f"{m['id']}: answer index")
        lowers = [o.lower() for o in m["options"]]
        if len(set(lowers)) != len(lowers):
            problems.append(f"{m['id']}: duplicate options")
        for o in m["options"]:
            if not (1 <= len(o) <= 200):
                problems.append(f"{m['id']}: option len {len(o)}")
    return problems


def global_answer_skew() -> None:
    counts = Counter()
    total = 0
    for p in sorted((ROOT / "data/genai-test/mcq").glob("level-*.json")):
        for m in json.loads(p.read_text(encoding="utf-8")):
            counts[m["answer"]] += 1
            total += 1
    print("global answers", {k: round(v / total, 3) for k, v in sorted(counts.items())}, "n=", total)
    for k, v in counts.items():
        if v / total >= 0.4:
            print(f"SKEW: answer {k} is {v / total:.3f}")


def main() -> int:
    problems: list[str] = []
    problems += check_study(ROOT / "data/genai-study/genai-16-levels/level-0.json", "level-0")
    problems += check_study(ROOT / "data/genai-study/genai-16-levels/level-1.json", "level-1")
    new0 = {f"m0-{i}-{n}" for i, last in ((1, 7), (2, 9), (3, 9), (4, 7), (5, 7), (6, 10), (7, 8)) for n in (last - 1, last)}
    # reconstruct from known new ids
    from mcqs import L0, L1

    problems += check_mcq(ROOT / "data/genai-test/mcq/level-0.json", 0, {m["id"] for m in L0})
    problems += check_mcq(ROOT / "data/genai-test/mcq/level-1.json", 1, {m["id"] for m in L1})
    global_answer_skew()
    if problems:
        print(f"\n{len(problems)} problems:")
        for p in problems:
            print(" -", p)
        return 1
    print("ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
