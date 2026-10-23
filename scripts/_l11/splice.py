"""Splice extra original paragraphs into an existing study entry."""

from __future__ import annotations


def splice(entry: dict, extra_how: str = "", extra_why: str = "", extra_fail: str = "") -> dict:
    expl = entry["explain"]
    if extra_why:
        expl = expl.replace(
            "## How it works + one small example",
            extra_why.strip() + "\n\n## How it works + one small example",
            1,
        )
    if extra_how:
        expl = expl.replace(
            "## Failure modes",
            extra_how.strip() + "\n\n## Failure modes",
            1,
        )
    if extra_fail:
        expl = expl.replace(
            "## What you would say in 30 seconds",
            extra_fail.strip() + "\n\n## What you would say in 30 seconds",
            1,
        )
    out = dict(entry)
    out["explain"] = expl
    return out
