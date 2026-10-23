"""Shared builders for Level 13 study notes. Not shipped."""


def note(what: str, why: str, how: str, fails: str, line: str, kps: list[str], qs: list[dict], links: list[dict] | None = None) -> dict:
    explain = (
        f"## What it is\n\n{what.strip()}\n\n"
        f"## Why it matters on the job and in an interview\n\n{why.strip()}\n\n"
        f"## How it works + one small example\n\n{how.strip()}\n\n"
        f"## Failure modes\n\n{fails.strip()}\n\n"
        f"## What you would say in 30 seconds\n\n{line.strip()}\n"
    )
    return {
        "explain": explain,
        "keyPoints": kps,
        "questions": qs,
        "links": links or [],
    }
