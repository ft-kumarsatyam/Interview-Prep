"""Assemble Level 5 and 7 study notes and write the JSON files."""

from __future__ import annotations

import json
from pathlib import Path

from composer import deepen
from helper import entry
from m5_1 import NOTES as M51

ROOT = Path(__file__).resolve().parents[2]
EXISTING = {
    5: json.loads((ROOT / "data/genai-study/genai-16-levels/level-5.json").read_text(encoding="utf-8")),
    7: json.loads((ROOT / "data/genai-study/genai-16-levels/level-7.json").read_text(encoding="utf-8")),
}


def merge_node(level: int, node_id: str, scenes: dict[str, dict], full: dict[str, dict] | None = None) -> dict:
    out = dict(full or {})
    existing_node = EXISTING[level]["nodes"].get(node_id, {})
    for key, scene in scenes.items():
        out[key] = deepen(scene, existing_node.get(key))
    return out


def check(payload: dict, label: str) -> list[str]:
    problems = []
    n = 0
    for nid, notes in payload["nodes"].items():
        for k, e in notes.items():
            n += 1
            el = len(e["explain"])
            if el < 3000:
                problems.append(f"SHORT {nid}/{k}: {el}")
            if el > 5500:
                problems.append(f"OVER_TARGET {nid}/{k}: {el}")
            if el > 8000:
                problems.append(f"OVER_MAX {nid}/{k}: {el}")
            if not (5 <= len(e["keyPoints"]) <= 8):
                problems.append(f"KP {nid}/{k}: {len(e['keyPoints'])}")
            if not (4 <= len(e["questions"]) <= 6):
                problems.append(f"Q {nid}/{k}: {len(e['questions'])}")
            if len(e.get("links", [])) > 6:
                problems.append(f"LINKS {nid}/{k}")
    print(f"{label}: {n} notes, {len(problems)} problems")
    for p in problems:
        print(" ", p)
    return problems


def main() -> None:
    from scenes_m5a import SCENES as S5A
    from scenes_m5b import SCENES as S5B
    from scenes_m7a import SCENES as S7A
    from scenes_m7b import SCENES as S7B

    nodes5 = dict(M51)
    for nid, scenes in {**S5A, **S5B}.items():
        nodes5[nid] = merge_node(5, nid, scenes)
    nodes7 = {}
    for nid, scenes in {**S7A, **S7B}.items():
        nodes7[nid] = merge_node(7, nid, scenes)

    p5 = {"roadmapId": "genai-16-levels", "nodes": nodes5}
    p7 = {"roadmapId": "genai-16-levels", "nodes": nodes7}
    out5 = ROOT / "data/genai-study/genai-16-levels/level-5.json"
    out7 = ROOT / "data/genai-study/genai-16-levels/level-7.json"
    out5.write_text(json.dumps(p5, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    out7.write_text(json.dumps(p7, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {out5}")
    print(f"wrote {out7}")
    check(p5, "L5")
    check(p7, "L7")


if __name__ == "__main__":
    main()
