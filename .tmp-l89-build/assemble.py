"""Assemble Level 8/9 study notes."""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
OUT8 = ROOT / "data/genai-study/genai-16-levels/level-8.json"
OUT9 = ROOT / "data/genai-study/genai-16-levels/level-9.json"


def _check(nodes: dict, label: str) -> None:
    count = sum(len(v) for v in nodes.values())
    print(f"{label}: {count} notes across {len(nodes)} nodes")
    for nid, notes in nodes.items():
        for k, e in notes.items():
            n = len(e["explain"])
            flag = ""
            if n < 3000:
                flag = " SHORT"
            elif n > 5500:
                flag = " LONG"
            if n > 8000:
                flag = " OVER"
            if flag:
                print(f"  {nid}/{k}: {n}{flag} kp={len(e['keyPoints'])} q={len(e['questions'])} links={len(e['links'])}")
            if not (5 <= len(e["keyPoints"]) <= 8):
                print(f"  KP {nid}/{k}: {len(e['keyPoints'])}")
            if not (4 <= len(e["questions"]) <= 6):
                print(f"  Q {nid}/{k}: {len(e['questions'])}")
            for i, q in enumerate(e["questions"]):
                if not (8 <= len(q["q"]) <= 240):
                    print(f"  QLEN {nid}/{k}#{i} q={len(q['q'])}")
                if not (20 <= len(q["a"]) <= 1500):
                    print(f"  ALEN {nid}/{k}#{i} a={len(q['a'])}")
                for kp in e["keyPoints"]:
                    if not (5 <= len(kp) <= 200):
                        print(f"  KPLEN {nid}/{k}: {len(kp)}")


def main() -> None:
    from m8_1 import NOTES as n81
    from m8_2 import NOTES as n82
    from m8_3 import NOTES as n83
    from m8_4 import NOTES as n84
    from m8_5 import NOTES as n85
    from m8_6 import NOTES as n86
    from m8_7 import NOTES as n87
    from m8_8 import NOTES as n88

    nodes8 = {**n81, **n82, **n83, **n84, **n85, **n86, **n87, **n88}
    OUT8.write_text(json.dumps({"roadmapId": "genai-16-levels", "nodes": nodes8}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    _check(nodes8, "L8")

    try:
        from m9_1 import NOTES as n91
        from m9_2 import NOTES as n92
        from m9_3 import NOTES as n93
        from m9_4 import NOTES as n94
        from m9_5 import NOTES as n95
        from m9_6 import NOTES as n96
        from m9_7 import NOTES as n97
        from m9_8 import NOTES as n98
        from m9_9 import NOTES as n99
    except ImportError as exc:
        print(f"L9 not ready: {exc}")
        return

    nodes9 = {**n91, **n92, **n93, **n94, **n95, **n96, **n97, **n98, **n99}
    OUT9.write_text(json.dumps({"roadmapId": "genai-16-levels", "nodes": nodes9}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    _check(nodes9, "L9")


if __name__ == "__main__":
    main()
