"""Assemble Level 11 study notes and write data/genai-study/genai-16-levels/level-11.json."""

from __future__ import annotations

import json
from pathlib import Path

from boost import boost
from extras import extras_for
from splice import splice

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/genai-study/genai-16-levels/level-11.json"


def entry(
    what: str,
    why: str,
    how: str,
    failures: str,
    line: str,
    key_points: list[str],
    questions: list[dict],
    links: list[dict] | None = None,
) -> dict:
    explain = (
        f"## What it is\n\n{what.strip()}\n\n"
        f"## Why it matters on the job and in an interview\n\n{why.strip()}\n\n"
        f"## How it works + one small example\n\n{how.strip()}\n\n"
        f"## Failure modes\n\n{failures.strip()}\n\n"
        f"## What you would say in 30 seconds\n\n{line.strip()}\n"
    )
    return {
        "explain": explain,
        "keyPoints": key_points,
        "questions": questions,
        "links": links or [],
    }


def main() -> None:
    from m11_1 import NOTES as n1
    from m11_2 import NOTES as n2
    from m11_3 import NOTES as n3
    from m11_4 import NOTES as n4
    from m11_5 import NOTES as n5
    from m11_6 import NOTES as n6
    from m11_7 import NOTES as n7
    from m11_8 import NOTES as n8
    from m11_9 import NOTES as n9

    raw = {**n1, **n2, **n3, **n4, **n5, **n6, **n7, **n8, **n9}
    nodes: dict = {}
    for nid, notes in raw.items():
        nodes[nid] = {}
        for k, e in notes.items():
            why, how, fail = extras_for(nid, k)
            e2 = splice(e, extra_how=how, extra_why=why, extra_fail=fail) if (why or how or fail) else e
            nodes[nid][k] = boost(e2, nid, k)

    payload = {"roadmapId": "genai-16-levels", "nodes": nodes}
    OUT.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    count = sum(len(v) for v in nodes.values())
    print(f"wrote {count} notes across {len(nodes)} nodes to {OUT}")
    for nid, notes in nodes.items():
        for k, e in notes.items():
            n = len(e["explain"])
            flags = []
            if not (200 <= n <= 8000):
                flags.append(f"LEN {n}")
            if n < 3200:
                flags.append(f"SHORT {n}")
            if n > 5500:
                flags.append(f"LONG {n}")
            if not (5 <= len(e["keyPoints"]) <= 8):
                flags.append(f"KP {len(e['keyPoints'])}")
            if not (4 <= len(e["questions"]) <= 6):
                flags.append(f"Q {len(e['questions'])}")
            if flags:
                print(f"  {nid}/{k}: {', '.join(flags)}")


if __name__ == "__main__":
    main()
