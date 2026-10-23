"""Compose deepened study notes from an existing seed plus module banks."""

from __future__ import annotations

import hashlib


def _h(s: str) -> int:
    return int(hashlib.sha256(s.encode()).hexdigest(), 16)


def compose(
    *,
    node: str,
    key: str,
    title: str,
    detail: str,
    seed_explain: str,
    seed_kps: list[str],
    seed_qs: list[dict],
    bank: dict,
    extra: dict | None = None,
    links: list[dict],
) -> dict:
    extra = extra or {}
    what = extra.get("what") or _what(title, detail, seed_explain, bank)
    why = extra.get("why") or _why(title, detail, node, bank)
    how = extra.get("how") or _how(title, detail, node, bank)
    fails = extra.get("fails") or _fails(title, detail, bank)
    line = extra.get("line") or _line(title, detail, bank)
    walk = extra.get("walk") or _walk(title, detail, node, bank)
    follow = extra.get("follow") or _follow(title, detail, bank)
    measure = extra.get("measure") or _measure(title, bank)
    explain = (
        f"## What it is\n\n{what.strip()}\n\n"
        f"## Why it matters on the job and in an interview\n\n{why.strip()}\n\n"
        f"## How it works + one small example\n\n{how.strip()}\n\n"
        f"## Failure modes\n\n{fails.strip()}\n\n"
        f"## What you would say in 30 seconds\n\n{line.strip()}\n\n"
        f"## A concrete walk-through\n\n{walk.strip()}\n\n"
        f"## Interview follow-up\n\n{follow.strip()}\n\n"
        f"## What I would measure\n\n{measure.strip()}\n"
    )
    kps = _kps(title, detail, seed_kps, extra.get("kps") or bank.get("kps") or [])
    qs = _qs(title, detail, seed_qs, extra.get("qs") or [])
    return {"explain": explain, "keyPoints": kps, "questions": qs, "links": links[:2] or bank.get("links") or []}


def _what(title: str, detail: str, seed: str, bank: dict) -> str:
    seed = (seed or "").strip()
    if seed and not seed.startswith("## "):
        body = seed
    elif seed:
        # already sectioned; take first section body
        parts = seed.split("## ")
        body = parts[1].split("\n", 1)[-1].strip() if len(parts) > 1 else seed
    else:
        body = f"**{title}.** {detail.strip() or bank.get('what_fallback', '').strip()}"
    extra = bank.get("what_extra", "").strip()
    return f"{body}\n\n{extra}\n\nThe checklist line to keep in your head is: {title}. {detail}".strip()


def _why(title: str, detail: str, node: str, bank: dict) -> str:
    job = bank.get("job", "").strip()
    interview = bank.get("interview", "").strip()
    return (
        f"On the job, {title[0].lower() + title[1:] if title else 'this'} is how you avoid a class of incidents this module exists to catch. "
        f"{job}\n\n"
        f"The concrete requirement is: {detail or title} If you cannot show an artefact for that sentence, you are still in demo mode.\n\n"
        f"In interviews, {interview} A strong answer names this item ({title}) and the next action, not a vendor logo."
    )


def _how(title: str, detail: str, node: str, bank: dict) -> str:
    steps = bank.get("steps", "").strip()
    example = bank.get("example", "").strip()
    return (
        f"Treat “{title}” as a control you can point at, not a slogan. {detail}\n\n"
        f"{steps}\n\n"
        f"{example}\n\n"
        f"Write the control in the release notes for {node}: what you changed, which gold set you scored, and how you would undo it. "
        f"If you cannot undo it, you do not yet operate it."
    )


def _fails(title: str, detail: str, bank: dict) -> str:
    a, b, c = bank.get("fails", ["A missing artefact.", "A silent change.", "A metric you never look at."])[:3]
    return (
        f"1. **Skipping “{title}” because the happy path works.** {detail or 'The checklist item is the control for the unhappy path.'} {a}\n\n"
        f"2. **Doing it once and never again.** A control that is not in CI, a runbook, or a dashboard dies after the demo. {b}\n\n"
        f"3. **Confusing a tool with the control.** Buying a vendor does not implement {title.lower() if title[0].isupper() else title}. {c}"
    )


def _line(title: str, detail: str, bank: dict) -> str:
    hook = bank.get("line", "").strip()
    return (
        f"{title}: {detail or hook} {hook} "
        f"I can show the artefact, the metric, and the undo. If I cannot, I will not call the system production-ready."
    )


def _walk(title: str, detail: str, node: str, bank: dict) -> str:
    walk = bank.get("walk", "").strip()
    return (
        f"You are on the hook for {node}. A reviewer asks you to prove “{title}.” "
        f"{walk}\n\n"
        f"You do not tell a story about intentions. You open the artefact that implements {detail or title} "
        f"You change one lever, re-run the same eval command, and show the before/after. "
        f"Then you undo the lever and show the metric return. That loop is the walk-through."
    )


def _follow(title: str, detail: str, bank: dict) -> str:
    follow = bank.get("follow", "").strip()
    return (
        f"They push back: “Do we really need {title.lower() if title[:1].isupper() else title}?” "
        f"{follow} "
        f"Your reply is the incident you would otherwise own: {detail or 'a silent change with no undo.'} "
        f"Then you offer the cheapest version of the control that still has an artefact and a metric."
    )


def _measure(title: str, bank: dict) -> str:
    m = bank.get("measure", "").strip()
    return f"{m} Also: time since you last exercised “{title}” on purpose (a drill), not only in an incident."


def _kps(title: str, detail: str, seed: list[str], extra: list[str]) -> list[str]:
    out: list[str] = []
    for x in list(seed) + list(extra):
        s = x.strip()
        if s and s not in out and 5 <= len(s) <= 200:
            out.append(s)
    for cand in (
        f"{title}: treat it as a named control with an undo.",
        (detail[:197] + "…") if len(detail) > 200 else (detail or f"Be able to demo {title} with an artefact."),
        "Record the artefact on the release or the trace, not only in a slide.",
        "A vendor name is not a substitute for this control.",
    ):
        c = cand.strip()
        if c and c not in out and 5 <= len(c) <= 200:
            out.append(c)
        if len(out) >= 6:
            break
    return out[:8] if len(out) >= 5 else (out + [f"Practise {title} until you can undo it."] * (5 - len(out)))[:8]


def _qs(title: str, detail: str, seed: list[dict], extra: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for q in list(seed) + list(extra):
        qq = (q.get("q") or "").strip()
        if not qq or qq.lower() in seen:
            continue
        seen.add(qq.lower())
        a = (q.get("a") or "").strip()
        if len(a) < 20:
            a = f"{title}: {detail or 'name the artefact, the metric, and the undo.'} Do not stop at a vendor name."
        out.append({"q": qq[:240], "a": a[:1500], "kind": q.get("kind") or "recall"})
        if len(out) >= 6:
            return out
    fillers = [
        {
            "q": f"What artefact proves you actually do “{title}”?",
            "a": f"Something a stranger can open: a config field, a CI log, a registry label, a trace attribute, or a runbook step. The requirement is: {detail or title}",
            "kind": "recall",
        },
        {
            "q": f"A teammate wants to skip “{title}” to ship Friday. What do you say?",
            "a": f"Name the incident that control exists to catch, offer the cheapest version that still has an undo, and refuse a silent deploy. {detail}",
            "kind": "apply",
        },
        {
            "q": f"You think you implemented “{title}” but cannot roll it back. What is missing?",
            "a": f"The undo path. A control without a reverse motion is a one-way edit. Add a label, pin, flag, or known tag so {title.lower()} can be reversed without a rebuild from memory.",
            "kind": "debug",
        },
        {
            "q": f"How would you explain “{title}” in one sentence in an interview?",
            "a": f"{title}: {detail or 'a named control with a metric and an undo.'} Then I would point at the artefact I used last week.",
            "kind": "recall",
        },
        {
            "q": f"What would you measure to know “{title}” is working a month later?",
            "a": f"A drill or a real use of the control, plus the metric it is supposed to move. If nobody has exercised it, assume it is dead. {detail}",
            "kind": "apply",
        },
    ]
    for q in fillers:
        if q["q"].lower() not in seen:
            out.append(q)
            seen.add(q["q"].lower())
        if len(out) >= 5:
            break
    return out[:6]
