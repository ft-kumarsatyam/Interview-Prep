# 0005. Hybrid keyword + vector retrieval with an in-process fallback

**Status:** Accepted

## Context
"Ask your notes" must answer from the user's lessons and saved articles and cite them. Pure vector search misses exact terms
(`EXPLAIN ANALYZE`, a library name); pure keyword search misses paraphrases. Embeddings need a key; Atlas Vector Search needs an
Atlas index that does not exist on a local MongoDB.

## Decision
Chunk text (paragraph-aware, with overlap), hash each chunk, and embed only chunks whose hash changed (Gemini free tier, 768 dims).
Retrieve with `$text` and a vector search, merge with reciprocal rank fusion (no score calibration needed). The vector half uses
Atlas `$vectorSearch` when its index exists and otherwise a cosine scan of the owner's vectors in-process (fine at personal scale,
capped at 5,000). With no key it is keyword-only. The answer streams, must cite `[n]` passages that were retrieved, and is checked
afterwards (`checkGrounding`); only a grounded answer is cached, keyed by the passages' content hash so an edited note never serves a
stale answer. Retrieved text is untrusted data in the prompt.

## Consequences
- Works everywhere, degrades gracefully, and never depends on the embedding key.
- The fallback scan is O(chunks): at tens of thousands of chunks the Atlas index must be present (migration `003` creates it on Atlas, skips elsewhere).
- Citation checking verifies that cited passages exist, not that the claim is true; the eval harness (`npm run ai:eval`) measures grounding per provider.

## Rejected
- **A hosted vector database:** a new paid or limited dependency for a corpus this small.
- **Vector-only retrieval:** embeddings blur exact terms such as a flag or library name that a keyword match finds directly. Not measured here; the golden set in `npm run ai:eval` is where a regression would show.
