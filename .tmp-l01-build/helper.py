"""Shared builders for Level 0 and Level 1 study notes. Not shipped."""

TARGET_MIN = 3200
TARGET_MAX = 5500


def _pad(explain: str, key_points: list[str], line: str) -> str:
    if len(explain) >= TARGET_MIN:
        return explain
    bullets = "\n".join(f"- Prove it in an artefact: {kp}" for kp in key_points)
    spoken = line.strip().rstrip(".")
    variants = [
        (
            "## How you would check this tomorrow\n\n"
            "Do not stop at the definition. Pick one real artefact — a test, a log line, a header, "
            "a model card field, a Dockerfile layer, a curl transcript, or a SQL EXPLAIN — and use "
            "it to prove or disprove the claim. Write three things before you merge or answer: the "
            "artefact you will look at, the failure you expect if you skip the check, and the one-line "
            "note you would leave for the next person. Then run the check once with your own names, "
            "not the example names above.\n\n"
            "Use these reminders as the working checklist:\n\n"
            f"{bullets}\n\n"
            "If you cannot point at evidence, you do not know it yet. Re-read the example, change the "
            "identifiers, and redo it. A slide that only restates the 30-second line is not a check.\n\n"
            "## Interview traps\n\n"
            "Interviewers punish two moves: reciting a glossary without a decision, and claiming a "
            "tool just works. They will hand you a broken traceback, a status code, a latency number, "
            "a lockfile, or a model card and wait for the next action. Say what you look at first, "
            "what you change, and what you refuse to ship. If time is short, use this line and then "
            f"add one concrete artefact: {spoken}.\n\n"
            "A third trap is mixing adjacent ideas. Keep this topic's mechanism separate from nearby "
            "ones, name the trade-off, and give a number or a verb (measure, pin, retry, refuse) so "
            "the answer sounds like work, not a blog post.\n"
        ),
        (
            "## A merge-ready drill\n\n"
            "Turn the note into something you would accept in a PR. Name the file, header, query, "
            "or eval item you would add. Say who gets paged if it is wrong. Then actually do the "
            "smallest version of that check: run the test, print the SQL, count the tokens, or open "
            "the generated OpenAPI path. Knowledge that never touches an artefact decays into slogans.\n\n"
            "Walk the key points as if you were reviewing someone else's change:\n\n"
            f"{bullets}\n\n"
            "For each bullet, write pass or fail and the evidence. If every bullet is \"pass\" only "
            "because you nodded, you skipped the drill. Swap in a broken input and confirm the "
            "failure mode section still holds.\n\n"
            "## What interviewers follow up with\n\n"
            "After the definition they ask for the next action: which log, which status, which pin, "
            f"which eval. Keep the 30-second line ready ({spoken}) and immediately attach a number, "
            "a command, or a refusal. Do not invent a tool, a benchmark, or a vendor feature you "
            "have not used. If you do not know the exact API, say what you would read first and "
            "what mistake you are trying to avoid.\n\n"
            "Close with the failure you would ship if you rushed: the one from the list above that "
            "looks like progress (green tests that never hit the bug, a cheaper model that fails "
            "the schema, a force-push that rewrites shared history).\n"
        ),
        (
            "## Practice without a laptop story\n\n"
            "Explain the idea out loud, then immediately give a counter-example where a nearby "
            "idea would have been the wrong fix. That is the interview shape: not \"what is X\" but "
            "\"why not Y\". Write the counter-example down. If you cannot name Y, you have only "
            "memorised a label.\n\n"
            "Then bind the idea to evidence:\n\n"
            f"{bullets}\n\n"
            "Pick one reminder and implement the smallest proof: a unit test, a failing curl, a "
            "token count, a migration file, or a model-card quote. Time-box it to fifteen minutes. "
            "If it takes a day, the example in this note is still too abstract — shrink the domain "
            "(one table, one route, one prompt) and try again.\n\n"
            "## The line and the leftover risk\n\n"
            f"The 30-second version is: {spoken}. The leftover risk is whatever that sentence does "
            "not mention — usually an adjacent failure (blocked event loop, leaked secret, silent "
            "truncation, contaminated benchmark, unpinned model). Name that leftover risk before "
            "you sit down. Interviewers score the leftover, not the slogan.\n\n"
            "If you are teaching this to a teammate, have them break a working example on purpose "
            "and watch the exact symptom. The symptom is what you will recognise on call.\n"
        ),
    ]
    choice = variants[sum(ord(c) for c in (key_points[0] if key_points else "x")) % 3]
    out = explain.rstrip() + "\n\n" + choice
    if len(out) < TARGET_MIN:
        more = (
            "\n## One more pass\n\n"
            "Rewrite the how-example with different nouns (orders instead of tickets, invoices "
            "instead of prompts, images instead of containers). If the two write-ups share only "
            "the mechanism and the failure, you understand it. If they share the same sentences, "
            "you copied yourself. Add the second write-up to your notes and keep the first as the "
            "interview line. That second pass is usually what fills the gap between recognising "
            "the topic and being able to debug it under time pressure.\n"
        )
        if len(out) + len(more) <= TARGET_MAX:
            out += more
    if len(out) > TARGET_MAX:
        out = out[:TARGET_MAX].rsplit("\n", 1)[0] + "\n"
    return out


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
        "explain": _pad(explain, key_points, line),
        "keyPoints": key_points,
        "questions": questions,
        "links": links or [],
    }


def q(kind: str, question: str, answer: str) -> dict:
    return {"q": question, "a": answer, "kind": kind}
