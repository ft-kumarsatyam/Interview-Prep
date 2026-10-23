from helper import entry, q

HF = "https://huggingface.co/docs"

NOTES = {
 "m1-11": {
  "what-a-benchmark-is": entry(
   what="""A **benchmark** is a **fixed set of tasks** with a **fixed scoring method**, used so different models face the **same yardstick**. MMLU, a coding suite, a math set — each is a dataset plus a metric. The yardstick is only as good as the items, the scorer, and whether the model has **seen the items**.

A benchmark is not your product. It is a **shared exam**. Shared exams leak. Shared exams saturate. Shared exams average away your edge case.

You use them to **shortlist**, then you run **your** exam.""",
   why="""Interviewers want the definition and the humility. On the job this is how you read a card without kneeling. They will ask what a "fixed scoring method" might be (exact match, majority vote, a judge model).

They will ask why two cards with 80% MMLU can behave differently on your tickets (different tests).""",
   how="""When you see a number: name the set, the metric, the shot setting (0-shot vs 5-shot), and whether it is a max over prompts. Then discount.

Build your own tiny benchmark: 50 items, a scorer, a version. That is a benchmark too — it just is not public.

Do not average a code score and a chat-preference score into "80% smart".""",
   failures="""1. **Treating the number as the product.**

2. **Mixing metrics.**

3. **Ignoring shots and prompts.**

4. **No private set.**""",
   line="""A benchmark is a fixed exam with a fixed scorer. I use it to shortlist. I do not ship on it. My 50 labelled tickets are the exam that matters.""",
   key_points=[
    "Fixed tasks + fixed scorer = benchmark.",
    "A shared exam, not your product.",
    "Note shots, prompts, leaks.",
    "Do not average unlike metrics.",
    "Your set is a benchmark too.",
    "Shortlist, then local eval.",
   ],
   questions=[
    q("recall", "What is a benchmark?", "A fixed task set with a fixed scoring method so models can be compared on the same yardstick."),
    q("apply", "What do you read next to an 80%?", "Which set, which metric, 0-shot vs few-shot, and whether it is a best-of prompt. Then discount."),
    q("debug", "Two models have the same MMLU and one fails your JSON. Why is that allowed?", "Different exams. MMLU is not JSON extract on your schema."),
    q("apply", "How do you make a private benchmark?", "Versioned items, a written scorer, a held-out split. Run every snapshot."),
    q("recall", "Why do shared exams leak?", "They sit on the internet. Training mixes and contamination can include them."),
   ],
   links=[
    {"title": "Hugging Face: evaluate", "url": f"{HF}/evaluate/index"},
    {"title": "OpenAI: evals", "url": "https://platform.openai.com/docs/guides/evals"},
   ],
  ),
  "benchmarks-quoted-on-model-cards": entry(
   what="""Cards quote **knowledge/reasoning** tests (**MMLU**, **GPQA**), **coding** tests, **math** tests, sometimes **multimodal**. Roughly: MMLU is broad multiple-choice knowledge; GPQA is harder expert-ish questions; HumanEval-style is code unit tests; MATH/GSM8K-style is written math. You need the **gist**, not the paper.

These numbers are **advertising-adjacent**. They are useful to **drop a model that scores 20% on code** if you need code. They are useless to **pick a winner** for your tickets.

Always check **whether the card reports 0-shot or 5-shot** and **which checkpoint** (base vs instruct).""",
   why="""Interviewers will say "MMLU" and expect a one-liner. On the job you skim the table in 60 seconds. They will ask which bench matters for a SQL bot (code + execution, not MMLU).

They will punish memorising paper titles without the gist.""",
   how="""60-second card read:

- Need code? Look at code benches, then still run your tests.
- Need hard reasoning? GPQA-ish, then still run your items.
- Need chat taste? Those MC suites are the wrong type — look at a preference arena as a hint, then your own raters.

If the card omits the bench that matches your task, that is information. They may be hiding a weak score.

Do not rank three models by MMLU to 0.1 points. That is noise.""",
   failures="""1. **Picking by 0.1 MMLU.**

2. **Using MMLU for a SQL bot.**

3. **Ignoring base vs instruct** on the table.

4. **Memorising without gist.**""",
   line="""I know what MMLU, GPQA, code and math suites roughly measure. I use them to drop obvious mismatches, not to pick a winner for our task. 0.1 points is noise.""",
   key_points=[
    "MMLU ≈ broad MC knowledge; GPQA ≈ harder questions.",
    "Code suites ≈ unit-test pass; math suites ≈ written problems.",
    "Use them to drop, not to crown.",
    "Check shots and checkpoint.",
    "0.1 points is noise.",
    "Missing a relevant bench is a signal.",
   ],
   questions=[
    q("recall", "What does MMLU roughly measure?", "Broad multiple-choice knowledge and some reasoning across many subjects. Not your ticket schema."),
    q("apply", "Which published benches would you glance at for a code assistant?", "HumanEval-style or a coding leaderboard, then you still run your repo's tests."),
    q("debug", "A card leads with MMLU and omits code scores for a 'coding model'. What do you think?", "They may be hiding a weak code number. Run code evals yourself."),
    q("apply", "Two models are 71.2 and 71.4 MMLU. How do you pick?", "You do not pick on that. You run your set. That gap is noise."),
    q("recall", "Why does 5-shot vs 0-shot matter on a card?", "Few-shot can lift the number. Compare like with like."),
   ],
   links=[
    {"title": "Hugging Face: Open LLM leaderboard docs", "url": "https://huggingface.co/docs/leaderboards/open_llm_leaderboard/about"},
    {"title": "Hugging Face: evaluate", "url": f"{HF}/evaluate/index"},
   ],
  ),
  "kinds-of-leaderboard": entry(
   what="""Three useful kinds. **Human-preference** arenas (**LMArena / Chatbot Arena**): people vote on blind pairs — good for **chat taste**, bad as a **task SLA**. **Aggregated dashboards**: mix capability, cost, latency — useful **maps**, still not your task. **Open-model leaderboards**: academic-style suites on downloadable models — good to **scan the open field**.

Each has a **different definition of good**. Mixing them into one number is how you get a meaningless rank.

Read the kind before the rank.""",
   why="""Interviewers will mention Arena. They want "preference, not exact-match" and "does not transfer". On the job this is how you refuse a screenshot of rank #3 as a decision.

They will ask for a second kind (open LLM leaderboard, or a cost/latency dashboard).""",
   how="""Use Arena: "is this model not terrible at general chat?" Use open leaderboard: "which 8B instruct is in the conversation for self-host?" Use a cost dashboard: "what is the cheap-fast cluster?" Then leave the boards and run your items.

If a stakeholder sends an Arena plot, thank them and book the eval slot.

Do not average Arena Elo with MMLU. Different units.""",
   failures="""1. **Arena as SLA.**

2. **Averaging unlike boards.**

3. **Ignoring who the voters are.**

4. **Open board for a closed-only decision** or the reverse.""",
   line="""Preference arenas, aggregated cost/quality dashboards, and open-model suites are different kinds of board. I read the kind, I use them as maps, and I do not ship a rank.""",
   key_points=[
    "Arena = human preference on chat pairs.",
    "Dashboards mix capability, cost, latency.",
    "Open boards scan downloadable models.",
    "Different definitions of good.",
    "Do not average unlike ranks.",
    "Maps, not SLAs.",
   ],
   questions=[
    q("recall", "Name three kinds of leaderboard.", "Human-preference arenas, aggregated capability/cost/latency dashboards, and open-model academic-style boards."),
    q("apply", "What is Arena good and bad for?", "Good as a chat-taste hint. Bad as a reliability number for your extractor."),
    q("debug", "A VP wants the Arena #1 as the only production model. Your move?", "Run the golden set. Keep a cheaper specialist if it wins the task. Explain that Elo is preference, not our metric."),
    q("apply", "When do you open the open-LLM board?", "When you are shortlisting downloadable instruct models to self-host or host."),
    q("recall", "Why not average Elo and MMLU?", "Different scales, different definitions of good, different contamination stories."),
   ],
   links=[
    {"title": "Hugging Face Open LLM leaderboard", "url": "https://huggingface.co/docs/leaderboards/open_llm_leaderboard/about"},
    {"title": "Hugging Face Open LLM leaderboard", "url": "https://huggingface.co/docs/leaderboards/open_llm_leaderboard/about"},
   ],
  ),
  "why-rank-does-not-transfer": entry(
   what="""A leaderboard rank **rarely transfers** because **your prompts**, **your tasks**, **your raters' definition of good**, and **averaged scores** are different. A model that wins casual chat can fail a terse JSON schema. A model that wins coding contests can fail your proprietary DSL. Averages hide the slice you care about.

Transfer is an empirical claim. The default is **it does not transfer**. The experiment is **your set**.

This is "no universally best" applied to boards.""",
   why="""Interviewers want this sentence. On the job it is the comment on every Slack screenshot. They will ask for a concrete mismatch (JSON vs chat).

They will punish "it is #2 so it will be #2 for us".""",
   how="""Keep a one-slide picture: Arena top-3 vs your extract exact-match. The order will shuffle. That slide pays for itself in every planning cycle.

When a rank *does* match your set, say so. You still re-check on the next snapshot.

If you only have 15 items, say the transfer claim is weak. Grow the set.""",
   failures="""1. **Copying the rank into the ADR.**

2. **No slice** — only a global average.

3. **15 items** as proof of transfer.

4. **Never updating** after a snapshot.""",
   line="""Ranks do not transfer by default. Different prompts, tasks and definitions of good. I show the shuffle on our slice and I still re-check the next snapshot.""",
   key_points=[
    "Different prompts, tasks, raters.",
    "Averages hide your slice.",
    "Default: no transfer.",
    "Prove transfer with your set.",
    "Orders shuffle across metrics.",
    "Re-check snapshots.",
   ],
   questions=[
    q("recall", "Why does a leaderboard rank rarely transfer?", "Your prompts, task, and definition of good differ, and public scores are averages that hide your slice."),
    q("apply", "Give a mismatch example.", "An Arena-winning chat model fails a strict JSON schema; a mid-rank model passes because it was post-trained for instructions."),
    q("debug", "An ADR says 'we picked #2'. What is missing?", "The local metric, the set, and the date. #2 of what, when."),
    q("apply", "How do you show non-transfer in a meeting?", "A table: public rank vs our exact-match. The order shuffles. That is the slide."),
    q("recall", "When might a rank weakly transfer?", "When your task is close to the board's (general chat vs Arena). Still measure."),
   ],
   links=[
    {"title": "Hugging Face Open LLM leaderboard", "url": "https://huggingface.co/docs/leaderboards/open_llm_leaderboard/about"},
    {"title": "OpenAI: evals", "url": "https://platform.openai.com/docs/guides/evals"},
   ],
  ),
  "what-inflates-published-scores": entry(
   what="""Scores inflate via **contamination** (items in the train mix), **saturation** (everyone is 90%+ so the bench is dull), **overfitting to public tests** (prompting and training against the known set), and **favourable run configs** (best-of-n, generous judges, cherry-picked shots). A high number can be **real capability** or **exam technique**.

You cannot see which from the card alone. You can **discount** and **run your own set**.

This pairs with the contamination item later.""",
   why="""Interviewers want two inflation causes. On the job this is how you stay calm when a card jumps 8 points. They will ask what you would trust more (a private set, a live A/B).

They will punish taking a best-of-32 number as a single-sample SLA.""",
   how="""Discount checklist: is the bench old and public? Is everyone saturated? Did they report best-of? Did they use a judge that likes verbosity? Then cut the number in your head and move on.

If you must compare cards, compare the same bench, same shots, same date. Still do not ship on it.

Your set should stay private and rotate items so you do not contaminate yourself.""",
   failures="""1. **Best-of-n as the SLA.**

2. **A saturated bench** as a ranking.

3. **No discount.**

4. **Publishing your only eval set.**""",
   line="""Published scores inflate from contamination, saturation, overfitting and friendly configs. I discount the card and I keep a private, rotating set. Best-of-n is not my p50.""",
   key_points=[
    "Contamination, saturation, overfit, friendly configs.",
    "Best-of is not a single-call SLA.",
    "Saturated benches do not rank.",
    "Discount, then local eval.",
    "Keep your set private and rotating.",
    "An 8-point card jump is a reason to be curious, not to cut over.",
   ],
   questions=[
    q("recall", "Name three things that inflate published scores.", "Train-set contamination, saturated benches, overfitting to the public test, best-of-n or friendly judges."),
    q("apply", "A card reports best-of-32. How do you read it?", "As an upper bound, not as what one production call will do. Ask for pass@1 or run it yourself at n=1."),
    q("debug", "Everyone is at 92% on a 2020 suite. Can you rank on it?", "Not usefully. The bench is saturated. Pick a harder or private set."),
    q("apply", "How do you avoid contaminating yourself?", "Keep the golden set private, rotate items, do not paste it into blog posts or prompts that might be logged into someone else's train mix."),
    q("recall", "Is a jump of 8 points on a public bench always real?", "Not always. New contamination, a new prompt, or a new judge can move the number."),
   ],
   links=[
    {"title": "Hugging Face: evaluate", "url": f"{HF}/evaluate/index"},
    {"title": "OpenAI: evals", "url": "https://platform.openai.com/docs/guides/evals"},
   ],
  ),
  "from-leaderboard-to-shortlist": entry(
   what="""Boards are good at **one thing**: **narrowing a crowded field to a shortlist**. Then you **judge the shortlist on your own examples**. Three models, not thirty. The board saved you the weekend of trying every 7B on Hugging Face. It did not pick the winner.

Write the shortlist rule: "top 5 on the open board in our size/licence band" or "the three vendors we already have a DPA with". Then stop reading ranks.

This is the constructive use of everything above.""",
   why="""Interviewers want the workflow, not only the skepticism. On the job this is how you use Arena without worshipping it. They will ask how many you shortlist (2–4).

They will punish "I ignore all boards" (waste) and "I only use boards" (malpractice).""",
   how="""Example: need an 8B commercial-ok instruct. Filter licence and size, take the top handful on an open board plus one vendor 8B-class API, run your 50 items, pick.

Time-box the board hour. The rest of the week is the local eval and the cost table.

When the board changes next month, you do not automatically change the shortlist. You glance, then decide whether to add a candidate.""",
   failures="""1. **Thirty-model bake-off.**

2. **Shortlist = winner.**

3. **Re-shortlisting every tweet.**

4. **Ignoring licence in the filter.**""",
   line="""Leaderboards narrow a crowded field to a shortlist. I pick 2–4 with a written filter, then I run our examples. The board does not get a vote in the final table.""",
   key_points=[
    "Boards: shortlist, not winner.",
    "2–4 candidates.",
    "Filter size, licence, path first.",
    "Time-box the board hour.",
    "Do not re-shortlist every tweet.",
    "Local eval is the vote.",
   ],
   questions=[
    q("apply", "How do you use a leaderboard honestly?", "Filter by size/licence/path, take a handful, stop. Judge those on your set. The board does not pick the winner."),
    q("recall", "How many models belong on a shortlist?", "Two to four. Thirty is a weekend you will not get back."),
    q("debug", "A team re-picks production every time Arena moves. What is wrong?", "They skipped the local eval and they have no pin. Ranks move for reasons that are not your task."),
    q("apply", "Write a shortlist filter for a self-hosted classifier.", "8B-class, commercial licence, instruct, known serving stack. Then top few on an open board plus one you already run."),
    q("recall", "What is the one thing boards do well?", "Narrow a crowded field."),
   ],
   links=[
    {"title": "Hugging Face Open LLM leaderboard", "url": "https://huggingface.co/docs/leaderboards/open_llm_leaderboard/about"},
    {"title": "OpenAI: evals", "url": "https://platform.openai.com/docs/guides/evals"},
   ],
  ),
  "contamination-and-train-test-overlap": entry(
   what="""A **high score can mean the item leaked into training**. Public items, GitHub copies of HumanEval, and blog reproductions sit in crawls. **Contamination** is train–test overlap. You cannot fully audit a closed model. You can **assume it** on famous items and **prefer private, recent, or dynamically generated tests**.

Your own set can contaminate if you paste it into a vendor UI that trains on inputs — read the terms.

This is why "it nailed MMLU" is a weak brag in 2026.""",
   why="""Interviewers will say contamination and expect a definition plus a mitigation. On the job this is why you do not hire a model on HumanEval screenshots.

They will ask how you would test a code model fairly (hidden tests, new problems).""",
   how="""Mitigations: private items, rotate, generate variants, execute code against hidden tests, use last week's tickets not a 2020 suite.

If you must use a public bench, treat a high score as an upper bound.

For vendors: prefer terms that say they do not train on API data, and still do not paste your only gold set.

When a model fails your private set and aces the public one, believe yours.""",
   failures="""1. **Hiring on HumanEval screenshots.**

2. **Pasting the gold set** into a train-on-input UI.

3. **Never rotating** items.

4. **Trusting a closed model's 'we did not contaminate'** as proof.""",
   line="""A high public score can be leakage. I assume contamination on famous items, I keep a private rotating set, and I believe that set when it disagrees with the card.""",
   key_points=[
    "Contamination = train–test overlap.",
    "Famous items leak.",
    "Private, recent, hidden tests.",
    "Do not paste gold into train-on-input UIs.",
    "Public high score is an upper bound.",
    "Believe your set when it disagrees.",
   ],
   questions=[
    q("recall", "What is contamination here?", "Test items (or close paraphrases) appearing in the training mix, so the score is partly memorisation."),
    q("apply", "How do you eval a code model fairly?", "New problems, hidden tests, execution. Do not lead with a public HumanEval screenshot."),
    q("debug", "The model aces MMLU and fails last week's tickets. Which do you believe?", "The tickets. The public set may be leaked or just a different task."),
    q("apply", "How can you contaminate yourself?", "Pasting the golden set into a product that trains on inputs, or publishing it."),
    q("recall", "Can you audit a closed model for leakage?", "Not fully. Assume it on famous benches and prefer private items."),
   ],
   links=[
    {"title": "Hugging Face: evaluate", "url": f"{HF}/evaluate/index"},
    {"title": "OpenAI: evals", "url": "https://platform.openai.com/docs/guides/evals"},
   ],
  ),
  "your-task-is-the-only-leaderboard-that-ships": entry(
   what="""**Public ranks shortlist; your eval decides.** The only leaderboard that ships is **the one you run on your task**, with **your metric**, **your snapshot**, **your prompt**. Everything else is homework.

Write that sentence in the model-choice doc. When a keynote lands, you already know what you will do: add a candidate if you want, run the set, or ignore.

This is the module's last word and M1.12's first.""",
   why="""Interviewers want the slogan. On the job it is how a staff engineer ends the meeting. They will ask what "your eval" contains (items, metric, pin, date).

They will punish a ship-without-set story.""",
   how="""Shipping checklist: golden set version, metric, model pin, prompt hash, score, cost, p95, date, owner. If a cell is empty, you are not shipping a model change.

The set can start at 30 items. Empty is the crime, not small.

Hang the latest table in the repo or the wiki. The next argument starts from the table, not from Twitter.""",
   failures="""1. **Shipping on a keynote.**

2. **Empty set.**

3. **A set nobody owns.**

4. **Table not dated.**""",
   line="""Public ranks shortlist. My eval decides. I will not ship a model change without a dated table: set, metric, pin, score, cost, p95. That table is the only leaderboard that ships.""",
   key_points=[
    "Public boards shortlist; local eval decides.",
    "Ship with a dated table.",
    "Set, metric, pin, score, cost, p95, owner.",
    "Small set beats empty set.",
    "Keynotes add candidates, not winners.",
    "This slogan opens M1.12.",
   ],
   questions=[
    q("apply", "What is the only leaderboard that ships?", "Your eval on your task: versioned items, a metric, a pinned model and prompt, with cost and latency."),
    q("recall", "What do public ranks do in that sentence?", "They shortlist. They do not decide."),
    q("debug", "A model change shipped because a keynote was exciting. What was missing?", "The dated table. Roll back and run the set."),
    q("apply", "What cells are on the table?", "Set version, metric, pin, prompt hash, score, cost, p95, date, owner."),
    q("recall", "Is a 30-item set enough to start?", "Yes, if it is real. Empty is worse. Grow it."),
   ],
   links=[
    {"title": "OpenAI: evals", "url": "https://platform.openai.com/docs/guides/evals"},
    {"title": "Anthropic: develop tests", "url": "https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests"},
   ],
  ),
 }
}
