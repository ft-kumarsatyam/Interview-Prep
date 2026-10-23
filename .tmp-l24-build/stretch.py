"""Insert a review paragraph into notes that are under the target length."""

from __future__ import annotations


def apply(explain: str, review: str) -> str:
    review = review.strip()
    if not review:
        return explain
    marker = "## What you would say in 30 seconds"
    block = f"## How you would defend it in a review\n\n{review}\n\n"
    if "## How you would defend it in a review" in explain:
        return explain
    if marker in explain:
        return explain.replace(marker, block + marker, 1)
    return explain.rstrip() + "\n\n" + block


# Unique review paragraphs for notes written before the review section existed.
STRETCH: dict[str, dict[str, str]] = {
 "m2-1": {
  "messages-roles-usage-metadata": "A reviewer should see a logged finish reason and a usage row on the first PR, not after the first bill. Ask the author to point at the code that branches on length versus stop versus tool_calls. If they only print content, the review fails. Also ask where user and tool text is treated as untrusted: if the answer is the system role, they have not understood the note.",
  "apis-are-stateless": "Ask where the transcript lives and what is resent on turn two. If the answer is a vendor thread id with no row in our database, reject the PR. Ask for the cap or summary policy before the window fills. A demo that works for three turns is not a conversation store.",
  "application-state-vs-model-context": "Ask the author to list, for one request, what they fetch live versus what they replay from history. If order status is not fetched live, the review fails. Ask them to show the assembled prompt for a failed turn, not a screenshot of the UI.",
  "managing-api-keys-safely": "Grep the diff for the key name. If it appears in a client bundle, a log line, or a committed .env, the review is a reject. Ask which environment this key is scoped to and what the spend cap is. No cap is not an answer.",
  "inspecting-the-full-response-object": "Ask the author to name the inspector fields and to show that the stream path calls the same function. If tool_calls are handled only on the sync path, the review fails. Ask how they would file a vendor ticket tomorrow.",
  "usage-objects-and-billed-tokens": "Ask which columns land in the warehouse and whether billed tokens are copied from the vendor field. If they sum prompt plus completion and call it the invoice, send them back. Ask what pages when tokens per request double.",
  "idempotent-client-wrappers": "Ask to see the request id created before attempt one, the timeout, and the retry map. A for-loop around the SDK is a reject. Ask what happens if a tool already succeeded and the model then timed out.",
  "interview": "In a mock interview, time them. If they cannot name env key, timeout, usage log, and never-print-the-key in sixty seconds, they do not have the talking point yet. Follow up with where the browser puts the key; the only passing answer is nowhere.",
 },
 "m2-2": {
  "rendering-output-incrementally": "Ask to see first paint in the UI, not only the SDK iterator. If the page still shows a spinner until the end, streaming is not shipped. Ask what happens to the buffer when the last event arrives: the same inspector as sync must run.",
  "ttft-perceived-latency": "Ask for three timestamps on a recent trace: start, first token, last token. If they have one number called latency, the review fails. Ask whether first paint is measured, not only the socket byte.",
  "accumulating-and-interrupting-streams": "Click Stop in the review. If the vendor call continues, reject. Ask where the cancelled partial is stored and confirm no tool ran. A stop that only sets React state is incomplete.",
  "backpressure-when-the-ui-is-slow": "Ask what bounds the in-memory queue and what happens if the client socket stops reading. Unbounded push is a reject. Ask whether disconnect aborts the vendor body so you stop paying.",
  "partial-json-during-streaming": "Ask when JSON.parse runs. If the answer is on every delta, reject. Ask what they do on finish_reason=length mid-object; inventing a closing brace is a reject.",
  "interview": "Time the cancel speech. They must say abort the body, stop billing, persist cancelled, no parse, no tools. If they only mention hiding the spinner, they fail the talking point.",
 },
 "m2-3": {
  "why-orchestration-libraries-exist": "Ask what raw HTTP call the chain will make and which glue they are actually using. If they cannot name the request, they do not understand the layer. If the feature is one call and they imported the universe, ask them to justify the dependency.",
  "models-templates-output-parsers": "Ask them to point at the template, the model config, and the parser in the diff. Ask where they log the rendered messages. If the only log is the chain class name, the review fails.",
  "working-across-providers": "Ask for the eval result on the second provider and one raw request dump. An unused ChatX import is not portability. Ask which domain types still mention the first vendor.",
  "composing-pipelines-with-runnables": "Ask them to walk the pipe on a whiteboard and to name each stage. If a documented if was replaced by an anonymous router, ask them to put the if back. Ask how they stream without parsing every delta.",
  "raw-sdk-vs-langchain": "Ask to see the production lines — timeout, usage, validate — in the LangChain version. A shorter sample that dropped those lines is worse than the raw SDK. Ask how long a 400 takes to diagnose.",
  "langchain-is-a-layer-not-the-model": "Ask who they would page if p95 jumped versus if a field vanished after a library upgrade. If both answers are LangChain, they have not split the layer from the model. Ask where the port lives.",
  "vendor-lock-in-vs-raw-sdk": "Ask where retries, logs, and schemas live. If any of the three exist only as framework defaults, the port is fake. Ask when they last ran the eval suite on a second driver.",
  "debugging-through-a-runnable": "Ask them to produce the rendered prompt for a failing request id. If they cannot, the pipeline is not debuggable. Ask how PII is gated on that dump.",
 },
 "m2-4": {
  "schema-constrained-generation": "Ask which native flag the call sets and what the parse-fail rate is. If the answer is we asked it to return JSON, reject the PR. Ask where local validation still runs after the constraint.",
  "defining-schemas": "Open the schema. If every field is an optional string, send it back. Ask whether vendor, validator, and app types are generated from one model. Two pasted copies fail the review.",
  "provider-native-vs-framework-support": "Ask which path the helper used on last week's model id: native, tool, or prompt fallback. If they do not log the path, they cannot explain a parse-rate jump. Ask for the request-body test.",
  "validating-before-use": "Find the first side effect in the handler. The validator must sit above it. dict.get as a validator is a reject. Ask whether batch uses the same function.",
  "syntactic-validity-vs-semantic-correctness": "Ask for parse_ok and task_ok as separate numbers. If they only have parse rate, the feature is not evaluated. Ask which emitted ids are looked up before the user sees them.",
  "generate-validate-repair": "Ask how many repairs are allowed and what the reject object looks like. Unbounded retry-until-valid is a reject. Ask how length is handled — closing braces is a fail.",
  "enum-and-optional-fields-in-schemas": "Ask them to tighten one free-form field into an enum with an escape. If they argue they might need new values, ask how they will version the schema. A junk-drawer extra string fails.",
  "what-to-do-when-the-model-omits-a-field": "Ask what happens when a required key is missing. A default that invents a label or an id is a reject. Ask them to distinguish optional omit from required omit in the handler.",
 },
}
