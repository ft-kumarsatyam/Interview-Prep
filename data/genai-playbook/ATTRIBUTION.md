GenAI Interview Playbook --- Project Context, Research Sources & Attribution Policy
Purpose: This is the source-of-truth context file for AI
assistants (including Claude) helping develop the GenAI Interview
Playbook course, roadmap, schedule, lessons, projects, and
assessments. It expands the source library and explains how to use
each resource without creating an unstructured collection of links.

1. Project overview
The GenAI Interview Playbook is an original learning and
interview-preparation project organised around the owner-provided
Top-Tier GenAI Interview Preparation Playbook PDF.

Project paths: - Course: data/courses/genai-playbook/ - Roadmap:
data/roadmaps/genai-interview-playbook.json - Schedule: plan.json

Target roles: - Software Engineer, AI - GenAI / LLM Engineer - AI
Application Engineer - Agentic AI Engineer - AI Platform / LLMOps
Engineer (secondary/stretch) - Applied ML Engineer (stretch, depending
on ML depth)

Learner context: an existing software engineer with backend/API/database
experience who is learning AI engineering and continuing daily DSA
practice. The target is interview readiness by March 2027. Do not design
the course as if the learner were new to software engineering.
2. How to use this resource library
Do not turn the course into a list of every possible framework. Use
sources according to these rules:
1. One primary source per topic to prevent duplicated learning.
2. Official documentation for exact APIs, current behavior, and
   implementation details.
3. Structured courses for teaching sequence and exercises.
4. Research papers and university courses for deeper conceptual
   understanding, only when needed.
5. Interview question banks for retrieval practice, not as
   authoritative definitions or guarantees of employer questions.
6. Security standards for threat modeling and production
   safeguards.
7. Link to resources; write original lessons and examples unless the
   source's licence clearly permits reuse.
8. Label resources as core, supplemental, or advanced; the
   learner must not attempt every source.
3. Resource map by curriculum domain
A. Python, software engineering and APIs
Primary - Python Tutorial: https://docs.python.org/3/tutorial/ -
Python Standard Library: https://docs.python.org/3/library/ - FastAPI
Tutorial: https://fastapi.tiangolo.com/tutorial/ - Pydantic
documentation: https://docs.pydantic.dev/latest/ - pytest documentation:
https://docs.pytest.org/ - Real Python tutorials (supplemental):
https://realpython.com/

Use for - Python data structures, functions, classes, modules,
exceptions, typing, iterators/generators, context managers, async/await,
testing, logging, packaging and HTTP APIs. - API validation, dependency
injection, request/response schemas, error handling, streaming,
authentication, and service testing.

Course outputs - Small Python utilities with tests. - A FastAPI
service with validation, logging, config, and tests. - A written
comparison of synchronous, asynchronous, threaded, and process-based
work.
B. SQL, relational data and vector storage
Primary - SQLBolt: https://sqlbolt.com/ - PostgreSQL documentation:
https://www.postgresql.org/docs/ - Use The Index, Luke!:
https://use-the-index-luke.com/ - pgvector:
https://github.com/pgvector/pgvector

Use for - SELECT/JOIN/GROUP BY, CTEs, window functions, constraints,
indexes, query plans, transactions, isolation, migrations, schema
design, connection pooling, and debugging slow queries. - Store
documents, chunks, embedding vectors, metadata, tenant/user permissions,
evaluation cases, and traces. - Learn pgvector before adding a separate
vector database unless a project or target role requires one.

Course outputs - Timed SQL question set. - Data model for a
multi-tenant RAG application. - Query-plan analysis and an explanation
of index trade-offs.
C. Mathematics and machine learning foundations
Primary - Google Machine Learning Crash Course:
https://developers.google.com/machine-learning/crash-course -
3Blue1Brown neural network series:
https://www.3blue1brown.com/topics/neural-networks - scikit-learn User
Guide: https://scikit-learn.org/stable/user_guide.html - PyTorch
Tutorials: https://pytorch.org/tutorials/

Supplemental - fast.ai Practical Deep Learning:
https://course.fast.ai/ - Dive into Deep Learning: https://d2l.ai/

Use for - Vectors/matrices, dot products, probability, loss,
gradients, optimization, train/validation/test splits, leakage,
overfitting, regularization, classification metrics, neural-network
training and tensor shapes. - Understand enough classical ML to explain
the foundations of LLMs and evaluate model behavior. Do not let advanced
ML theory displace core application engineering and interview practice.

Course outputs - Train/evaluate a small baseline model. - Explain
precision, recall, F1, data leakage and overfitting with examples. -
Explain a PyTorch training loop and tensor shapes.
D. NLP, transformers and LLM foundations
Primary - Hugging Face LLM Course:
https://huggingface.co/learn/llm-course - The Illustrated Transformer:
https://jalammar.github.io/illustrated-transformer/ - Stanford CS336:
Language Modeling from Scratch (advanced):
https://stanford-cs336.github.io/ - OpenAI developer guides:
https://platform.openai.com/docs/guides - Anthropic courses:
https://github.com/anthropics/courses

Supplemental - Full Stack Deep Learning LLM Bootcamp:
https://fullstackdeeplearning.com/llm-bootcamp/

Use for - Tokenization, tokens and chat templates, embeddings,
attention, queries/keys/values, transformer blocks, pretraining,
instruction tuning, inference, context windows, sampling, KV cache,
quantization, model limitations, and model selection. - Separate what is
essential for an application engineer from deeper model-training
content.

Course outputs - Closed-book explanation of the transformer data
flow. - Compare prompting, RAG, fine-tuning and long-context input. -
Build a provider-agnostic API wrapper with structured outputs,
streaming, timeouts, retries and logging.
E. Prompt engineering and LLM application development
Primary - OpenAI developer guides:
https://platform.openai.com/docs/guides - Anthropic courses:
https://github.com/anthropics/courses - Full Stack Deep Learning LLM
Bootcamp: https://fullstackdeeplearning.com/llm-bootcamp/

Use for - Prompt structure, system/developer/user instructions,
few-shot examples, structured outputs, tool calling, streaming,
model/provider abstraction, retries, timeouts, rate limits, caching,
token budgets, latency and cost estimation. - Treat prompts as versioned
software artifacts that require tests and evaluation, not as magic
strings.

Course outputs - Prompt test set and regression checks. -
Structured-output endpoint with schema validation. - A cost/latency
comparison between two model or prompt configurations.
F. RAG, retrieval and search
Primary - Hugging Face Learn: https://huggingface.co/learn - NVIDIA
Generative AI / LLM learning paths:
https://www.nvidia.com/en-us/learn/learning-path/generative-ai-llm/ -
pgvector: https://github.com/pgvector/pgvector - OpenAI developer
guides: https://platform.openai.com/docs/guides

Supplemental - Full Stack Deep Learning LLM Bootcamp:
https://fullstackdeeplearning.com/llm-bootcamp/ - LlamaIndex
documentation: https://docs.llamaindex.ai/ - LangChain documentation:
https://python.langchain.com/docs/

Use for - Ingestion, parsing, normalization, chunking, embeddings,
vector indexes, metadata filtering, dense retrieval, BM25/keyword
search, hybrid retrieval, reranking, query rewriting, context
construction, citations, abstention, document updates/deletion,
permissions and retrieval evaluation. - Teach the underlying concepts
first, then use a framework to accelerate implementation. - Avoid
teaching every orchestration framework in parallel. Pick one main
framework after building a small plain-Python baseline.

Course outputs - RAG system with citations and source references. -
Evaluation set with retrieval and answer-quality checks. - Failure
analysis separating retrieval failure, context failure, and generation
failure. - Permission-aware retrieval design.
G. Evaluation, observability and LLMOps
Primary - OpenAI developer guides:
https://platform.openai.com/docs/guides - Anthropic courses:
https://github.com/anthropics/courses - Weights & Biases documentation:
https://docs.wandb.ai/ - MLflow documentation:
https://mlflow.org/docs/latest/ - NVIDIA GenAI learning paths:
https://www.nvidia.com/en-us/learn/learning-path/generative-ai-llm/

Use for - Golden datasets, offline evaluation, human review,
LLM-as-judge limitations, regression testing, tracing, prompt/model
versioning, latency, cost, reliability, failure taxonomy, canary
releases and rollback. - Track retrieval metrics separately from answer
metrics. Do not rely on one aggregate score or a few hand-picked demos.

Course outputs - Repeatable evaluation harness. - Comparison report
for model/prompt/retrieval variants. - Basic dashboard or report
covering quality, latency, token usage, cost and errors.
H. Agentic AI, workflows and MCP
Primary - Hugging Face Agents Course:
https://huggingface.co/agents-course - Microsoft AI Agents for
Beginners: https://github.com/microsoft/ai-agents-for-beginners -
Berkeley LLM Agents course materials:
https://github.com/rdi-berkeley/llm-agents - Model Context Protocol
(MCP) documentation: https://modelcontextprotocol.io/ - LangGraph
documentation: https://docs.langchain.com/oss/python/langgraph/overview

Supplemental - NVIDIA AI developer learning paths:
https://developer.nvidia.com/topics/ai/ - LlamaIndex documentation:
https://docs.llamaindex.ai/

Use for - Tool schemas and validation, tool execution, state,
observations, routing, planning, memory, checkpoints, retries, stop
conditions, human approval, workflow-vs-agent decisions, MCP
clients/servers/tools, authorization, tracing, and agent evaluation. -
Start with a small plain-Python tool loop. Add one framework only when
state management or orchestration complexity justifies it. - Prefer
deterministic workflows for predictable tasks; do not use autonomous
multi-agent designs just because they are fashionable.

Course outputs - Bounded tool-using agent with explicit limits. -
State/workflow diagram. - Test suite for tool errors, loops, malformed
outputs and permission failures. - Human approval for consequential
actions.
I. AI safety, application security and privacy
Primary - OWASP GenAI Security Project / 2026 LLM Top 10:
https://genai.owasp.org/resource/owasp-genai-llm-top-10/ - OWASP GenAI
Security Project: https://genai.owasp.org/ - NIST AI Risk Management
Framework: https://www.nist.gov/itl/ai-risk-management-framework - NIST
AI RMF Generative AI Profile:
https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence -
Model Context Protocol security guidance:
https://modelcontextprotocol.io/

Use for - Prompt injection, insecure output handling, sensitive-data
exposure, excessive agency, untrusted retrieved content, tool
permissioning, tenant isolation, secret management, data retention,
auditability, model/provider risks and abuse controls. - Threat-model
the entire application, not just the prompt. - Never treat prompt
wording as a substitute for authorization, validation, sandboxing or
least-privilege permissions.

Course outputs - Threat model for RAG and agent projects. - Security
tests for prompt injection and unauthorized retrieval. - Permission
matrix and human-approval policy.
J. Docker, cloud, deployment and backend reliability
Primary - Docker getting started:
https://docs.docker.com/get-started/ - Docker guides:
https://docs.docker.com/guides/ - AWS Skill Builder:
https://skillbuilder.aws/ - AWS Well-Architected Framework:
https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html -
FastAPI deployment concepts: https://fastapi.tiangolo.com/deployment/ -
Redis documentation: https://redis.io/docs/latest/

Use for - Dockerfiles, image layers, Compose, networking, volumes,
secrets, CI/CD, environment config, health checks, background jobs,
queues, caching, idempotency, rate limits, retries, connection pooling,
monitoring, backups and rollback. - Learn cloud deployment at a
practical level. Kubernetes, distributed training and self-hosted
inference are stretch topics unless target job descriptions require
them.

Course outputs - Containerized API, database and worker. - CI
pipeline with tests. - Deployment/runbook documentation. - Basic
operational dashboard and failure-handling plan.
K. System design and software engineering interviews
Primary - Amazon Software Development Interview Topics:
https://www.amazon.jobs/content/en/how-we-hire/interview-prep/software-development-topics -
System Design Primer:
https://github.com/donnemartin/system-design-primer - Google SRE Book:
https://sre.google/sre-book/table-of-contents/ - Google Technical
Writing: https://developers.google.com/tech-writing

Use for - Requirements clarification, APIs, data modeling, capacity
estimates, bottlenecks, caching, queues, consistency, reliability,
security, observability, cost and trade-offs. - Apply conventional
system design fundamentals to AI services, then deepen into retrieval
pipelines, model-provider limits, evaluation, token cost and agent tool
permissions.

Course outputs - 45-minute RAG system design. - 45-minute
customer-support agent design with human approval. - Concise project
walkthrough and clear technical writing.
L. DSA and coding interviews
Primary - LeetCode: https://leetcode.com/ - NeetCode roadmap:
https://neetcode.io/roadmap - The Algorithms (reference implementations;
use for study, not copying): https://github.com/TheAlgorithms/Python

Use for - Arrays/strings, hash maps/sets, two pointers, sliding
window, binary search, stacks/queues, linked lists, trees, heaps,
graphs, recursion/backtracking, dynamic programming, complexity analysis
and timed communication. - Continue daily practice. Keep an error log
and revisit missed problems after a short interval. - Do not let
AI-specific study replace coding interview readiness.

Course outputs - Daily problem-solving log. - Weekly timed coding
set. - Re-solved error-log problems without hints. - Verbal explanation
of brute force, optimized solution, correctness, complexity and edge
cases.
M. Interview question banks and role research
Resources - AI Engineer interview question collection:
https://github.com/landedjobs/awesome-ai-engineer-interview - GenAI
interview practice collection:
https://deepankarkotnala.github.io/genai/interview-prep/index.html -
Amazon software engineering interview guidance:
https://www.amazon.jobs/content/en/how-we-hire/interview-prep/software-development-topics

Use for - Question discovery, revision prompts and mock interview
design. - Validate answers against official documentation and
implementation experience. - Review real job descriptions for each
target role; job requirements vary by company and seniority. - Do not
present any question bank as a guarantee of interview questions or as a
substitute for fundamentals.
4. Existing roadmap sources and attribution
h9-tec/ai-roadmap-2026
- URL: https://github.com/h9-tec/ai-roadmap-2026
- Licence identified by the project owner: CC BY 4.0.
- Licence: https://creativecommons.org/licenses/by/4.0/
- Usage: Linked as a reference. If lesson content materially adapts
  it, identify the source, state that changes were made, and follow
  licence requirements.
Suggested attribution: > Adapted in part from
h9-tec/ai-roadmap-2026,
licensed under CC BY
4.0. Changes have been
made.
AdilShamim8/GenAI-Roadmap-with-Notes-and-Projects
- URL:
  https://github.com/AdilShamim8/GenAI-Roadmap-with-Notes-and-Projects/
- Licence identified by the project owner: MIT.
- Copyright notice: Copyright (c) 2026 Adil Shamim
- Usage: Prefer original content. If material is reused or adapted,
  verify the current repository licence and preserve the applicable
  copyright and permission notice.
MyEngineeringPath
- URL: https://myengineeringpath.dev/genai-engineer/roadmap/
- Licence status: No licence identified by the project owner.
- Usage: Link only. Do not reproduce text, diagrams, exercises,
  distinctive structure, or presentation without permission or a
  suitable licence.
General attribution rules
- A link is not a licence.
- Do not copy substantial text or distinctive diagrams from unlicensed
  sources.
- Verify the licence of any new source before reuse.
- Keep attribution near adapted content when appropriate.
- Distinguish original, adapted, and linked-only content.
- This register reflects the project owner's understanding and is not
  legal advice; re-check before publishing or redistributing.
5. Curriculum coverage matrix
Every topic should have a clear priority and a practical proof of
learning.
  Domain                  Priority                Required proof
  Python, testing, async, Core                    Tested service and
  APIs                                            coding interview
                                                  readiness

  SQL and data modeling   Core                    Timed SQL work and RAG
                                                  schema

  ML/math foundations     Core fundamentals       Explain metrics,
                                                  training, overfitting
                                                  and tensors

  Transformers and LLM    Core                    Closed-book
  inference                                       explanations and API
                                                  implementation

  Prompting and           Core                    Versioned prompts and
  structured output                               schema-validated output

  Embeddings and RAG      Core                    Working RAG app with
                                                  citations and
                                                  evaluation

  Evaluation and          Core                    Repeatable benchmark
  observability                                   and failure report

  Agents and tool calling Core                    Bounded agent with
                                                  tests and traces

  MCP                     Role-specific core for  Explain
                          agent roles             client/server/tool
                                                  model and security
                                                  boundaries

  AI safety and privacy   Core                    Threat model and
                                                  permission tests

  Docker, CI/CD,          Core                    Deployed, reproducible
  deployment                                      service

  AWS and Redis           Practical               Explain and implement
                                                  relevant components

  Fine-tuning, LoRA/QLoRA Supplemental            Explain when to use and
                                                  basic workflow

  Kubernetes, vLLM,       Stretch unless job      Conceptual trade-off
  distributed training    requires                explanation

  DSA                     Daily core              Timed problems,
                                                  complexity and clear
                                                  communication

  Behavioral and project  Core                    6--8 truthful STAR-L
  interviews                                      stories and project
                                              walkthrough
6. Rules for AI assistants editing this project
Before editing
1. Inspect existing course files, roadmap JSON, schedule, and
   owner-provided PDF.
2. Identify schemas, IDs, naming conventions and references.
3. Check missing prerequisites, duplicated topics, date gaps, stale
   links and inconsistent terms.
4. Preserve IDs and schema where possible.
5. Make a concise audit before major changes.
While editing
- Keep course lessons, roadmap entries and schedule tasks aligned.
- Use this lesson pattern: purpose → prerequisites → explanation →
  example → hands-on task → assessment → interview questions →
  references.
- Include a mix of conceptual, coding, debugging, system-design and
  evaluation exercises.
- Maintain daily DSA.
- Separate must-know topics from role-specific and stretch topics.
- Do not add a source merely to make the bibliography longer; map it
  to a specific learning outcome.
- Do not invent citations, licences, employer requirements,
  performance numbers or project results.
- Prefer original explanations and small examples.
- If a framework is introduced, explain the underlying pattern first.
After editing
Report: 1. Files created or changed. 2. Why each change improves the
course. 3. Source URLs and licence status. 4. Validation results: JSON
parse, schema compatibility, date coverage, cross-file references,
duplicate topics, and links where checks are possible. 5. Remaining gaps
and assumptions.
7. Quality checklist
Course quality
- [ ] Each lesson has measurable outcomes.
- [ ] Prerequisites and estimated time are stated.
- [ ] Each lesson includes explanation, example, hands-on practice and
  assessment.
- [ ] Questions test reasoning and trade-offs, not memorisation alone.
- [ ] Difficulty progresses logically.
- [ ] The learner must recall, implement and explain concepts.
- [ ] DSA remains a daily track.
- [ ] Weekends use longer blocks for projects, mock interviews and
  review.
Project consistency
- [ ] Course lesson IDs match roadmap references.
- [ ] Schedule tasks point to valid lessons or tasks.
- [ ] Dates and milestones align through March 2027.
- [ ] No required domain is omitted.
- [ ] No unnecessary framework duplication.
- [ ] JSON parses and schema remains compatible.
- [ ] Markdown and links are valid.
Attribution
- [ ] Adapted sources are identified.
- [ ] Required notices are preserved.
- [ ] Unlicensed sources are linked only.
- [ ] New sources are licence-checked.
- [ ] Original, adapted and linked-only content are distinguished.
8. Recommended next action
Audit the current course, roadmap, and schedule against the curriculum
coverage matrix. Then create a source-to-lesson mapping with these
fields:
- topic
- learning_outcome
- priority (core, role_specific, supplemental, stretch)
- primary_source_url
- supplemental_source_urls
- source_type (official_docs, course, university,
  security_standard, interview_practice, repository)
- licence_status (official_reference_link, CC-BY-4.0, MIT,
  unknown_link_only, or another verified status)
- lesson_id
- hands_on_task
- assessment
- interview_questions
- estimated_minutes
Use that mapping to find coverage gaps and update the existing course
without duplicating content. Do not create a huge resource list with no
connection to lessons.
9. Current attribution statement
The course (data/courses/genai-playbook/), roadmap
(data/roadmaps/genai-interview-playbook.json), and schedule
(plan.json) are original project work organised around the
owner-provided Top-Tier GenAI Interview Preparation Playbook PDF.

The project links to the sources listed in this document. Where lessons
adapt licensed material, attribution and applicable notices must
accompany that material. MyEngineeringPath and any other sources without
verified reuse permission are linked for further reading only.