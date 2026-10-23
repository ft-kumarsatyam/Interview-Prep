"""Assemble Level 0 and Level 1 study notes."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))


def dump(path: Path, nodes: dict) -> None:
    payload = {"roadmapId": "genai-16-levels", "nodes": nodes}
    path.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    count = sum(len(v) for v in nodes.values())
    print(f"wrote {count} notes across {len(nodes)} nodes to {path}")
    for nid, notes in nodes.items():
        for k, e in notes.items():
            n = len(e["explain"])
            flag = ""
            if n < 3200:
                flag = " SHORT"
            elif n > 5500:
                flag = " LONG"
            if n > 8000:
                flag = " OVER"
            print(f"  {nid}/{k}: {n} kp={len(e['keyPoints'])} q={len(e['questions'])}{flag}")


def main() -> None:
    from m0_1 import NOTES as a
    from m0_2 import NOTES as b
    from m0_3 import NOTES as c
    from m0_4 import NOTES as d
    from m0_5 import NOTES as e
    from m0_6 import NOTES as f
    from m0_7 import NOTES as g
    from m1_1 import NOTES as h
    from m1_2 import NOTES as i
    from m1_3 import NOTES as j
    from m1_4 import NOTES as k
    from m1_5 import NOTES as l
    from m1_6 import NOTES as m
    from m1_7 import NOTES as n
    from m1_8 import NOTES as o
    from m1_9 import NOTES as p
    from m1_10 import NOTES as q
    from m1_11 import NOTES as r
    from m1_12 import NOTES as s

    dump(ROOT / "data/genai-study/genai-16-levels/level-0.json", {**a, **b, **c, **d, **e, **f, **g})
    dump(ROOT / "data/genai-study/genai-16-levels/level-1.json", {**h, **i, **j, **k, **l, **m, **n, **o, **p, **q, **r, **s})


if __name__ == "__main__":
    main()
