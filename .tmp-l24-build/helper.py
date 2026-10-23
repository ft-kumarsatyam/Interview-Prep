"""Shared builders for Level 2 and Level 4 study notes. Not shipped."""


def note(what: str, why: str, how: str, fails: str, line: str, kps: list[str], qs: list[dict], links: list[dict] | None = None, review: str = "") -> dict:
    extra = f"\n## How you would defend it in a review\n\n{review.strip()}\n\n" if review.strip() else ""
    explain = (
        f"## What it is\n\n{what.strip()}\n\n"
        f"## Why it matters on the job and in an interview\n\n{why.strip()}\n\n"
        f"## How it works + one small example\n\n{how.strip()}\n\n"
        f"## Failure modes\n\n{fails.strip()}\n\n"
        f"{extra}"
        f"## What you would say in 30 seconds\n\n{line.strip()}\n"
    )
    return {
        "explain": explain,
        "keyPoints": kps,
        "questions": qs,
        "links": links or [],
    }


OA_CHAT = {"title": "OpenAI: text generation", "url": "https://platform.openai.com/docs/guides/text"}
OA_API = {"title": "OpenAI: Chat Completions API", "url": "https://platform.openai.com/docs/api-reference/chat"}
OA_STREAM = {"title": "OpenAI: streaming responses", "url": "https://platform.openai.com/docs/guides/streaming-responses"}
OA_TOOLS = {"title": "OpenAI: function calling", "url": "https://platform.openai.com/docs/guides/function-calling"}
OA_STRUCT = {"title": "OpenAI: structured outputs", "url": "https://platform.openai.com/docs/guides/structured-outputs"}
OA_EMBED = {"title": "OpenAI: embeddings", "url": "https://platform.openai.com/docs/guides/embeddings"}
OA_BATCH = {"title": "OpenAI: Batch API", "url": "https://platform.openai.com/docs/guides/batch"}
OA_KEYS = {"title": "OpenAI: API keys best practices", "url": "https://platform.openai.com/docs/guides/safety-best-practices"}
AN_MSG = {"title": "Anthropic: Messages API", "url": "https://docs.anthropic.com/en/api/messages"}
AN_STREAM = {"title": "Anthropic: streaming", "url": "https://docs.anthropic.com/en/docs/build-with-claude/streaming"}
AN_TOOLS = {"title": "Anthropic: tool use", "url": "https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview"}
AN_STRUCT = {"title": "Anthropic: structured outputs", "url": "https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs"}
LC_INTRO = {"title": "LangChain: introduction", "url": "https://python.langchain.com/docs/introduction/"}
LC_CONCEPTS = {"title": "LangChain: concepts", "url": "https://python.langchain.com/docs/concepts/"}
LC_RUN = {"title": "LangChain: runnables", "url": "https://python.langchain.com/docs/concepts/runnables/"}
LC_STRUCT = {"title": "LangChain: structured output", "url": "https://python.langchain.com/docs/how_to/structured_output/"}
LC_TOOLS = {"title": "LangChain: tool calling", "url": "https://python.langchain.com/docs/how_to/tool_calling/"}
LG_HOME = {"title": "LangGraph documentation", "url": "https://langchain-ai.github.io/langgraph/"}
LI_HOME = {"title": "LlamaIndex: understanding", "url": "https://docs.llamaindex.ai/en/stable/understanding/"}
DSPY = {"title": "DSPy documentation", "url": "https://dspy.ai/"}
PGV = {"title": "pgvector", "url": "https://github.com/pgvector/pgvector"}
QDRANT = {"title": "Qdrant: search", "url": "https://qdrant.tech/documentation/concepts/search/"}
HF_EMBED = {"title": "Hugging Face: sentence transformers", "url": "https://huggingface.co/docs/transformers/en/tasks/sentence_similarity"}
GEM_EMBED = {"title": "Gemini: embeddings", "url": "https://ai.google.dev/gemini-api/docs/embeddings"}
