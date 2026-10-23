from composer import sc
from helper import L

def Q(q, a, kind):
    return {"q": q, "a": a, "kind": kind}

def F(a, b, c):
    return f"1. **{a}**\n\n2. **{b}**\n\n3. **{c}**"

SCENES = {
"m5-2": {
"the-react-pattern": sc(
 why="""ReAct is the pattern interviewers name when they ask how an agent thinks. The useful claim is not the acronym. It is that reasoning without a tool is just chain-of-thought, and a tool without a reason is a blind call. Interleaving them grounds the next thought in an observation.

On the job this is also the trace format operators can read. A list of tool names is not enough; a thought that says why this search, then the observation, then the next thought, is how you debug a wrong turn at step 4.""",
 how="""Keep the loop even when the provider hides “Thought” inside a reasoning channel.

Example: “Which team won the year the Eiffel Tower opened?”
1. Thought: I need the year. Action: search(“Eiffel Tower opened”). Observation: 1889.
2. Thought: look up the champion that year. Action: search(“1889 league champion”). Observation: … 
3. Final answer with both facts cited.

Modern APIs emit structured tool calls plus optional thinking text. Your runtime still does Action → Observation. If thoughts are hidden, log the tool name, arguments and a one-line “why” you ask the model to put in a comment field so the trace stays readable.""",
 failures=F("Thought that ignores the last observation. The model rationalises a plan it already liked. Make errors loud and instruct it to address the observation first.",
 "Action with no thought and no argument check. You cannot tell why it searched that string.",
 "A long thought that eats the window. Cap thought tokens; the observation matters more."),
 line="""ReAct is thought, action, observation, repeat. CoT reasons without acting. I keep the loop even when thinking is implicit, and I log a why so a wrong step is visible.""",
 walk="""A docs bot used to call search three times with the same query. You require a one-line thought before each call and reject identical (tool, args). Repeat rate falls from 31% to 4% and answers start citing the observation instead of memory.""",
 follow="""They ask if reasoning models make ReAct obsolete. Say: the channel may change; the loop does not. You still execute, observe and stop.""",
 measure="""Paired thought-action rate, identical-call rate, and success when the needed fact is not in the model’s memory.""",
 kps=["ReAct interleaves thought, action and observation.", "Observations ground the next thought; CoT never leaves the model.", "Native tool calling keeps the same loop with implicit thoughts.", "Log a why with each call so traces are readable.", "Cap thought tokens; do not let reasoning crowd out observations.", "Identical (tool, args) is a loop, not thoroughness."],
 qs=[Q("What does ReAct add over plain chain-of-thought?", "It interleaves reasoning with tool actions and feeds observations back, so later thoughts are grounded in external data instead of memory alone.", "recall"),
     Q("An agent's traces show confident thoughts that ignore a tool error. How do you improve it?", "Make the error unmissable, instruct the model to address observations first, re-plan after failure, and eval on traces with injected errors.", "debug"),
     Q("Why keep a thought field when the API already returns tool calls?", "Operators need a why. A tool name alone does not explain a wrong search. A one-line thought or comment field makes step 4 debuggable.", "apply"),
     Q("When would you skip an explicit thought step?", "Tiny single-tool tasks where the call is obvious and latency matters. You still log the action and observation.", "apply")],
 links=[L["oai_tools"], L["ant_tools"]],
),
"writing-the-loop-by-hand-first": sc(
 why="""Frameworks hide the awkward parts: call ids, error serialisation, truncation, timeouts. If you have never written the 40-line loop, you cannot tell whether LangGraph is helping or only renaming your bugs.

Interview panels still ask you to sketch this on a whiteboard. The people who pass name MAX_STEPS, try/except around tools, and one result per call id.""",
 how="""Write it before you import a graph library.

```
messages = [system, user]
for step in range(MAX_STEPS):
    reply = model(messages, tools)
    messages.append(reply)
    if not reply.tool_calls:
        return reply.text
    for call in reply.tool_calls:
        try:
            out = run(call)
        except Exception as e:
            out = typed_error(e)
        messages.append(tool_result(call.id, truncate(out)))
return partial_fallback(messages)
```

You will hit: two calls in one turn, a 30k result, a timeout, a missing id. Those are the production issues. Log step, tool, arg hash, result tokens.""",
 failures=F("Handling only the first tool call. The second id never gets a result and the next request is invalid.",
 "Letting exceptions escape the loop. One bad tool kills the run instead of becoming an observation.",
 "No fallback when the cap hits. The user sees a 500 instead of a partial answer."),
 line="""I write the loop by hand first: messages, cap, execute, one result per call id, truncate, fallback. Then I adopt a framework for persistence and interrupts, not for the primitive.""",
 walk="""A new hire starts in LangGraph and cannot explain a missing tool result. You pair-write the 50-line loop. They find the bug: they appended one result for two calls. After that, the graph version is readable because they know the primitive.""",
 follow="""They ask if this is wasted time. Say: an afternoon now, or a week later when you cannot read a vendor trace.""",
 measure="""Whether every engineer on the team can write the loop from memory, and whether traces always contain one result per call id.""",
 kps=["A working loop is about 40–60 lines.", "Match every tool call id with exactly one result.", "Catch tool errors and return them as observations.", "Truncate results; cap steps; return a partial fallback.", "Hand-writing it teaches what frameworks hide.", "Whiteboard the stop conditions and error path."],
 qs=[Q("Outline the code of a minimal tool-calling agent loop.", "Keep messages; loop up to MAX_STEPS; append the model reply; if no tool calls, return text; else run each call in try/except, append one result per id; return a fallback at the cap.", "recall"),
     Q("Your hand-written loop crashes on a reply with two tool calls. What is a likely bug?", "It handled only the first call or failed to append a result for every id. Iterate all calls and append one result each.", "debug"),
     Q("Where do timeouts belong in the hand-written loop?", "Around each tool, and around the whole loop. A hung HTTP call should become a typed error observation, not a stuck worker.", "apply"),
     Q("What do you implement before adding streaming or persistence?", "Correct call-id pairing, truncation, caps and a fallback. Streaming a wrong loop just streams a wrong loop.", "apply")],
 links=[L["oai_tools"], L["ant_tools"]],
),
"step-by-step-vs-plan-first": sc(
 why="""Choosing reactive versus plan-first is a control-flow decision, not a model-quality decision. Reactive (classic ReAct) picks only the next action. Plan-first writes a list, then executes. Interviewers want the trade-off: coherence and reviewability versus brittleness when step 1 surprises you.

On the job, plan-first is how you put a human in front of side effects. Reactive is how you survive an unknown filesystem.""",
 how="""Default to a short hybrid.

1. Draft a 3–7 step plan as structured state.
2. Execute the next pending step reactively.
3. Compare observation to the step’s expected output.
4. If it contradicts, mark the plan stale and re-plan; do not blindly continue.

Use plan-first when steps are mostly known and you want approval. Use pure reactive when the environment is hostile to prediction (a live site, an unfamiliar repo). Never freeze a 20-step plan with no revision trigger.""",
 failures=F("A beautiful plan executed after the world changed. Step 1 returned “no such table” and steps 2–8 still ran.",
 "Pure reactive wander on a task that had a known skeleton. Cost tails grow and you cannot show a reviewer a plan.",
 "Re-planning every step. You paid for a plan and then threw it away."),
 line="""Reactive picks the next action; plan-first writes the list. I draft a short plan, execute, and re-plan when the observation kills an assumption. I show the plan when I need approval.""",
 walk="""A migration agent planned eight ALTERs. Step 1 discovered the column already existed. Without revision it kept going and failed loudly. You add a contradiction trigger and a three-step re-plan. The next run skips the exists case and finishes in four steps.""",
 follow="""They ask which is “more agentic.” Say: neither. Agency is unknown edges. This is how you structure thinking inside the loop.""",
 measure="""Re-plan rate, success after contradiction, and human-approval time when a plan is shown first.""",
 kps=["Reactive: next action only; plan-first: list then execute.", "Plans give structure and a review point; reactive adapts.", "Hybrid with a contradiction trigger is the usual default.", "Keep the plan as explicit state with step statuses.", "Do not freeze a long plan with no revision.", "Approval belongs in front of a plan, not after a surprise side effect."],
 qs=[Q("Compare plan-then-execute with step-by-step ReAct.", "Plan-then-execute drafts steps up front for structure and review but is brittle if early results invalidate it. ReAct chooses each action from fresh observations, which adapts but can drift and cost more tokens.", "recall"),
     Q("A task needs human approval before any side effect, and steps are mostly known. Which style?", "Plan-first: generate the plan, show it, then execute with a re-plan trigger. The review sits before consequential actions.", "apply"),
     Q("The plan said “read file A then B” but A does not exist. What should happen?", "Treat it as a contradiction, mark the plan stale, and re-plan instead of executing B as if A had been read.", "debug"),
     Q("When is pure reactive the better default?", "When you cannot enumerate useful steps — unfamiliar repo, live UI — and a pre-written list would be fiction.", "recall")],
 links=[L["oai_agents"], L["ant_agents"]],
),
"decomposing-and-revising-plans": sc(
 why="""A goal is not a step. “Research the vendor” will produce a wander. Decomposition is making each step small enough to have an input, an expected output and a check. Revision is updating the list when the check fails.

Interviewers listen for “success check” and “visible plan state.” If your plan is only prose in the prompt, it will be marked done without evidence.""",
 how="""Store the plan as data: `[{id, action, expect, status}]` with statuses pending / done / failed / skipped.

Granularity matches tools: `search("SOC2 report 2025")` is a step; `do diligence` is not. Independent steps get a `parallel` flag.

Revise when: tool error, empty result, contradiction, scope change, budget nearly gone. Do not revise because the model feels like a new idea. After revision, keep completed evidence; do not redo finished checked steps.""",
 failures=F("Steps with no expect field. The model marks them done because it wrote a paragraph.",
 "Over-decomposition: forty micro-steps that waste calls.",
 "Revision that forgets done work and repeats paid tools."),
 line="""I break a goal into checkable steps at tool granularity, keep the plan as state, and revise when the observation disagrees. Done means the check passed, not that the model said so.""",
 walk="""“Prepare a vendor brief” becomes: fetch filings, extract risk factors, compare to last year, write two pages. Step 2 returns an empty extract. You fail that step, re-plan to try the HTML source, and keep step 1’s filings. The brief cites real excerpts.""",
 follow="""They ask who writes the first plan. Say: the model can draft it, but the schema and the revise triggers are mine.""",
 measure="""Fraction of steps with a check, false-done rate, and wasted-repeat rate after revision.""",
 kps=["Each step needs input, expected output and a success check.", "Granularity should match a tool call, not a wish.", "Keep the plan as structured state with statuses.", "Re-plan on failure, contradiction, scope or budget.", "Do not redo steps whose checks already passed.", "Done is verified, not declared."],
 qs=[Q("What makes a plan step well-formed, and when should an agent revise the plan?", "Input, expected output, success check, tool-sized granularity. Revise on failure, empty or contradictory results, scope change or budget pressure.", "recall"),
     Q("The agent marks all plan steps done but the output is wrong. What process fix do you add?", "Require the check before status=done, add a final check against the original goal, and surface unverified steps. A separate verifier call helps.", "debug"),
     Q("Why store the plan outside the chat prose?", "Prose gets summarised away and statuses get faked. A structured list survives trimming and can be shown to a reviewer.", "apply"),
     Q("How do you avoid redoing finished work after a re-plan?", "Carry forward steps with passed checks and their artefacts. The new plan starts from remaining gaps.", "apply")],
 links=[L["oai_agents"], L["lg"]],
),
"reflection-self-correction": sc(
 why="""Reflection is a second pass that critiques a draft or a trajectory and then edits. It is fashionable and often useless. It works when the critique sees a new signal: test failures, a schema error, a compiler log, a retrieved passage. It fails when you ask the model to “think harder” at the same text.

Interviews: “when would you not reflect?” Latency paths, or no verifier.""",
 how="""Separate generate, critique and revise. Cap at 1–3 rounds.

Code agent: generate → run tests → feed failures → targeted patch → rerun. That is reflection with a spine.

Support draft: generate → checklist (must mention refund window, must not promise a date) → revise. The checklist is the rubric.

Skip reflection on a classifier that already has a programmatic check. Do not add a critic model just to look serious.""",
 failures=F("Self-critique with no new bits. The model congratulates itself or talks itself out of a correct answer.",
 "Unbounded rounds. Cost doubles and the third revise introduces a new bug.",
 "Critique mixed into the same prompt as the draft so the model cannot disagree with itself."),
 line="""Reflection needs a rubric or a test, not “think harder.” I cap rounds and keep critique separate from the draft. If I cannot name the signal, I do not add the call.""",
 walk="""A SQL agent’s self-review never caught a missing WHERE. You pipe EXPLAIN and a row-count guard into the critique. Catch rate on the golden set goes from 12% to 61%. You drop the ungrounded “please double-check” pass.""",
 follow="""They mention Reflexion papers. Say: the lesson is storing a textual lesson from failure. The lesson still needs a real failure signal.""",
 measure="""Pass-rate delta with versus without reflection, extra latency, and how often round 2 changes a correct answer into a wrong one.""",
 kps=["Reflection works when the critique sees external evidence.", "Pure self-critique is weak and can degrade good answers.", "Cap rounds at one to three and measure the gain.", "Keep critique and revision as distinct steps.", "Skip it on latency-sensitive or already-checked tasks.", "A rubric or a test is the spine."],
 qs=[Q("When is reflection effective and when is it not?", "Effective with tests, validators or retrieved evidence. Weak when the model only rereads its answer. It always costs latency.", "recall"),
     Q("Design a reflection loop for a code-generation agent.", "Generate, run tests and linter, feed failures back, request a targeted fix, rerun. Cap about three rounds and return the best attempt plus a failure report.", "apply"),
     Q("Your critic pass doubles cost and accuracy is flat. What next?", "Slice the eval. Keep reflection only on the failing slice. Drop it elsewhere.", "debug"),
     Q("Why separate the critic prompt from the generator prompt?", "So the critic can disagree. A single prompt tends to defend the draft it just wrote.", "recall")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"stopping-conditions-loop-protection": sc(
 why="""A loop without a fence is an unbounded bill and a stuck UI. Prompts that say “stop after five tries” are wishes. Production stop rules live in the runtime: max steps, max tokens or dollars, wall time, per-tool time, consecutive errors, identical-call detection.

This is a reliability question as much as an agent question. Interviewers want graceful exit, not just a break.""",
 how="""Layer the guards.

Natural: model returns text with no tool call.
Hard: steps, cost, wall clock, N identical (tool, args), N errors in a row.
Progress: plan status must change every k steps or you nudge, then stop.

On forced stop: return the best partial artefact, list what is unfinished, log the reason. Do not 500. Idempotent tools make the last retry safe.""",
 failures=F("Prompt-only caps. The model miscounts and you pay for 80 steps.",
 "Hard kill with no partial. The user loses ten minutes of work.",
 "No identical-call detector. The same search runs until the cost cap, which is later than you wanted."),
 line="""Stops are code: steps, cost, time, identical calls, cancel. The model may propose done; I always keep a fence and a partial-answer exit.""",
 walk="""A research agent burned $18 overnight on a repeated empty search. You add identical-call N=2, max_steps=15, and a partial memo. The next stuck run ends at $0.40 with “three sources, search stalled.”""",
 follow="""They ask about user cancel. Say: it is a stop condition equal to the others, and it must report already_happened.""",
 measure="""Forced-stop rate, identical-call rate, median and p95 cost, and whether forced stops include a partial artefact.""",
 kps=["Natural stop plus hard step, cost and time limits.", "Detect repeated identical calls and stalled plans.", "Enforce limits in the runtime, not only in the prompt.", "Forced stop returns a partial result and a reason.", "User cancel is a first-class stop.", "Idempotent tools make retries and stops safer."],
 qs=[Q("List stopping conditions and loop protections for a production agent.", "Natural completion, max steps, token/cost budget, wall-clock and per-tool timeouts, consecutive errors, identical-call detection, progress checks, cancel, and a graceful partial exit.", "recall"),
     Q("Why is telling the model 'stop after 5 attempts' insufficient?", "Prompts are advisory. The model can miscount or ignore them. A runtime counter must break the loop.", "debug"),
     Q("What should a user receive when the cost cap fires at step 12?", "The best partial artefact, a list of unfinished work, and the reason “cost cap.” Not an opaque error.", "apply"),
     Q("How do you detect a loop that changes the query by one character?", "Hash normalised args, look at result hashes, and require plan progress. Near-duplicates count as repeats.", "apply")],
 links=[L["oai_agents"], L["lg"]],
),
"what-planning-costs": sc(
 why="""Planning and reflection feel free in a notebook and are a line item in production. Extra calls re-send history, so cost grows faster than “one more completion.” Latency is additive. Errors compound: if each step is 90% reliable, ten steps are about 35%.

Interviews want this arithmetic, then the mitigation: cheaper executor, cache, router around easy queries.""",
 how="""Price a change before you add it.

Measure a 50-case set with and without a planner. Record success, p95 latency, tokens, dollars. Keep planning only on the slice that gains.

Mitigations: strong model plans, cheap model executes; prompt cache the static prefix; parallel independent steps; cap plan length; router that skips planning for “reset my password.”

Quote the trade-off as accuracy gain per added second and dollar, not as a vibe.""",
 failures=F("Adding a planner because a paper said so, with no before/after.",
 "Ignoring quadratic history cost. Step 12 resends steps 1–11 including tool dumps.",
 "Using the expensive model for every execute step after a heavy plan."),
 line="""Planning costs tokens, seconds and variance. I measure success versus that cost, route easy work around it, and use a cheaper executor after a short plan.""",
 walk="""You add a critic to every ticket. Cost doubles, accuracy +1.2 points, p95 +4s. You keep the critic only on “legal” and “refund” intents. Average cost returns near baseline; those slices keep the gain.""",
 follow="""They ask about 0.9^10. Say it is illustrative compounding, then show your own per-step fail rate from traces.""",
 measure="""Delta success, p95 latency, dollars per success, and the fraction of traffic that still hits the planner.""",
 kps=["Every extra plan or critique is a billed call plus replayed history.", "Per-step errors compound along the trajectory.", "Measure accuracy gain per added cost and latency.", "Tier models: expensive plan, cheap execute.", "Route simple queries around planning.", "Trim or cache history so cost does not grow with the square of steps."],
 qs=[Q("Why does error compound in long agent trajectories?", "End-to-end success is roughly the product of per-step rates, so 0.9 to the 10th is about 0.35. Early mistakes also poison later context.", "recall"),
     Q("How would you decide whether adding a planning step is worth it?", "Run the same eval with and without it. Compare success, cost and latency by slice. Keep it only where the gain pays.", "apply"),
     Q("Cost grew faster than step count after you added planning. Why?", "Each step resends history. Tool dumps accumulate. Cache or trim, and do not keep full dumps in the window.", "debug"),
     Q("Name two mitigations besides “use a smaller model for everything.”", "Prompt-cache the prefix; run independent steps in parallel; skip planning via a router; cap plan length.", "recall")],
 links=[L["oai_prompt"], L["oai_agents"]],
),
"reflection-that-actually-checks-work": sc(
 what="""A second pass is not automatically quality. **Reflection that actually checks work** uses a rubric, a test, a schema, a compiler, or a retrieved source. “Think harder” is a longer first pass. The critic must be able to fail the draft against something the generator did not already see, or against a checklist the product owns.

This is the interview refinement of reflection: they have heard “self-refine.” They want to know you will not bill for a pep talk.""",
 why="""Teams add a critic node and ship it because the demo sounds careful. Then evals are flat and latency is not. The missing piece is the check. On the job you either plug in a real oracle (tests, EXPLAIN, JSON schema, policy clause) or you delete the extra call.

Interviewers will ask you to design the critic for a concrete task. If your answer is another unconstrained model, you failed the question.""",
 how="""Pick the oracle first.

- Code: unit tests and linter. The critic prompt only ranks which failure to fix first.
- Extract: schema validator. Invalid JSON never reaches a “style” critic.
- RAG answer: claim-level entailment against retrieved chunks, or a required citation id.
- Email: a checklist (no promised dates, refund window mentioned).

Wire generate → oracle → (optional model critic that reads oracle output) → revise. Cap rounds. Store the oracle transcript in the trace.""",
 failures=F("Critic with the same context as the generator and no oracle. Scores stay high and wrong.",
 "Oracle ignored: tests failed and the model still said “looks good.” The runtime must refuse to mark success.",
 "Rubric written after the fact to match a favourite draft."),
 line="""A second pass needs a rubric or a test. I run an oracle the generator cannot ignore, then let a critic use that transcript. No oracle, no extra call.""",
 walk="""A “reviewer agent” blessed refund emails that promised Friday. You add a checklist oracle: forbidden phrases, required policy sentence. The model critic now sees a fail. Promised-date rate goes from 11% to 0.4% on the set.""",
 follow="""They ask if a stronger model can be its own oracle. Say: only for taste. For facts, format and safety I want an independent check.""",
 measure="""Oracle fail rate caught by the loop, residual fails that reached users, and extra seconds per gained point.""",
 kps=["A second pass needs an oracle: test, schema, rubric or source.", "“Think harder” is not a check.", "The runtime must refuse success when the oracle fails.", "Critic prompts read the oracle transcript, not only the draft.", "Write the rubric before you look at favourite outputs.", "Delete the extra call when the oracle already decides."],
 qs=[Q("What turns reflection into an actual check?", "An oracle the generator cannot ignore: tests, schema, citation entailment, or a product checklist. The critic uses that transcript.", "recall"),
     Q("The critic says pass while unit tests fail. What is broken?", "Success is tied to the model’s opinion. Bind the run status to the oracle. The critic may only prioritise which fail to fix.", "debug"),
     Q("Design a check for a grounded FAQ answer.", "Split claims; require each to be entailed by a retrieved chunk id; fail the run if any claim lacks support.", "apply"),
     Q("When do you skip a model critic entirely?", "When the oracle is decisive — schema valid/invalid, tests pass/fail — and there is nothing subjective left to say.", "apply"),
     Q("Why write the rubric before reviewing drafts?", "Otherwise you tune the rubric to the outputs you already like and the check stops discriminating.", "recall")],
 links=[L["oai_evals"], L["ant_eval"]],
),
"hard-stop-conditions": sc(
 what="""**Hard stop conditions** are limits the model cannot talk its way around: max steps, max cost or tokens, max wall time, and a user cancel. Hopeful loops (“it will finish when it is done”) are how overnight bills happen. Soft advice in the prompt can sit beside these; it cannot replace them.

A hard stop must still be polite: return a partial artefact and a reason the product can show.""",
 why="""This is the production version of loop protection. Interviewers who have been on-call will ask what happens at the cap. If you say “we raise,” you have not designed the stop. If you say “partial answer, reason, already_happened,” you have.

On the job, product and finance will ask for the number. Pick it from p95 traces plus margin, not from a blog.""",
 how="""Set three numbers per agent: max_steps, max_usd, max_seconds. Load them from config. The worker checks after every step. Cancel is a flag the UI sets; the worker reads it the same way.

When any fire: stop scheduling tools, wait briefly for in-flight calls, persist state, emit `run_terminal` with the reason and the artefact so far. Do not retry the whole run automatically — that bypasses the cap.

Tune from data: if forced-stop is 20% you are too tight or the agent is lost; if 0% and p99 is 3× the cap you are too loose.""",
 failures=F("Cap only in the prompt. The model politely continues.",
 "Cap without a partial. Users lose the useful half of the work.",
 "Auto-retry after a cost cap, which doubles the spend you just stopped."),
 line="""Max steps, max cost, and a user cancel beat a hopeful loop. I enforce them in the worker and always return a partial with a reason.""",
 walk="""p95 of a research agent is 11 steps / $0.42 / 38s. You set 20 / $1.00 / 90s. A runaway news loop hits $1.00 at step 16 and returns a dated memo. Finance sees a bounded tail instead of a $12 outlier.""",
 follow="""They ask who owns the numbers. Say: engineering proposes from traces, product accepts the user-visible cutoff, finance accepts the dollar tail.""",
 measure="""Forced-stop rate by reason, p95/p99 cost versus cap, partial-artefact rate on forced stops, cancel-to-halt time.""",
 kps=["Hard stops: max steps, max cost, max time, user cancel.", "Enforce in the worker, not in the prompt.", "Forced stop returns a partial artefact and a reason.", "Do not auto-retry a run that already hit a cost cap.", "Tune caps from p95 traces plus margin.", "Cancel is equal to the other hard stops."],
 qs=[Q("Name three hard stop conditions that must live in code.", "Max steps, max cost or tokens, max wall time, plus user cancel. Prompt advice is not a stop.", "recall"),
     Q("What do you return when max cost fires?", "A partial artefact, unfinished work, and the reason. Persist state. Do not 500 and do not auto-retry the whole run.", "apply"),
     Q("Forced-stop rate is 0% but one run cost 20× the median. What is wrong?", "The cap is missing or far too high. Set it from p95 plus margin and alert on near-cap runs.", "debug"),
     Q("Who should accept the dollar cap?", "Finance owns the tail they will pay; product owns the user-visible cutoff; engineering proposes numbers from traces.", "apply"),
     Q("Why is user cancel a hard stop rather than a UI detail?", "If the worker keeps running, the user did not cancel. The flag must halt scheduling like any other cap.", "recall")],
 links=[L["oai_agents"], L["lg"]],
),
},
"m5-3": {
"from-tool-calling-to-agentic-tool-use": sc(
 why="""Level 2 tool calling is usually one or two calls in a known order. Agentic tool use is the model repeatedly choosing among a set of capabilities until it stops. The runtime does not change: you still execute, you still validate. The policy now owns the sequence.

Interviewers use this to see if you know the model never runs the function. Your process does. That is how you keep permissions.""",
 how="""Offer a small catalogue. Each turn the model may emit zero or more calls. You run them (parallel if independent), append results, call again.

Example: a billing agent with `lookup_account`, `list_invoices`, `explain_charge`. The user says “why was I billed twice.” The model looks up, lists, then explains. You did not hard-code that order.

Keep the Level 2 habits: JSON schema, strict argument validation, typed errors. Add the Level 5 habits: caps, truncation, confirm on writes.""",
 failures=F("Treating the model as if it executed the tool. You lose the ability to deny a call.",
 "Dumping thirty tools into every turn. Selection collapses.",
 "Forgetting that repeated choice needs a stop. This is an agent loop."),
 line="""Tool calling is how a model requests an action. Agentic use is repeated choice among tools until a stop. I still execute every call, validate args, and cap the loop.""",
 walk="""You promote a one-shot `lookup` into a four-tool agent. Selection accuracy drops. You cut to the three tools the task needs and write when-not-to-use lines. Accuracy returns; median steps stay at 3.""",
 follow="""They ask if parallel calls are agentic. Say: parallelism is a runtime optimisation. Agency is who chooses the next tool.""",
 measure="""Tool-selection accuracy, steps per success, and how often a denied call was attempted.""",
 kps=["The model only requests calls; your runtime executes them.", "Agentic use is repeated selection until a stop.", "Keep schemas, validation and typed errors from Level 2.", "Expose a small relevant tool set per task.", "Parallelism is not agency; choice of the next tool is.", "Writes still need permission even in an agent loop."],
 qs=[Q("In agentic tool use, which statement is correct about execution?", "The application executes the tool and returns the result. The model only requested the call.", "recall"),
     Q("How is agentic tool use different from a single function call?", "The model may choose tools repeatedly, in an order you did not hard-code, until it stops or you cap it.", "recall"),
     Q("Selection gets worse after you add 15 tools. First fix?", "Expose a task-specific subset, sharpen descriptions, namespace names. Do not start with a bigger model.", "debug"),
     Q("Why do Level 2 schema habits still matter here?", "Bad arguments waste a whole extra turn in a loop. Validation and typed errors keep the trajectory short.", "apply")],
 links=[L["oai_tools"], L["gem_fc"]],
),
"designing-tools-for-agents": sc(
 why="""Models pick tools from names, descriptions and schemas the way a new teammate reads a README. Vague overlap (“searches data”) causes the wrong call. Huge untyped results cause context death. Cute names (`do_it`) do not survive a second tool.

This is API design for a non-human caller. Interviewers want examples of a good schema and a useful error.""",
 how="""For each tool write: name in verb_noun, description with when-to-use and when-not, JSON schema with types and enums, a small successful example, and error shapes the model can act on (`not_found`, `invalid_arg`, `transient`).

Prefer many small tools over one `swiss_army` with a mode enum the model will get wrong. Return what the model needs to decide the next step, not the entire database row.

Review descriptions the way you review public APIs. They are prompts.""",
 failures=F("Two tools whose descriptions are paraphrases. Selection becomes a coin flip.",
 "Errors like “failed.” The model retries blindly.",
 "A tool that returns 50k tokens of JSON “to be complete.”"),
 line="""I design tools as a tiny API: clear name, when-to-use, typed schema, small result, typed error. Descriptions are prompts. Overlap is a bug.""",
 walk="""`search` and `lookup` both said “find customer data.” The agent picked at random. You rewrite: search is fuzzy name; lookup is exact id. You add enums for status. Wrong-tool rate halves on the set.""",
 follow="""They ask how many tools. Say: as few as the task needs. I split when descriptions start to overlap or when permissions differ.""",
 measure="""Selection accuracy, argument-schema fail rate, median result tokens, and retries after typed versus untyped errors.""",
 kps=["Name, description, schema, small result, typed error.", "Write when-to-use and when-not-to-use.", "Descriptions are prompts; review them like APIs.", "Prefer small tools over a mode-switching mega-tool.", "Return the next-step facts, not the whole row.", "Error shapes should tell the model whether to retry, fix args, or stop."],
 qs=[Q("What belongs in a production tool definition?", "A verb_noun name, when-to-use and when-not, a typed schema, a compact result, and error codes the model can act on.", "recall"),
     Q("Two tools both “search data.” What do you change first?", "Differentiate descriptions and inputs. Give each a distinct job and an example. Measure selection again.", "debug"),
     Q("Why is a single mega-tool with a mode enum usually worse?", "The model misses the mode and you lose permission boundaries. Small tools fail closed and select more cleanly.", "apply"),
     Q("What makes a tool error useful?", "A code and a hint: invalid_arg with the field, not_found with the id, transient with retry-after. Not the string “error.”", "apply")],
 links=[L["oai_tools"], L["ant_tools"]],
),
"improving-selection-arguments": sc(
 why="""Wrong tool or wrong argument is the most common silent failure. The user sees a fluent answer about the wrong customer. Improving selection is description work, catalogue size, and examples. Improving arguments is schema tightness, defaults you do not silently invent, and validation before execute.

Measure both. Do not only read traces when someone complains.""",
 how="""Log every call: chosen tool, args, validator result, whether a human would have picked it (offline labels).

Fixes that move the number: fewer tools; contrastive descriptions; one-shot examples in the tool list; enums instead of free strings; reject-and-explain instead of coercing bad dates; retrieve tool docs only for the relevant subset.

If arguments are right but ids are wrong, that is grounding, not schema. Feed lookup results back before a write.""",
 failures=F("Silently coercing “next Friday” to a date. You will write the wrong day.",
 "Adding tools to fix selection. You made it worse.",
 "Evaluating only final answers so you never see the wrong id."),
 line="""I measure tool choice and argument validity separately. I sharpen descriptions, shrink the catalogue, and reject bad args with a typed error. I do not silently guess.""",
 walk="""Argument fail rate is 18%, mostly dates. You replace free text with `YYYY-MM-DD` and return `invalid_arg`. Fail rate drops to 3% and the model self-corrects on the next step.""",
 follow="""They ask about fine-tuning for tool use. Say: I would only do that after descriptions, catalogue size and schemas are tight.""",
 measure="""Selection accuracy, schema-valid rate, semantic-id correctness, and self-correct rate after a typed error.""",
 kps=["Score selection and arguments as separate metrics.", "Shrink the catalogue and write contrastive descriptions.", "Prefer enums and tight schemas over free text.", "Reject bad args; do not silently coerce.", "Wrong id after a valid schema is a grounding problem.", "Fix descriptions before you fine-tune."],
 qs=[Q("The agent often picks tool A when B is right; both descriptions say they search data. Most likely fix?", "Differentiate when-to-use and when-not. Measure selection. Do not just lower temperature.", "debug"),
     Q("Schema validation passes but the call hits the wrong customer. What is missing?", "A semantic or grounding check. Lookup and confirm the id before a write.", "apply"),
     Q("Why log validator failures as their own metric?", "They are cheap, deterministic bugs. If you only watch final answers you will miss a whole class of wasted steps.", "recall"),
     Q("When do you add a one-shot example to a tool definition?", "When the schema is legal but models still emit the wrong shape — dates, units, id formats.", "apply")],
 links=[L["oai_tools"], L["gem_fc"]],
),
"sequential-parallel-repeated-calls": sc(
 why="""Not every tool call must wait for the last one. Independent lookups should go out in one turn. Dependent calls must stay sequential. Repeated calls need a reason (pagination, retry) or they are a loop.

Interviewers like a latency example: three sequential 800ms lookups are 2.4s; parallel they are 800ms plus merge.""",
 how="""If the model emits three calls in one reply and none needs another’s output, run them concurrently, then append results by call id.

Sequential: `lookup_id` then `get_invoice(id)` — the second needs the first. Teach that in the description (“requires account_id from lookup”).

Repeated: pagination with a cursor; retry on transient. Anything else that looks like the same call twice is loop detection.""",
 failures=F("Always sequential because the code was written as a for-loop. Users wait for no reason.",
 "Blind parallel of dependent calls. The second fails on a missing id.",
 "Repeated page fetches with no cursor end condition."),
 line="""Independent calls run in parallel in one turn. Dependent calls stay sequential. Repeated calls need a cursor or a retry reason, or I stop them.""",
 walk="""A KYC agent ran `sanctions`, `pep`, and `media` one after another (3.1s). You allow three calls in one turn and fan them out (1.2s). Descriptions now say they are independent.""",
 follow="""They ask about race writes. Say: I never parallelise two writes to the same record. Reads are the parallel case.""",
 measure="""Fraction of turns with >1 call, p95 latency versus a sequential baseline, and dependent-call fail rate.""",
 kps=["Fan out independent calls in one turn.", "Keep true dependencies sequential.", "Map results back by call id.", "Repeated calls need pagination or a transient retry.", "Do not parallelise two writes to the same object.", "Descriptions should say which inputs must already exist."],
 qs=[Q("Three independent lookups are needed. What is the best execution?", "Let the model emit all three in one turn and run them concurrently. Map results by call id.", "apply"),
     Q("A parallel get_invoice fails with missing id. What went wrong?", "It depended on lookup_account. Keep it sequential and document the required input.", "debug"),
     Q("When is a repeated tool call legitimate?", "Pagination with a cursor, or a bounded retry on a transient error. Not the same query hoping for a new world.", "recall"),
     Q("Why not parallelise two refund executes?", "They are writes on the same risk surface. You want one, with idempotency, not a race.", "apply")],
 links=[L["oai_tools"], L["ant_tools"]],
),
"recovering-from-tool-failures": sc(
 why="""Tools fail. The agent’s job is to notice, classify, and recover or stop. Treating every exception as “try again” is how you retry a 403 ten times and then invent an answer.

Interviews: transient versus permanent, and what the user sees.""",
 how="""Classify in the runtime before the model sees the result.

- Transient (429, 503, timeout): retry with backoff and a cap, then return a typed error.
- Invalid args: do not retry; return the field error.
- Not found / permission: do not retry; offer a fallback tool or escalate.
- Unknown: count toward an error budget, then stop.

The observation the model sees includes the class and a hint (“try lookup by email”). The loop’s error budget is separate from per-tool retries.""",
 failures=F("Retrying 403. You look aggressive and you still fail.",
 "Swallowing the exception and appending empty text. The model hallucinates success.",
 "Infinite fallback chains (A fails → B → C → A)."),
 line="""I classify tool failures in the runtime: retry transients, do not retry permission or bad args, and return a typed observation. An empty catch is how false success starts.""",
 walk="""A flaky search 503 used to kill the run. You retry twice with backoff. A 403 on delete now returns `permission` and the agent escalates instead of retrying. Duplicate-delete attempts disappear from traces.""",
 follow="""They ask if the model should decide retries. Say: the runtime retries transients; the model decides whether to pick another tool after a permanent error.""",
 measure="""Retry success rate by class, false-success rate, and time-to-escalate on permission errors.""",
 kps=["Classify failures in the runtime, not only in the prompt.", "Retry transients with backoff and a cap.", "Do not retry 403, 404, or schema-invalid args.", "Return typed errors the model can act on.", "Keep an error budget for the whole loop.", "Never append an empty result that looks like success."],
 qs=[Q("Which error should be retried automatically with backoff?", "A transient such as HTTP 503 or a timeout. Not permission denied, not-found, or invalid arguments.", "recall"),
     Q("The agent claims it saved a record after a tool exception. Likely bug?", "The runtime swallowed the error and appended empty or success-looking text. Return a typed failure and do not report success without a result.", "debug"),
     Q("Who should retry a 429, the model or the runtime?", "The runtime, with backoff and a cap. Then give the model a typed error if it still failed.", "apply"),
     Q("A fallback tool also fails. What stops a cycle?", "An error budget and a visited-tool set. After N failures, escalate or return a partial.", "apply")],
 links=[L["oai_tools"], L["ant_tools"]],
),
"limiting-tool-result-size": sc(
 why="""Tool dumps are the usual way an agent blows its context budget. A “helpful” search that returns 30k tokens will evict the goal and the rules. Limiting size is a tool-design problem, not a bigger-window purchase.

Interviewers want a number and a truncation policy, including telling the model that truncation happened.""",
 how="""Cap at the tool: max rows, max bytes, projection of fields. Summarise or page. Return `{items, truncated, next_cursor, store_id}`. The model can fetch more on purpose.

If you must keep a large artefact, store it and return an id. Do not paste the 20k-token PDF into the next prompt.

Log result tokens per tool. Alert when a tool’s p95 exceeds its budget.""",
 failures=F("Truncating without a flag. The model thinks it saw the whole list.",
 "Raising the context window instead of fixing the tool.",
 "Storing nothing and dropping the tail forever so the answer is incomplete with no warning."),
 line="""I cap tool results at the source, mark truncation, and hand back a cursor or store id. I do not pour 20k tokens into the window and hope.""",
 walk="""`list_events` returned 28k tokens. After five calls the system prompt was gone. You cap at 40 rows, add `truncated=true` and a cursor. Context stays under 12k and the agent pages when it must.""",
 follow="""They say the model needs all the rows. Ask which decision requires all the rows. Usually it needs an aggregate or the top matches.""",
 measure="""Result tokens p50/p95 by tool, truncation rate, and quality when the agent is allowed to page versus dump.""",
 kps=["Cap rows and bytes at the tool, not after the window fills.", "Always signal truncation to the model.", "Return a cursor or store id for the rest.", "Project fields; do not return entire documents by default.", "Log result tokens per tool and budget them.", "A bigger window is not the first fix."],
 qs=[Q("Tool outputs of 30k tokens fill the context after a few calls. Best first step?", "Filter, limit and summarise at the tool, and signal truncation. Do not only buy a bigger window.", "apply"),
     Q("Why tell the model that a result was truncated?", "Otherwise it treats the prefix as complete and answers with false confidence. A flag plus a cursor lets it fetch more.", "recall"),
     Q("When do you return a store id instead of the payload?", "When the artefact is large and only a later step might need it. Keep the window for decisions, not for files.", "apply"),
     Q("A teammate wants every column of every row “just in case.” What do you do?", "Ask which field changes the next action. Project those. Measure if quality drops when you cut the rest.", "debug")],
 links=[L["oai_tools"], L["gem_long"]],
),
"read-only-vs-consequential-tools": sc(
 why="""Read-only tools change what the model knows. Consequential tools change the world: email, pay, delete, write a ticket. Mixing them in one flat list is how a confused deputy pays a stranger. Separate them in the catalogue, in permissions, and in the UI.

This is the safety question hiding inside tool design.""",
 how="""Tag tools `read` or `write`. The loop can call reads freely (still authz’d). Writes require a preview, an approval interrupt, or both. The write tool should be unreachable until the flag is set.

Preview tools (`preview_refund`) show the effect. Execute tools (`execute_refund`) need the preview id plus a user tick. Log actor, tool, args, decision.

Never rely on “be careful” in the system prompt as the only gate.""",
 failures=F("One `customer_admin` tool that can read or delete based on a string mode.",
 "Approval in the prompt only. The model calls execute anyway and the runtime obeys.",
 "Reads that are not actually read-only (a GET with side effects)."),
 line="""I separate read-only tools from consequential ones. Writes wait for a preview and an explicit tick. The runtime enforces that, not the prompt.""",
 walk="""An agent with a raw `delete_user` emailed a goodbye and deleted a trial account from a retrieved page’s instruction. You split read vs write, require approval, and the delete never fires. The incident write-up names the missing tag.""",
 follow="""They ask about “low risk” writes like adding a tag. Say: still a write. I may auto-allow a narrow allowlist, but I still log and I still do not mix it into a delete-capable tool.""",
 measure="""Write attempts without approval, denied writes, time-to-approve, and incidents per 1k writes.""",
 kps=["Tag tools read versus write and keep catalogues separate.", "Consequential tools need preview and approval in the runtime.", "Do not use a mode flag on a mega-tool for delete versus read.", "Prompt care is not a permission.", "Log actor, args and decision for every write.", "Side-effecting GETs are writes in disguise."],
 qs=[Q("Your agent must delete customer records when asked. Which design is best?", "Soft delete with preview, user approval and an audit log. Do not give a raw delete with a careful prompt.", "apply"),
     Q("Where must the write gate live?", "In the runtime: the execute tool is unreachable or no-ops without an approval token. The prompt only explains the policy.", "recall"),
     Q("A GET endpoint sends an email. How do you classify that tool?", "As consequential. Side effects, not HTTP verbs, decide the tag.", "debug"),
     Q("Why have a preview tool at all?", "So the user sees the effect before the world changes, and so the execute call can reference a specific preview id.", "apply")],
 links=[L["oai_tools"], L["ant_tools"]],
),
"consequential-tools-need-a-confirm": sc(
 what="""**Email, pay, delete wait for an explicit tick.** That is the user-visible rule for consequential tools. The model may draft the action. The runtime must not execute it until a human (or a narrow, logged policy) confirms. The tick is a product event with an id, not a sentence in the chat that the model interpreted as yes.

This is the same idea as a human-in-the-loop interrupt, said as a tool rule.""",
 why="""Support and finance will not accept “the model was pretty sure.” Confirmations are how you stay employed after the first bad payout. In interviews this is the one-line safety answer they want after you mention tools at all.

On the job, confirm also creates the audit row: who approved, what they saw, what ran.""",
 how="""Flow: model calls `preview_*` → UI shows a card (recipient, amount, body) → user ticks → runtime attaches `approval_id` → only then `execute_*` runs. A model-emitted execute without a valid unused approval_id is rejected.

Expiry matters: an approval older than N minutes or after a material arg change is invalid. One approval, one execute (idempotency key).

For low-risk writes you may use a policy allowlist instead of a human, but you still mint a decision id.""",
 failures=F("Treating “yes please” in chat as the tick. The model can invent that utterance.",
 "Reuse of an approval_id for a second payment.",
 "Showing a different amount in the card than the args you execute."),
 line="""Email, pay and delete wait for an explicit tick. The model drafts; the runtime executes only with a fresh approval id that matches the preview the user saw.""",
 walk="""A refund card showed $40. The model later called execute with $400. You bind execute to the preview hash. The call is rejected, the user sees a new card. That bug never becomes money.""",
 follow="""They ask about fully autonomous refunds. Say: only inside a written policy with a hard amount cap, still with a decision id, and still with an audit.""",
 measure="""Executes without a valid approval, preview/execute mismatch rate, approval latency, and duplicate executes per approval.""",
 kps=["Consequential tools wait for an explicit approval event.", "Chat text is not a tick; an approval id is.", "Execute args must match the preview the user saw.", "One approval, one execute; keys are idempotent.", "Approvals expire and die if args change.", "Autonomous writes still mint a decision id and a cap."],
 qs=[Q("Why is “yes” in the user chat not enough to send an email?", "The model can fabricate or misread consent. A separate approval event bound to a preview id is the tick.", "recall"),
     Q("The preview showed $40 and execute asked for $400. What should the runtime do?", "Reject the call. Approval is bound to the preview hash. Show a new card.", "debug"),
     Q("What fields belong on the confirmation card?", "The consequential fields: recipient, amount or resource, a short body, and who is asking. What they tick is what you run.", "apply"),
     Q("Can you ever skip a human tick?", "Only under a written allowlist with a cap, still emitting a decision id and an audit row.", "apply"),
     Q("How do you stop one approval from paying twice?", "Idempotency: the approval id is single-use and the execute key is stored before the side effect.", "recall")],
 links=[L["oai_agents"], L["lg_hitl"]],
),
"truncating-tool-results": sc(
 what="""**Return a summary plus a store id; do not dump 20k tokens into the window.** Truncation is the specific tactic for oversized tool results: keep a short, structured preview the model can reason over, persist the full payload, and let a later call fetch a slice if needed.

This is narrower than “limit size.” It says what you return instead of the blob.""",
 why="""Agents die in the middle of long traces because someone `print`ed a file. The fix that sticks is an artefact store, not a plea in the tool description. Interviewers want the words “truncated, store id, fetch slice.”

On the job this also helps privacy: the full dump lives in a tighter store; the prompt log holds the summary.""",
 how="""Tool result shape:

```
{summary, stats, truncated: true, artefact_id, suggested_next}
```

`summary` is the first n rows or a model-generated map-reduce you ran *outside* the agent window. `artefact_id` is opaque. A `read_artefact(id, offset, limit)` tool is read-only and still capped.

Never put credentials from the full payload into the summary. Hash the artefact so you can detect if the store changed.""",
 failures=F("Summary that drops the only deciding row, with no way to page.",
 "Store id the model cannot fetch because you forgot the read tool.",
 "Writing the full dump into logs “for debug” and leaking PII."),
 line="""I truncate to a summary plus a store id. The window sees a preview; a capped read tool can fetch a slice. I do not paste 20k tokens into the next call.""",
 walk="""A log tool used to paste 22k tokens. You return `{error_rate: 0.18, top_errors: [...], artefact_id}`. The agent asks for the slice around the spike only. Tokens per task drop 4× and the original goal stays in the prompt.""",
 follow="""They ask who summarises. Say: a deterministic projection first; a cheap model map-reduce only if the projection is still too big, and I eval that summary for lost facts.""",
 measure="""Tokens per tool result, fetch-slice rate, incidents of missing facts that lived only in the tail, PII in prompt logs.""",
 kps=["Return a summary plus an artefact id, not the blob.", "Always set truncated=true when you cut.", "Offer a capped read_artefact slice tool.", "Project deterministically before you summarise with a model.", "Keep full dumps out of prompt logs.", "Hash artefacts so a later fetch matches what you stored."],
 qs=[Q("What should a 20k-token tool return to the model?", "A short summary, stats, truncated=true, and a store id. Optionally a capped slice tool. Not the raw 20k tokens.", "recall"),
     Q("The summary omitted the error that mattered. What do you add?", "A way to page or query the artefact, and an eval that plants deciding facts in the tail.", "debug"),
     Q("Why is an artefact store better than a bigger context window?", "Cost, latency, lost-in-the-middle, and privacy of the full dump. The window should hold decisions.", "apply"),
     Q("Who is allowed to read the artefact?", "The same authz as the original tool, via a read tool that still caps bytes. Not the raw object in the chat log.", "apply"),
     Q("What belongs in the summary by default?", "Counts, top-k items, and the fields that change the next action. Not credentials and not every column.", "recall")],
 links=[L["oai_tools"], L["gem_long"]],
),
},
"m5-4": {
"why-mcp-exists": sc(
 why="""Every AI app used to grow a custom connector for every tool and data source. That is the N×M problem. MCP exists so a server can expose tools, resources and prompts once, and many hosts can use them. You are not replacing tool calling; you are standardising how capabilities show up.

Interviews: say N×M, then say the model still uses ordinary tool calling through the host.""",
 how="""A calendar company writes one MCP server. Cursor, a desktop host, and your internal agent all connect as clients. You stop rewriting OAuth and JSON schemas for each app.

MCP is a protocol (messages, capability negotiation, transports). It is not a model vendor. If you only have one app and three internal functions, a local tool list may be enough. Adopt MCP when you want reuse or third-party tools without a one-off integration each time.""",
 failures=F("Treating MCP as a smarter model. Quality does not change; wiring does.",
 "Connecting every public server. The catalogue explodes and trust dies.",
 "Rebuilding MCP for a single in-process function that will never be reused."),
 line="""MCP standardises how apps expose tools, resources and prompts so we do not write N×M connectors. The model still tool-calls; the host translates.""",
 walk="""You had four agents each with a bespoke GitHub wrapper. You ship one MCP server. Three hosts connect. The fourth stays on in-process tools because it never leaves the monolith — that is fine.""",
 follow="""They ask if MCP replaces OpenAPI. Say: different job. OpenAPI describes HTTP APIs. MCP describes capabilities for AI hosts, including resources and prompts.""",
 measure="""Connectors deleted, time-to-add a host, and incidents from mismatched ad-hoc schemas.""",
 kps=["MCP attacks the N×M connector problem.", "Servers expose tools, resources and prompts once.", "Hosts translate MCP tools into ordinary model tool calls.", "You do not need MCP for a few in-process functions.", "A shared protocol is not a quality upgrade by itself.", "Be picky about which servers you connect."],
 qs=[Q("Which best describes the N×M problem MCP addresses?", "Each AI app needed custom code for each data source or tool. A shared protocol turns that into N clients plus M servers.", "recall"),
     Q("Does MCP replace model tool calling?", "No. The host converts MCP tools into tool definitions and forwards calls. The model still emits tool calls.", "recall"),
     Q("When would you skip MCP?", "A single app with a handful of internal functions that will not be reused. In-process tools are simpler.", "apply"),
     Q("Why is “we use MCP” not an architecture for quality?", "It standardises wiring, not reasoning. You still design tools, caps and evals.", "apply")],
 links=[L["mcp"], L["mcp_arch"]],
),
"host-client-server": sc(
 why="""MCP’s three roles get mixed up in interviews. The **host** is the AI application the user sees (IDE, desktop app, your agent service). The **client** lives in the host and speaks the protocol to one server. The **server** exposes tools, resources and prompts. One host can run many clients to many servers.

If you cannot say who holds the API keys and who sees the tool list, you cannot talk about trust.""",
 how="""Sketch your own product.

Host: the worker that calls the model and renders the UI.
Client: a library session per server (stdio to a local filesystem server; HTTP to a remote CRM server).
Server: the CRM process that implements `search_accounts` and `get_note`.

The host decides which servers to attach, what the model sees, and which results to keep. The server never talks to the model directly. The client is plumbing.""",
 failures=F("Calling the server “the agent.” The agent is in the host.",
 "One shared client for all users so auth becomes a single token.",
 "Letting the server push prompts into the host without review."),
 line="""Host is the app, client is the protocol session, server exposes capabilities. The host owns what the model sees and which servers are trusted.""",
 walk="""A teammate puts the model key in the MCP server “so it can think.” You move the key back to the host. The server only sees tool args. A leaked server no longer is a leaked model account.""",
 follow="""They ask where sampling (server asks the host to call a model) goes. Say: still the host’s model and policy. The server does not get your keys.""",
 measure="""Whether a new hire can label host/client/server on your diagram, and whether any server holds provider keys.""",
 kps=["Host: the user-facing AI app and policy.", "Client: a session inside the host, one per server.", "Server: exposes tools, resources, prompts.", "The server does not call the model with your keys.", "The host chooses which servers and which tools are visible.", "One host, many clients, many servers is normal."],
 qs=[Q("What is the host versus the server in MCP?", "The host is the AI application that talks to the model and the user. The server exposes tools and resources. The client is the host’s protocol session to that server.", "recall"),
     Q("Where should the model API key live?", "In the host. A server that holds it expands the blast radius of a compromised connector.", "apply"),
     Q("Why is there a client role at all?", "So the host can speak MCP to several servers with separate sessions, transports and auth.", "recall"),
     Q("A server wants to “call the LLM directly.” What do you say?", "No. If it needs language work, it asks the host to sample under the host’s policy, or it stays a dumb tool.", "debug")],
 links=[L["mcp_arch"], L["mcp"]],
),
"tool-calling-vs-mcp": sc(
 why="""People treat MCP and function calling as rivals. They are layers. Tool calling is the model’s way to request a named action with JSON arguments. MCP is how a host discovers and invokes external capabilities. The host maps MCP tools into the model’s tool list.

If you say “we switched from tool calling to MCP,” you have confused a protocol with a model feature.""",
 how="""Flow: server lists tools → client tells host → host converts schemas to the provider format → model emits a tool call → host routes to the right client → client calls the server → result returns as a tool result.

You can have tool calling with no MCP (in-process functions). You can have MCP with no model (a host that only browses resources). Production agents often have both: local tools plus a few MCP servers.""",
 failures=F("Dropping JSON schemas because “MCP handles it.” The model still needs a schema.",
 "Assuming every MCP tool must be shown every turn.",
 "Two names for the same tool (local and MCP) that confuse selection."),
 line="""Tool calling is the model request. MCP is how hosts get tools from servers. I translate; I do not replace one with the other.""",
 walk="""You wrap Postgres as MCP. The model still sees `query_sql` as a normal tool. Tracing shows provider tool_call_id mapped to an MCP request id. Debugging gets easier once that map is logged.""",
 follow="""They ask which to learn first. Say: tool calling and schemas first. MCP second, when you need portable servers.""",
 measure="""Mapping errors between provider call ids and MCP request ids, and duplicate-name collisions in the merged catalogue.""",
 kps=["Tool calling: the model requests an action.", "MCP: a standard for exposing capabilities to hosts.", "The host translates MCP tools into provider tool schemas.", "In-process tools do not need MCP.", "Do not show every MCP tool every turn.", "Log the id map from model call to server request."],
 qs=[Q("How do MCP and tool calling relate?", "MCP supplies and routes tools; the model still uses tool calling. The host converts and forwards.", "recall"),
     Q("Can you use tool calling without MCP?", "Yes. In-process functions with JSON schemas are enough for one app.", "recall"),
     Q("A provider trace has a tool call that never hit your DB. What do you check?", "The host map from provider call id to MCP request, and whether the client actually sent it.", "debug"),
     Q("Why might you keep some tools local even after adopting MCP?", "Latency, secrets, or tools that will never be reused by another host.", "apply")],
 links=[L["mcp"], L["oai_tools"]],
),
"building-an-mcp-server": sc(
 why="""A server is a real process with a real trust boundary. “Building an MCP server” means exposing a slice of a system — filesystem, DB, SaaS, internal API — as typed tools and resources, with errors and auth, not wrapping the entire admin API.

Interviews want a concrete resource plus a tool, and what you refused to expose.""",
 how="""Pick one job: `search_tickets` and `get_ticket` on your helpdesk, read-only. Define schemas. Implement list_tools, call_tool, maybe resources for ticket bodies. Return typed errors. Do not expose `delete_org`.

Run it locally over stdio while you iterate. Add HTTP plus auth only when a remote host needs it. Write a contract test: given a call, the result shape is stable.""",
 failures=F("Exposing the raw admin API as twenty tools on day one.",
 "Putting the database password in the tool result “for convenience.”",
 "No versioning; you break every host when you rename a field."),
 line="""I build a narrow server over a real system: a few typed tools, useful errors, no admin surface. I test the contract before I connect a host.""",
 walk="""You wrap the billing API with `list_invoices` and `get_invoice`. A host asks for `void_invoice`. You refuse and add a separate write server later with approval. Read hosts stay safe.""",
 follow="""They ask about resources versus tools. Say: resources are readable data; tools are actions. I do not hide a write behind a resource read.""",
 measure="""Tools per server, unused tools, contract-test failures, and privileges the server’s token actually has.""",
 kps=["Expose a narrow slice, not the whole admin API.", "Typed tools, resources, and stable error shapes.", "Contract-test the result schema.", "Keep secrets out of results.", "Stdio while developing; remote transport later.", "Version names; renaming is a breaking change."],
 qs=[Q("What should a first MCP server expose?", "A small read-only slice of a real system with typed schemas and errors. Not the entire admin API.", "apply"),
     Q("A host wants a destructive tool on your read server. What do you do?", "Refuse. Put writes on a separate server with tighter auth and approval.", "debug"),
     Q("Why contract-test the server?", "Hosts depend on the schema. A silent field rename breaks every client at once.", "recall"),
     Q("Where do you put the database password?", "In the server’s environment, never in a tool result or a resource body.", "apply")],
 links=[L["mcp"], L["mcp_arch"]],
),
"schemas-transports-auth": sc(
 why="""The unglamorous half of MCP is what makes it production: JSON schemas for tools, capability flags, error codes, transports (stdio versus HTTP), and authentication for anything that is not a local child process.

Interviews: stdio for local, HTTP plus auth for remote. Never “we just opened a port.”""",
 how="""Schemas: arguments and results documented; reject extra fields if you can. Capabilities: advertise only what you implemented. Errors: stable codes.

Transports: stdio — host spawns the server, stdin/stdout carry JSON-RPC, logs go to stderr. HTTP/SSE or the current remote transport — TLS, authn, authz, per-user tokens.

Auth: a remote server that sees customer data must know which user is calling. A shared service account is how tenant A sees tenant B.""",
 failures=F("Debug prints on stdout in stdio mode. You corrupt the protocol.",
 "Remote server with no auth because it is “only on the VPN.”",
 "Advertising a capability you did not implement."),
 line="""Schemas, typed errors, stdio for local, HTTP plus real auth for remote. Logs go to stderr. Per-user tokens, not one shared key.""",
 walk="""A stdio server broke when someone added `print(debug)`. You move logs to stderr and the host reconnects. Later the same server goes remote; you add OAuth with audience checks before it sees prod data.""",
 follow="""They ask about API keys in query strings. Say: no. Header or signed token, rotated, scoped.""",
 measure="""Protocol parse errors, unauthenticated remote calls blocked, and token-scope violations in tests.""",
 kps=["Tool schemas are part of the contract.", "Stdio: protocol on stdin/stdout, logs on stderr.", "Remote: TLS and per-user auth, not a shared key.", "Advertise only implemented capabilities.", "Stable error codes beat stack traces in results.", "VPN is not authentication."],
 qs=[Q("A stdio MCP server breaks as soon as you add debug prints. Likely cause?", "stdout carries protocol messages and was corrupted. Write logs to stderr.", "debug"),
     Q("A remote MCP server must serve many users with different data access. What auth approach fits?", "Per-user authorization with scoped, validated tokens. Not one shared API key.", "apply"),
     Q("What goes on stdin/stdout versus stderr for a local server?", "JSON-RPC on stdin/stdout; human logs on stderr.", "recall"),
     Q("Why list capabilities instead of assuming every server has everything?", "Clients must not call what you did not implement. Negotiation is how mixed versions survive.", "recall")],
 links=[L["mcp"], L["mcp_arch"]],
),
"building-and-connecting-a-client": sc(
 why="""A client is how your host attaches to servers. Building or using one means process lifecycle (for stdio), session init, tool listing, routing calls, and merging catalogues without name clashes.

The host policy sits above the client: which servers, which tools, which user identity is forwarded.""",
 how="""On session start: spawn or connect, initialize, list tools, prefix names (`crm.search_accounts`), filter by policy, convert to provider schemas.

On a model tool call: find the server by prefix, translate args, await the result, map errors. Time out. If the server dies, surface a typed error, do not crash the host.

Cache the tool list with a TTL or a change notification. Do not list_tools on every model turn if nothing changed.""",
 failures=F("Merging two servers that both export `search` with no namespace.",
 "Forwarding a user token to every server including ones that should not see it.",
 "Blocking the whole agent if one optional server is down."),
 line="""The client connects, lists, namespaces and routes. The host still decides the exposed subset and the identity that is forwarded.""",
 walk="""You connect CRM and Git. Both had `search`. You prefix `crm.` and `git.`. Selection recovers. When Git is down, CRM tools still work and the model sees `git unavailable`.""",
 follow="""They ask about sampling from the server. Say: the client may relay a sample request, but the host applies the same policy as a user-facing call.""",
 measure="""Connect success, tool-list freshness, namespace collisions, and agent success when an optional server is down.""",
 kps=["Initialize, list, namespace, route, time out.", "Prefix tool names when merging servers.", "Do not list_tools on every turn unless needed.", "One dead optional server must not kill the host.", "Forward the minimum identity each server needs.", "The host policy still filters the catalogue."],
 qs=[Q("You connect 15 MCP servers and tool selection worsens. Best response?", "Expose a relevant subset per task and namespace names. Do not dump the full union into every turn.", "apply"),
     Q("Two servers both expose search. What do you do?", "Namespace (`crm.search`, `git.search`) and describe the difference. Do not leave a collision.", "debug"),
     Q("Should a down documentation server fail the whole agent?", "No. Mark those tools unavailable and continue with the rest.", "apply"),
     Q("When do you refresh the tool list?", "On connect, on a change notification, or on a TTL — not necessarily before every model call.", "recall")],
 links=[L["mcp"], L["mcp_arch"]],
),
"permissions-untrusted-servers": sc(
 why="""An MCP server is code you did not write, seeing arguments you did not choose, returning text that will sit in the model context. That is a trust boundary. Third-party servers can exfiltrate tokens, poison descriptions (tool-description injection), or return prompt-injection text.

Interviews: treat third-party tools as hostile; scope tokens; review schemas.""",
 how="""Allowlist servers. Pin versions. Review tool lists before enablement. Run servers with least privilege (read-only tokens, no access to secrets files). Sandbox local binaries. Show the user which server will run a consequential tool.

Do not forward your cloud admin role to a community server. Do not put customer PII into a server you do not have a DPA with.

Re-review when a server’s tool list changes. A new `read_env` tool is an incident.""",
 failures=F("Installing a trending server with default env that includes `AWS_*`.",
 "Trusting tool descriptions as documentation rather than attacker-controlled text.",
 "One token with `*` sent to every server."),
 line="""I treat third-party MCP servers as untrusted code. Allowlist, least-privilege tokens, review schemas, sandbox, and re-check when the tool list changes.""",
 walk="""A “helpful PDF server” adds `fetch_url`. It starts pulling internal metadata. You had allowlisted the old list only in a wiki. You pin the version, diff tool lists in CI, and revoke the token. The next add is blocked.""",
 follow="""They ask about open-source servers. Say: readable is not trusted. I still scope tokens and review the running revision.""",
 measure="""Servers on the allowlist, tokens with excess scopes, tool-list drift alerts, and data-egress tests.""",
 kps=["Third-party servers are untrusted code and untrusted text.", "Allowlist, pin versions, diff tool lists.", "Least-privilege tokens; never share admin creds.", "Sandbox local servers; no secrets in their env.", "Review descriptions as attacker-controlled.", "Consequential calls still need user-visible approval."],
 qs=[Q("Which control best reduces harm from a poisoned tool description?", "Reviewing and allowlisting servers, sandboxing, scoped tokens, and per-call approval for writes.", "apply"),
     Q("A community server asks for your cloud admin env vars. What do you do?", "Refuse. Run it with no secrets or do not run it. Least privilege is the default.", "debug"),
     Q("Why re-check a server after an update?", "The tool list can grow a fetch or read_env capability you never approved.", "recall"),
     Q("Where does user approval still sit?", "On consequential tools, even if the server is allowlisted. Allowlist is identity, not consent for a pay/delete.", "apply")],
 links=[L["mcp"], L["mcp_arch"]],
),
"untrusted-mcp-servers": sc(
 what="""**Treat third-party tools as hostile; scope tokens and review schemas.** This is the permission topic said as an operating rule. A server you did not write can steal credentials, exfiltrate arguments, or inject instructions through descriptions and results. “Popular on the registry” is not a review.

Hostile does not mean “never use.” It means assume breach and limit blast radius.""",
 why="""This is the security follow-up interviewers add after you mention MCP. They want least privilege and a review step, not a lecture on JSON-RPC.

On the job, procurement will ask who approved the server. Have a written allowlist and a token inventory.""",
 how="""Before connect: read the repo or vendor docs, list tools, list required env, list data that will leave. Issue a token that can only do those reads. Run the binary in a container without your home directory.

After connect: monitor args and result sizes; alert on new tool names; forbid servers from seeing each other’s tokens.

Red-team: feed the server a fake secret in an argument and see if it appears on the network.""",
 failures=F("Shared token across five servers so you only had to set one env var.",
 "No inventory of what data each server receives.",
 "Trusting the registry badge instead of a human review."),
 line="""Third-party MCP tools are hostile until proven otherwise. I scope tokens, review schemas, sandbox the process, and watch for tool-list drift.""",
 walk="""You connect a community Slack server with a workspace token. A week later it adds `export_dms`. Your drift job fails the deploy. You never grant the new scope.""",
 follow="""They ask about first-party internal servers. Say: still least privilege, but I can skip “hostile” rhetoric. I do not skip authz.""",
 measure="""Tokens mapped to servers, excess-scope findings, drift-job catches, and failed egress tests.""",
 kps=["Assume third-party servers will leak or inject.", "Scope a unique token per server.", "Review and pin the tool schema.", "Sandbox the process; empty env except what it needs.", "Alert when the advertised tool list changes.", "Popular is not the same as reviewed."],
 qs=[Q("What does “treat third-party MCP servers as hostile” require in practice?", "Unique scoped tokens, schema review, sandboxing, drift alerts, and no shared admin credentials.", "recall"),
     Q("You used one token for four servers to save time. What is the risk?", "Any one server can use the union of privileges. Compromise blast radius is the whole union.", "debug"),
     Q("How do you test for exfiltration?", "Plant a canary secret in an argument and watch whether it leaves on the network or in logs.", "apply"),
     Q("Does an internal first-party server get a free pass?", "No. It still gets least privilege and authz. You may skip the hostile-registry review, not the token scope.", "apply"),
     Q("Why pin the schema, not only the package version?", "A version bump can add tools. Pinning and diffing the advertised list catches that even if the version string looks familiar.", "recall")],
 links=[L["mcp"], L["mcp_arch"]],
),
"transport-and-auth-choices": sc(
 what="""**Stdio for local; HTTP plus auth for anything remote.** That is the transport rule. Stdio means the host spawns a child and owns its lifetime; the channel is a pipe, not a port. The moment the server is another machine, another user, or another tenant, you need a remote transport with TLS and authentication.

Auth is not optional on remote, even on a private network.""",
 why="""Mixing these up is how a debug server bound to `0.0.0.0` becomes a data leak. Interviewers will ask which transport you chose and why. A senior answer names the trust boundary, not a favourite library.

On the job, stdio is also how you avoid an extra network hop for a local filesystem tool.""",
 how="""Local filesystem, local git, a desktop calculator: stdio, no extra port, logs on stderr, kill the child when the session ends.

Shared CRM for many users: remote HTTP (or the current supported remote transport), mTLS or OAuth, per-user identity, audit.

Do not expose stdio servers via a naive TCP wrapper without adding auth. That wrapper just invented an unauthenticated remote API.

Document the choice next to the server name in the allowlist.""",
 failures=F("Publishing a stdio server on a port for “ease” with no auth.",
 "Remote HTTP with a static shared key in the repo.",
 "Leaving the child process alive after the user logs out."),
 line="""Stdio for local children I spawn and kill. HTTP plus real auth for anything remote. A private network does not replace authentication.""",
 walk="""A laptop stdio filesystem server is fine. The same code deployed as a team service on :8080 without auth is not. You add OAuth and per-user paths before it sees anyone else’s disk.""",
 follow="""They ask about SSE versus stdio performance. Say: I pick based on trust and multi-user need, then I measure. I do not pick a transport to feel modern.""",
 measure="""Servers classified by transport, unauthenticated remote endpoints (should be zero), orphan child processes, auth-fail rates.""",
 kps=["Stdio: local child, host-owned lifetime, logs on stderr.", "Remote: HTTP (or current remote transport) plus TLS and auth.", "VPN or localhost binding is not authentication.", "Do not wrap stdio in raw TCP without adding auth.", "Kill local children when the session ends.", "Record the transport next to the allowlist entry."],
 qs=[Q("When is stdio the right MCP transport?", "When the host spawns a local child for one session — filesystem, local git — and can kill it at the end.", "recall"),
     Q("When must you use HTTP plus auth?", "When the server is remote, multi-user, or otherwise outside the host process. Private networks still need auth.", "recall"),
     Q("Someone wraps a stdio server in netcat so a teammate can connect. What did they create?", "An unauthenticated remote API. Stop and add a real remote transport with auth, or use a VPN plus auth, not raw TCP.", "debug"),
     Q("Where do logs go on stdio?", "stderr. stdout is the protocol.", "apply"),
     Q("What happens to the child when the user session ends?", "The host kills it. Orphan servers keep tokens in memory and confuse the next session.", "apply")],
 links=[L["mcp"], L["mcp_arch"]],
),
},
"m5-5": {
"history-state-short-long-term-memory": sc(
 why="""These four words get used as synonyms and then the system forgets a constraint. **History** is the message list. **State** is structured fields for this run (flags, plan, ids). **Short-term memory** is what you keep for the current task or session. **Long-term memory** is what you persist across sessions and retrieve later.

Interviews: draw the four and say the model is stateless. You choose what to send.""",
 how="""A support session: history is the turns; state is `{customer_id, already_refunded}`; short-term is the last eight turns plus a summary; long-term is “prefers email, language=hi” in a store.

When you debug “it forgot,” ask which of the four failed. Truncated history is not a long-term bug. A missing flag is not a retrieval bug.""",
 failures=F("Storing the entire history as long-term memory. You retrieve greetings forever.",
 "Putting hard constraints only in history so a summary drops them.",
 "Calling everything memory so nobody owns the schema."),
 line="""History is the log, state is structured run data, short-term is the session working set, long-term is retrieved facts. The model remembers nothing I do not send.""",
 walk="""A bot forgets the refund already happened. History still has the sentence, but it was summarised away. You add `already_refunded` to state. The next turn cannot “helpfully” pay again.""",
 follow="""They ask if a 1M window removes the need for these. Say: it removes overflow, not the need for structured state and selective long-term facts.""",
 measure="""Constraint-retention after summarisation, mistaken-repeat actions, and retrieval precision of long-term facts.""",
 kps=["History ≠ state ≠ short-term ≠ long-term.", "The model is stateless; the app chooses the next prompt.", "Hard constraints belong in structured state.", "Long-term is retrieved facts, not a second copy of chat.", "Name which layer failed when the agent “forgets.”", "A bigger window does not replace structured state."],
 qs=[Q("The model is stateless. What does that imply for memory?", "Everything it “knows” about the session is in the request. Memory is an application concern.", "recall"),
     Q("A user constraint from turn 1 vanishes after summarisation. Which layer should have held it?", "Structured state or a pinned system block, not only narrative history.", "debug"),
     Q("Give one example of each of the four.", "History: messages. State: already_refunded flag. Short-term: last turns plus summary. Long-term: preferred language in a store.", "apply"),
     Q("Why not treat a huge window as long-term memory?", "Cost, rot, and no forget/update policy. Long-term needs write/retrieve/forget, not a pile of tokens.", "apply")],
 links=[L["oai_prompt"], L["gem_long"]],
),
"short-term-memory": sc(
 why="""Short-term memory is the working set of the current task: recent turns, the plan, pinned constraints, maybe a scratchpad. It must fit the budget and survive a few tool dumps. It is not a warehouse.

If you skip it, every turn is either “all history” (expensive, rot) or “last message only” (amnesia).""",
 how="""Implement a session object: `messages[-k:]`, `summary`, `pins[]`, `plan`. After each turn, if tokens exceed T, summarise the middle and keep pins. Pins are copied into the system block every call.

Scratchpad: the model can write `note()` that lands in state, not only in prose.

Expire the session with the product session, or after idle TTL. Do not quietly promote short-term notes to long-term without a policy.""",
 failures=F("Keeping all tool dumps in short-term. The working set is then just noise.",
 "No pins, so the one rule that mattered died in the summary.",
 "Session objects that never expire and become long-term by accident."),
 line="""Short-term is the working set: recent turns, summary, pins, plan. I budget it, I pin hard constraints, and I do not treat it as a warehouse.""",
 walk="""After six tool calls the agent forgets the user’s timezone. You pin `tz=Asia/Kolkata` and cap tool results. The timezone survives the next twenty steps.""",
 follow="""They ask how large k should be. Say: measure quality versus tokens. I start with 8–16 turns plus a summary and pins.""",
 measure="""Pin-retention rate, tokens in the working set, and tasks failed because a recent fact was dropped.""",
 kps=["Short-term is the current-task working set.", "Keep recent turns, a summary, pins and the plan.", "Pin hard constraints so summaries cannot drop them.", "Cap tool dumps out of the working set.", "Expire with the session; do not silently promote.", "Tune k on evals, not folklore."],
 qs=[Q("What belongs in short-term memory?", "Recent turns, a summary of older ones, pinned constraints, and the current plan or scratchpad — sized to a budget.", "recall"),
     Q("A user states a hard constraint early; after summarisation the agent violates it. Best fix?", "Keep hard constraints in pinned structured state or the system prompt, not only in the summarised narrative.", "debug"),
     Q("Should tool dumps live in short-term forever?", "No. Truncate or store them. The working set is for decisions.", "apply"),
     Q("When does short-term become long-term?", "Only through an explicit write policy. Idle TTL should kill the session, not copy it into the warehouse.", "apply")],
 links=[L["oai_prompt"], L["gem_long"]],
),
"long-term-memory": sc(
 why="""Long-term memory is a store you retrieve from on later sessions: preferences, durable facts, prior outcomes. It is usually a database plus embeddings or keywords, not “leave the chat forever.”

Without it, every Monday the product asks the user’s name again. With an unfiltered one, it recalls a joke as a policy.""",
 how="""Write path: extract candidate facts, filter, upsert with a key (`user.pref.language`). Retrieve path: query by user and task, threshold, cap k, inject as a labelled block.

Start with structured fields you understand. Add vector retrieval when the set of facts is large and messy. Always keep an update and a delete.

Do not write memories from untrusted retrieved web text without a flag.""",
 failures=F("Blindly embedding every message.",
 "No user key so memories leak across accounts.",
 "Retrieval with no threshold so ten vague facts distract the model."),
 line="""Long-term memory is a store I write selectively and retrieve with a cap. It is not a second copy of the chat. Update and delete are part of the design.""",
 walk="""You store `deploy_target=eu-west-1`. Next week the agent uses it without asking. A month later the user moves to `us-east-1`; you upsert, you do not append a contradiction.""",
 follow="""They ask about memory fine-tuning. Say: that is weights, not this. Product memory is data I can delete.""",
 measure="""Write precision (junk rate), retrieval precision, contradiction rate, and cross-tenant leak tests.""",
 kps=["Long-term is persisted and retrieved across sessions.", "Write only useful, scoped facts with keys.", "Retrieve with a threshold and a small k.", "Update or supersede; do not pile contradictions.", "Never leak across users.", "Untrusted sources do not become durable facts."],
 qs=[Q("Which is a durable fact worth storing in long-term memory?", "A stable preference such as programming language or deploy target — not “hello” and not a raw 50k log.", "apply"),
     Q("How do you handle a user changing their city?", "Update or supersede the old memory with a timestamp. Do not keep both as peers.", "apply"),
     Q("Retrieval returns loosely related memories. First adjustments?", "Raise the similarity threshold, lower k, filter by metadata such as user and type.", "debug"),
     Q("Why is fine-tuning the wrong “memory” for a preference?", "You cannot reliably delete or update a single fact in weights. A store you can edit is the product memory.", "recall")],
 links=[L["oai_prompt"], L["ant_prompt"]],
),
"storing-what-is-worth-keeping": sc(
 why="""Write policies are how memory stays useful. Worth keeping: decisions, durable preferences, open tasks, verified outcomes. Not worth: greetings, whole tool dumps, unverified web claims, secrets.

If you skip the policy, retrieval becomes a junk drawer and people disable memory.""",
 how="""Score candidates: durable? user-specific? actionable later? verified? If three of four, write. Store `{key, value, source, ts, ttl?}`.

Example keep: “billing cycle is annual,” “open: wait for RMA.” Example drop: “thanks!,” a 4k stack trace, a tweet.

Let the user see and delete. A memory the user cannot see will become a trust incident.""",
 failures=F("Storing API keys the user pasted once.",
 "Storing every assistant message as a fact.",
 "No source field so you cannot tell a user said it versus a webpage did."),
 line="""I store decisions, preferences and open tasks — not every chat line. Each memory has a key, a source and a way to delete it.""",
 walk="""Memory write rate was 40 per session. You add the four-question filter. Writes drop to 2–3, retrieval precision doubles, and “why did it say that?” tickets fall.""",
 follow="""They ask who extracts facts. Say: a small structured extractor with a allowlist of keys, not a free-form diary.""",
 measure="""Writes per session, junk rate from a labelled sample, user-delete rate, secret-leak audits.""",
 kps=["Keep decisions, prefs, open tasks, verified outcomes.", "Drop chit-chat, dumps, secrets, untrusted claims.", "Every memory has a key, source and timestamp.", "Users can see and delete.", "Prefer an allowlist of keys over a free-form diary.", "Verification status travels with the fact."],
 qs=[Q("What is worth remembering?", "Decisions, user preferences and open tasks — not every chat line, dump or unverified webpage.", "recall"),
     Q("The store filled with “thanks” and stack traces. What policy was missing?", "A write filter for durable, user-specific, actionable, verified facts.", "debug"),
     Q("Why store a source on each memory?", "So you can distrust web-derived facts and prove what the user actually said.", "apply"),
     Q("Should users see their memories?", "Yes. Invisible memory is how you get creepy or wrong personalisation you cannot debug.", "apply")],
 links=[L["oai_prompt"], L["ant_prompt"]],
),
"retrieving-only-relevant-memories": sc(
 why="""Injection of the whole memory store is how products get slower and weirder. Retrieval is a query: this user, this task, above a score, cap k, labelled so the model knows they are memories not commands.

This is RAG applied to your own notes. The same precision problems apply.""",
 how="""At turn start (or when the task changes): embed the user message plus a hint, search, filter metadata, take top 3–5 above a threshold, render as `Memory (user-stated, 2026-03-01): prefers email`.

Do not retrieve on “hi.” Do not let memories override system rules. If two memories conflict, prefer the newer and say so.

Log which ids were injected so you can debug a creepy mention.""",
 failures=F("k=20 with no threshold.",
 "Memories concatenated into the system prompt as if they were rules.",
 "Retrieving another user’s memories because the filter forgot `user_id`."),
 line="""I retrieve a few relevant memories with a threshold and a user filter. I do not pour the store into the prompt. Memories are labelled data, not rules.""",
 walk="""The agent mentions a two-year-old cancelled project. You add recency decay and a task filter. Irrelevant-memory rate on a labelled set drops from 40% to 8%.""",
 follow="""They ask about always-on memory. Say: always-on write is already dangerous; always-on full inject is worse. I retrieve on demand.""",
 measure="""Precision@k of injected memories, leak tests across users, and quality with k=0 versus k=3.""",
 kps=["Retrieve a small k above a similarity threshold.", "Always filter by user and type.", "Label memories as data, not as system rules.", "Prefer newer when facts conflict.", "Skip retrieval on greetings and tiny talk.", "Log injected ids for debug."],
 qs=[Q("Retrieval returns loosely related memories that distract the model. First adjustments?", "Add a similarity threshold, lower k and filter by metadata.", "debug"),
     Q("Why label injected memories as memories?", "So the model does not treat a preference as a system command, and so traces show what was injected.", "recall"),
     Q("What metadata is non-negotiable on retrieve?", "user_id (or tenant), type, and timestamp. Without them you leak or inject junk.", "apply"),
     Q("When do you skip retrieval entirely?", "Greetings, or tasks that cannot use personal facts (a public calculator). Measure before you always retrieve.", "apply")],
 links=[L["oai_prompt"], L["ant_prompt"]],
),
"write-retrieve-update-forget": sc(
 why="""Memory is not append-only. The operations are write, retrieve, update, forget. Without update you contradict yourself. Without forget you keep a stale address and a secret the user asked to delete.

Regulated products will ask you to forget. “We embedded it, sorry” is not an answer.""",
 how="""Write: upsert by key. Retrieve: query. Update: new value, new ts, old value archived or gone. Forget: delete by key or by user request; remove from the vector index, not only the SQL row.

TTL is automatic forget. A credit-card number should have TTL minutes, not years.

Expose forget to the user. Honour it in every replica.""",
 failures=F("Soft-delete only in SQL while vectors still retrieve the fact.",
 "Updates that append so retrieve returns both cities.",
 "No forget API because “memory is the product.”"),
 line="""Memory operations are write, retrieve, update, forget. Forget means the index too. TTL is forget with a clock.""",
 walk="""GDPR request: delete this user. You wipe rows and embeddings and the cache. A weekly test plants a canary user and asserts retrieve is empty after forget.""",
 follow="""They ask about “forgetting” in the model weights. Say: I do not put customer facts in weights if I need to delete them.""",
 measure="""Forget completeness (index + row + cache), contradiction rate after updates, TTL expiry success.""",
 kps=["The four operations: write, retrieve, update, forget.", "Update supersedes; it does not append rivals.", "Forget must clear every index and cache.", "TTL is automatic forget for perishable data.", "Users can request forget.", "Do not put deletable facts only in weights."],
 qs=[Q("Name the four basic memory operations.", "Write, retrieve, update and forget. Forget includes vector indexes and caches.", "recall"),
     Q("You updated the city but the agent still says the old one. Likely bug?", "Retrieve is hitting an old embedding or an appended duplicate. Upsert and delete the old vector.", "debug"),
     Q("What should happen to a pasted password in memory?", "Do not write it. If it was written, forget immediately and rotate. Use a short TTL for anything secret-like.", "apply"),
     Q("Why is TTL part of forget?", "Some facts rot. Automatic expiry keeps memory from becoming a dump of last year’s tickets.", "recall")],
 links=[L["oai_prompt"], L["ant_prompt"]],
),
"trimming-summarizing-growth": sc(
 why="""Conversations grow until they do not fit or they rot. Trimming drops old turns. Summarising compresses them. You need a policy for both, and you must not trim the pins or the current user question.

This is context engineering at session scale. Interviews want the order: reserve output, keep pins, summarise the middle, drop tool dumps first.""",
 how="""When tokens > T: (1) drop or store tool bodies, (2) summarise turns older than k into a rolling summary, (3) keep the last k turns verbatim, (4) never drop pins or the latest user text.

Re-summarise incrementally; do not rebuild from the full log every time if you can avoid it. Eval summaries for lost constraints.

Offer a “see full history” in the product that reads the store, not the prompt.""",
 failures=F("FIFO trim that deletes the system prompt.",
 "A summary that invents a preference the user never stated.",
 "Summarising every turn so you pay a model to compress “ok.”"),
 line="""I trim dumps first, summarise the middle, keep recent turns and pins. I never FIFO away the rules or the current question.""",
 walk="""A 40-turn onboarding chat overflowed. You store tool bodies, keep 10 turns, summarise the rest, pin the plan. Tokens fall from 70k to 18k and the plan is still present on every failing trace.""",
 follow="""They ask about hierarchical summaries. Say: maybe later. First make a rolling summary that does not drop pins.""",
 measure="""Tokens per turn after policy, pin presence rate, invented-fact rate in summaries.""",
 kps=["Drop or store tool dumps before you touch dialogue.", "Summarise the middle; keep recent turns verbatim.", "Never trim pins, rules, or the current question.", "Eval summaries for lost constraints.", "Do not summarise tiny talk.", "Full history lives in a store, not necessarily in the prompt."],
 qs=[Q("A request fails only on long conversations near the limit. What do you check first?", "Whether input plus reserved output exceeds the window, and which block grew. Then trim dumps and summarise the middle; keep pins.", "debug"),
     Q("What must survive trimming?", "Pinned constraints, system rules, and the current user question.", "recall"),
     Q("A summary claims the user is a VIP. They never said that. What do you do?", "Treat summary hallucination as a bug. Tighten the prompt, add a fact check against the stored turns, and stop writing unverified facts into the summary.", "debug"),
     Q("Why not keep everything and buy 1M context?", "Cost, latency and context rot. Trimming is an allocation decision, not just a fence.", "apply")],
 links=[L["gem_long"], L["oai_prompt"]],
),
"offloading-comes-later": sc(
 why="""Context offloading and fancy compression (write the whole world to a store and page it) are real techniques, and they belong in a later context-engineering pass. At memory-basics level, do the boring things first: pins, summary, retrieve-a-few, artefact ids.

Interviewers will tempt you to describe a research memory OS. The senior move is to say what you would ship this month.""",
 how="""Ship: structured state, rolling summary, long-term upsert/retrieve/forget, tool artefact store. Defer: learned compression models, multi-level page tables of context, automatic offload of every paragraph.

When a task exceeds the window or must resume tomorrow, then offload: write artefacts and the plan to a store, reload by id. That is already enough for most products.

Revisit offloading when traces show you are losing mid-context facts after the boring policy is in place.""",
 failures=F("Building a memory OS before you have a write filter.",
 "Offloading the system rules so a resume starts without policy.",
 "Pretending offload is a substitute for a cap."),
 line="""I keep deeper offloading for later. This month I pin, summarise, retrieve a few facts, and store artefacts by id. I offload when a task must outlive the window.""",
 walk="""A prototype stored every paragraph in a vector DB and retrieved 30 chunks per turn. Quality fell. You rip it out, keep pins plus 5 memories, and quality and cost recover. Offload returns as a project next quarter for multi-day runs.""",
 follow="""They ask what “later” means. Say: after I can show pin-retention and junk-write rates. Then I will page long artefacts.""",
 measure="""Whether the boring policy is in prod, and a list of tasks that actually overflowed after it.""",
 kps=["Do pins, summary, selective retrieve and artefact ids first.", "Offload when a task outlives the window or must resume.", "Do not offload the rules.", "A memory OS is not a substitute for a write filter.", "Caps still apply after offload.", "Revisit compression when traces show residual loss."],
 qs=[Q("When is offloading to external storage most justified?", "When tasks exceed the window or need resumability — not as the first prototype for a short chat.", "apply"),
     Q("What should you implement before fancy context compression?", "Pins, rolling summary, selective long-term retrieve, and artefact ids for big tool results.", "recall"),
     Q("A team offloads the system prompt to save tokens. What did they break?", "The rules may be missing on resume. Rules stay pinned; artefacts offload.", "debug"),
     Q("Why wait to build a memory operating system?", "Without a write filter and evals you will retrieve junk at scale. Prove the boring path first.", "apply")],
 links=[L["gem_long"], L["oai_prompt"]],
),
"what-is-worth-remembering": sc(
 what="""**Decisions, user prefs, and open tasks — not every chat line.** That is the write allowlist in one sentence. A decision is “we will ship to EU-West.” A pref is “Hindi, email, dark mode.” An open task is “waiting on the RMA.” A chat line is “lol thanks.”

If you cannot classify a candidate into those buckets, do not write it.""",
 why="""This is the memory interview closer. They want a crisp allowlist and a no-list (secrets, dumps, untrusted web, chit-chat). On the job this is also how you explain the product to legal: we store these fields, here is the delete path.""",
 how="""Extractor emits only keys from an allowlist: `pref.*`, `decision.*`, `task.open.*`. Everything else is dropped. A weekly sample of writes is reviewed for junk and secrets.

Open tasks get a TTL or a completion event. Decisions get a date. Prefs get an update path.

Show the three lists in the UI. If a user would be surprised to see it, it should not have been stored.""",
 failures=F("A free-form “memory paragraph” that mixes a pref with a joke.",
 "Storing open tasks forever so the agent nags about a finished RMA.",
 "Remembering a decision the user rejected."),
 line="""I remember decisions, preferences and open tasks. I do not remember every line. If a user would be surprised to see it stored, I did not write it.""",
 walk="""The store had 12,000 rows, mostly “ok.” You migrate to 400 keyed prefs/decisions/tasks. The agent stops mentioning a cancelled trial from 2024.""",
 follow="""They ask about emotional tone as memory. Say: only if the product needs it and the user can see it. I default no.""",
 measure="""Share of writes in the three buckets, surprise-rate in user reviews, stale open tasks.""",
 kps=["Allowlist: decisions, preferences, open tasks.", "Deny: chit-chat, dumps, secrets, untrusted web.", "Keys beat free-form diary entries.", "Open tasks expire or close.", "Users should not be surprised by a stored fact.", "Rejected options are not decisions."],
 qs=[Q("What three classes of fact are worth remembering?", "Decisions, user preferences, and open tasks. Not every chat line.", "recall"),
     Q("How do you treat a user-rejected plan?", "Do not store it as a decision. Store “rejected X on date” only if it prevents a harmful retry.", "apply"),
     Q("The agent nags about a finished ticket. What was missing?", "A close event or TTL on open tasks, and an update to forget the open state.", "debug"),
     Q("Why is “user would be surprised” a useful test?", "It catches creepy or incorrect memories before legal or Twitter does. If they would not expect it stored, drop it.", "apply"),
     Q("Where do secrets go?", "Nowhere in memory. Drop, redact, rotate. They are not prefs.", "recall")],
 links=[L["oai_prompt"], L["ant_prompt"]],
),
"forgetting-as-a-feature": sc(
 what="""**TTL and explicit delete keep memory from rotting.** Forgetting is not a failure of the system. It is how you stay correct and lawful. Every write should have a default lifetime or a close event, and every user should have a delete.

Rotten memory is worse than no memory: the agent is confidently last year.""",
 why="""This is the other half of long-term memory in interviews. Juniors talk about embeddings. Seniors talk about delete and TTL. On the job, a forgotten stale address is a support win; an un-deletable profile is a legal loss.""",
 how="""Schema: `ttl` or `expires_at` on every row. Jobs sweep expired rows and embeddings. User delete calls the same path. Product delete (“task closed”) calls the same path.

Some classes never expire (account language) until updated. Some expire in days (one-off travel dates). Document that table.

Test forget like you test write: plant, forget, retrieve-empty, check caches.""",
 failures=F("TTL only on the SQL row.",
 "Delete in the UI that hides the row from the user but still retrieves it.",
 "No sweep job so TTL is decorative."),
 line="""Forgetting is a feature: TTL and explicit delete. I test that retrieve is empty afterwards, including the index and the cache.""",
 walk="""Travel dates from March were still retrieved in October. You put a 30-day TTL on `task.travel.*`. The agent stops asking about a finished trip. A delete-all for a departing employee clears 100% in the test.""",
 follow="""They ask about “soft forget” for analytics. Say: analytics is aggregated and separate. Product memory that the model sees must actually go away.""",
 measure="""Sweep success, retrieve-after-forget rate (target 0), stale-fact tickets.""",
 kps=["TTL and explicit delete are part of memory design.", "Forget clears SQL, vectors and caches.", "Different keys have different lifetimes.", "User delete and product close share a path.", "Test forget with a plant-and-retrieve-empty job.", "Stale memory is worse than missing memory."],
 qs=[Q("Why is forgetting a feature rather than a defect?", "Facts rot and users have a right to delete. TTL and delete keep the agent correct and lawful.", "recall"),
     Q("A TTL fired but the agent still recalls the fact. Where do you look?", "The vector index, a cache, or a summary that copied the fact. Forget must hit every copy.", "debug"),
     Q("Which memories should expire quickly?", "One-off tasks and travel dates. Stable prefs expire only on update.", "apply"),
     Q("How do you test forget?", "Plant a canary, call forget, assert retrieve is empty in row, index and cache.", "apply"),
     Q("Why must the model-visible path actually delete?", "Hiding a row in the UI while still injecting it is a lie and a compliance bug.", "recall")],
 links=[L["oai_prompt"], L["ant_prompt"]],
),
},
}
