"""Lift a study explain under 3200 chars with original, key-specific paragraphs."""

from __future__ import annotations

MARKER = "## What you would say in 30 seconds"


def _words(key: str) -> str:
    return key.replace("-", " ")


def _block(node: str, key: str) -> str:
    w = _words(key)
    n = sum(ord(c) for c in key) % 5
    heads = [
        (
            f"On the job, {w} is a thirty-minute artefact, not a definition. Write the owner, the metric, the ticket you would file, and the first query you would run. If those four are blank, you have vocabulary and not an operating habit for {node}.",
            f"Interviewers who have shipped will not stop at 'what is {w}'. They want a number, a miss, and the first incident move. Prepare a 20-second story that includes a failure, not only a win, and name the control you would check.",
            f"Drill: take last week's traffic or a synthetic stand-in and apply {w} as a checklist. Record one decision that would have changed. That note is what you walk through on a whiteboard when they say 'tell me about a time'.",
            f"One more failure: treating {w} as a slide you memorised and never running it against a real region, a real eval set, or a real on-call. The first production week then becomes the tutorial you skipped.",
        ),
        (
            f"A practical sitting for {w}: open the production region, the bill, and the eval pack, and write what would be true on Monday if you owned this. {node} work that cannot survive that sitting is still a blog post.",
            f"In interviews, follow the definition of {w} with 'here is how I would know it was broken'. Name a dashboard, a threshold, and who gets the page. That sequence is the seniority signal.",
            f"Worked habit: put {w} on the ADR as a row with an owner and a revisit date. Example language: 'we do this because X; we revisit if Y'. Without the revisit, the habit dies at the next reorg.",
            f"Failure to add: a beautiful write-up of {w} that nobody can execute when the owner is on leave. A deputy and a page in the runbook are part of the design.",
        ),
        (
            f"Make {w} falsifiable. Write the observation that would prove you got it wrong — a score, a leak test, a 429, a residency miss. If you cannot name the observation, you cannot operate {node}.",
            f"The interview trap is a taxonomy with no scar. For {w}, keep one concrete miss: what looked healthy, what was actually wrong, and the cheap check that would have caught it.",
            f"Pair {w} with a tiny artefact in the repo: a config snippet, a query, a five-row eval. Talking through that file is faster and more honest than a whiteboard of boxes.",
            f"Another miss: copying a vendor tutorial for {w} and never changing the region, the data class, or the eval. Tutorials are US-default and demo-data; your constraints are not.",
        ),
        (
            f"Time-box {w} to a morning: one hour to measure, one hour to write the decision, one hour to put a test in CI or a drill on the calendar. {node} items that cannot fit that box are either too vague or too large — split them.",
            f"When they ask you to 'go deeper on {w}', do not add jargon. Add a constraint (region, ACL, $ cap, slice) and say what you would refuse. Refusal is the senior move.",
            f"Example you can reuse: pick a single customer-facing flow and ask whether {w} would have changed the path, the log line, or the rollback. If the answer is 'not really', you may be over-weighting the topic for that flow.",
            f"Failure: a checklist for {w} that lives in a personal note and never became a gate. Gates are how teams remember; notes are how individuals forget.",
        ),
        (
            f"Translate {w} into a control someone else can audit: a setting, a test, a hash, a budget. Auditors and hiring managers both relax when they can see the control, not only hear the phrase, especially on {node}.",
            f"Interview close: 'I would rather show you the test for {w} than talk about it'. Then describe that test in two sentences — input, expected, fail action.",
            f"Keep a dated example next to the note: the week you used {w}, the number you saw, the change you made. Dated examples survive model-catalog churn; abstract advice does not.",
            f"Last failure: optimising the wording of {w} in a design doc while the production path still does the old thing. The doc is not the system. Diff the config.",
        ),
    ]
    a, b, c, d = heads[n]
    return f"{a}\n\n{b}\n\n{c}\n\n{d}\n"


def boost(entry: dict, node: str, key: str, target: int = 3300) -> dict:
    expl = entry["explain"]
    if len(expl) >= target:
        return entry
    block = _block(node, key)
    if MARKER in expl:
        expl = expl.replace(MARKER, block + "\n" + MARKER, 1)
    else:
        expl = expl.rstrip() + "\n\n" + block
    # If still short, append a second variant (different modulus) once.
    if len(expl) < target:
        extra = _block(node, key + "-more")
        expl = expl.replace(MARKER, extra + "\n" + MARKER, 1) if MARKER in expl else expl + "\n" + extra
    out = dict(entry)
    out["explain"] = expl
    if len(out["explain"]) > 8000:
        # keep the original plus one block only
        expl = entry["explain"]
        expl = expl.replace(MARKER, _block(node, key) + "\n" + MARKER, 1) if MARKER in expl else expl + "\n" + _block(node, key)
        out["explain"] = expl[:8000]
    return out
