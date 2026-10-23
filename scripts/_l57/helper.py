"""Shared builders for Level 5 and Level 7 study notes. Not shipped."""

from __future__ import annotations


def entry(
    what: str,
    why: str,
    how: str,
    failures: str,
    line: str,
    walk: str,
    follow: str,
    measure: str,
    key_points: list[str],
    questions: list[dict],
    links: list[dict] | None = None,
) -> dict:
    explain = (
        f"## What it is\n\n{what.strip()}\n\n"
        f"## Why it matters on the job and in an interview\n\n{why.strip()}\n\n"
        f"## How it works + one small example\n\n{how.strip()}\n\n"
        f"## Failure modes\n\n{failures.strip()}\n\n"
        f"## What you would say in 30 seconds\n\n{line.strip()}\n\n"
        f"## A concrete walk-through\n\n{walk.strip()}\n\n"
        f"## Interview follow-up\n\n{follow.strip()}\n\n"
        f"## What I would measure\n\n{measure.strip()}\n"
    )
    return {
        "explain": explain,
        "keyPoints": key_points,
        "questions": questions,
        "links": links or [],
    }


# Official docs used across notes. Titles stay short; URLs are https.
L = {
    "oai_tools": {"title": "OpenAI: function calling", "url": "https://platform.openai.com/docs/guides/function-calling"},
    "oai_agents": {"title": "OpenAI: agents guide", "url": "https://platform.openai.com/docs/guides/agents"},
    "oai_evals": {"title": "OpenAI: evals", "url": "https://platform.openai.com/docs/guides/evals"},
    "oai_prompt": {"title": "OpenAI: prompt engineering", "url": "https://platform.openai.com/docs/guides/prompt-engineering"},
    "ant_tools": {"title": "Anthropic: tool use", "url": "https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview"},
    "ant_agents": {"title": "Anthropic: agent overview", "url": "https://docs.anthropic.com/en/docs/agents-and-tools/overview"},
    "ant_eval": {"title": "Anthropic: test and evaluate", "url": "https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests"},
    "ant_prompt": {"title": "Anthropic: prompt engineering", "url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"},
    "gem_fc": {"title": "Gemini: function calling", "url": "https://ai.google.dev/gemini-api/docs/function-calling"},
    "gem_long": {"title": "Gemini: long context", "url": "https://ai.google.dev/gemini-api/docs/long-context"},
    "mcp": {"title": "Model Context Protocol docs", "url": "https://modelcontextprotocol.io/docs/getting-started/intro"},
    "mcp_arch": {"title": "MCP architecture", "url": "https://modelcontextprotocol.io/docs/learn/architecture"},
    "lg": {"title": "LangGraph overview", "url": "https://docs.langchain.com/oss/python/langgraph/overview"},
    "lg_persist": {"title": "LangGraph persistence", "url": "https://docs.langchain.com/oss/python/langgraph/persistence"},
    "lg_hitl": {"title": "LangGraph interrupts", "url": "https://docs.langchain.com/oss/python/langgraph/interrupts"},
    "adk": {"title": "Google ADK docs", "url": "https://google.github.io/adk-docs/"},
    "crew": {"title": "CrewAI docs", "url": "https://docs.crewai.com/en/introduction"},
    "oa_sdk": {"title": "OpenAI Agents SDK", "url": "https://openai.github.io/openai-agents-python/"},
    "hf_eval": {"title": "Hugging Face Evaluate", "url": "https://huggingface.co/docs/evaluate/index"},
    "sklearn": {"title": "scikit-learn model evaluation", "url": "https://scikit-learn.org/stable/modules/model_evaluation.html"},
    "ragas": {"title": "RAGAS documentation", "url": "https://docs.ragas.io/en/stable/"},
    "deepeval": {"title": "DeepEval docs", "url": "https://deepeval.com/docs/getting-started"},
}
