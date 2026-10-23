"""Assemble Level 13 study notes and write data/genai-study/genai-16-levels/level-13.json."""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
L11 = HERE.parent / "scripts" / "_l11"
sys.path.insert(0, str(HERE))
sys.path.append(str(L11))

from extras import extras_for  # L13 extras (HERE is first)
from helper import note  # noqa: F401
from boost import boost
from splice import splice

ROOT = HERE.parents[0] if (HERE / "helper.py").exists() else HERE.parent
# .tmp-l13-build lives at repo root
REPO = HERE.parent
OUT = REPO / "data/genai-study/genai-16-levels/level-13.json"


def main() -> None:
    from m13_1 import NODES as a1
    from m13_2 import NODES as a2
    from m13_3 import NODES as a3
    from m13_4 import NODES as a4
    from m13_5 import NODES as a5
    from m13_6 import NODES as a6
    from m13_7 import NODES as a7
    from m13_8 import NODES as a8
    from m13_9 import NODES as a9

    raw = {
        "m13-1": a1,
        "m13-2": a2,
        "m13-3": a3,
        "m13-4": a4,
        "m13-5": a5,
        "m13-6": a6,
        "m13-7": a7,
        "m13-8": a8,
        "m13-9": a9,
    }
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
