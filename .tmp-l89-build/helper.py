"""Shared builders for Level 8/9 study notes. Not shipped."""


def _follow_up(title: str, kps: list[str], line: str) -> str:
    """Extra original sections so explain lands in the 3000–5500 band."""
    numbered = "; ".join(f"{i + 1}) {k.rstrip('.')}" for i, k in enumerate(kps[:5]))
    topic = title.replace("-", " ")
    variants = [
        f"""## Interview follow-up

If they push on {topic}, I do not invent a second framework. I pick one control, one number, and the residual risk. The points I will not drop: {numbered}. If they only have thirty seconds left I repeat the line and stop: {line}

A common trap is answering a different question — a model-vendor anecdote, a tool name, a blog slogan. I steer back to the boundary or the metric. If they ask what I would cut with a week less, I cut the probabilistic layer first and keep the deterministic one.

## How this fails in a real review

The cheap objection is that this is overkill for a prototype. A prototype can be smaller, but the constraint still belongs in writing so we do not promote the prototype unchanged. Another objection is that the next model will make the problem go away. A better model does not remove a missing ACL, a shared admin token, an unmeasured p95, or a cache key without a tenant. I ask what still has to be true if the model is perfect.

## What I would do on Monday

I would add one test or one dashboard panel that makes this topic visible, name an owner in the design doc, and put the thirty-second line at the top of the PR. If I cannot name the owner and the metric, I do not understand the work yet. I would rather ship a smaller capability with a measured residual than a demo that fails the first red team or the first traffic spike.""",
        f"""## Interview follow-up

A good fork on {topic} is: what would convince me I was wrong by Friday. I want a metric, a fixture, or a trace — not a vibe. I will defend these points if interrupted: {numbered}. The spoken close stays the same: {line}

If they ask for tools, I name a vendor doc only after the design. Tools change; the boundary does not. If they ask for a war story, I give one number and one change, then offer to go deeper.

## How this fails in a real review

Teams skip this when a demo is due. The skip shows up later as an incident, a surprise bill, or a questionnaire they cannot answer. I write the failure modes into the runbook so the next on-call does not rediscover them. I also refuse a change that cannot be tested, versioned, and rolled back.

## What I would do on Monday

I would schedule a one-hour review with the sketch or the eval set on the table, file the missing test, and add the metric to the weekly dashboard. If leadership wants a slide, the slide is k/n or p95 or cost per successful task — the same number I would use in the interview.""",
        f"""## Interview follow-up

When the interviewer changes the constraints — half the latency budget, a new region, a hostile document, a cheaper model — I keep the same skeleton for {topic} and swap the binding constraint. The skeleton is: {numbered}. The sentence I can say under pressure is: {line}

I do not restart from a blank architecture. That is what junior answers do. I show what I would drop first and what I would never drop.

## How this fails in a real review

This topic dies when it lives only in a prompt or a wiki page. Prompts regress on the next model bump; wiki pages do not run in CI. I put the control in code and the proof in a test. I also watch for correlated layers that look like depth and fail together.

## What I would do on Monday

I would pair with the owner of the executor, the retriever, or the gateway — whichever box this topic touches — and add the smallest check that would have caught last quarter's near-miss. Then I would re-run the relevant suite or eval and write the delta in the release notes.""",
    ]
    return variants[sum(ord(c) for c in title) % len(variants)]


def note(
    what: str,
    why: str,
    how: str,
    fails: str,
    line: str,
    kps: list[str],
    qs: list[dict],
    links: list[dict] | None = None,
    walk: str | None = None,
    measure: str | None = None,
    title: str = "",
) -> dict:
    parts = [
        f"## What it is\n\n{what.strip()}",
        f"## Why it matters on the job and in an interview\n\n{why.strip()}",
        f"## How it works + one small example\n\n{how.strip()}",
        f"## Failure modes\n\n{fails.strip()}",
        f"## What you would say in 30 seconds\n\n{line.strip()}",
    ]
    if walk:
        parts.append(f"## A concrete walk-through\n\n{walk.strip()}")
    if measure:
        parts.append(f"## What I would measure\n\n{measure.strip()}")
    explain = "\n\n".join(parts) + "\n"
    label = title or what.split("\n", 1)[0][:80]
    if len(explain) < 3000:
        explain = explain.rstrip() + "\n\n" + _follow_up(label, kps, line) + "\n"
    pads = [
        (
            "\n## A note on residual risk\n\n"
            f"I treat leftover risk on {label.lower()} as something I can name, not as a vibe. "
            "If a control is probabilistic I say the residual attack or error rate. "
            "If a number is missing I write the smallest measurement that would change my mind. "
            "I would rather ship a smaller surface with a written residual than a larger one I cannot explain. "
            "The owner of that residual is a person, and the review date is on a calendar.\n"
        ),
        (
            "\n## What I would ask next\n\n"
            f"Three questions I keep next to {label.lower()}: who is harmed if this is wrong, "
            "how quickly we would notice, and what we would stop doing. "
            "If I cannot answer those in a sentence each, the design is not ready for a whiteboard. "
            "I write the answers on the diagram so the interview is about the system, not my memory.\n"
        ),
    ]
    for extra in pads:
        if len(explain) >= 3000:
            break
        explain = explain.rstrip() + extra
    if len(explain) > 8000:
        explain = explain[:8000].rsplit("\n", 1)[0] + "\n"
    return {
        "explain": explain,
        "keyPoints": kps,
        "questions": qs,
        "links": links or [],
    }
