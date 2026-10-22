# Data schema

All files are UTF-8 JSON. Every file has an `as_of` date (2026-10-22).

## plan.json

```text
{
  as_of, start_date, end_date, days, total_hours,
  task_kinds: ["setup","dsa","learn","build","drill","review"],
  blocks: [ { id, title, goal, days: [ Day ] } ]
}
Day  = { day_index, day_number, date (YYYY-MM-DD), weekday, hours, tasks: [ Task ] }
Task = {
  id            // stable, e.g. "d03t1" (day index, task index)
  kind          // one of task_kinds
  text          // what to do
  hours         // number
  done_when     // acceptance test, may be null
  resources     // [ { id, title, url, type, source, verified } ]
  problems      // [ { slug, title, pattern, url } ]   (DSA tasks)
  questions     // [ string ]                          (drill tasks)
}
```

Blocks: `head` (3 days), then `w1` to `w6` (7 days each, Monday to Sunday).

## resources.json

```text
{ as_of, note, resources: [ {
    id, title, source, url,
    type      // video | blog | docs | paper | course | repo | tool | book | practice
    modules   // [ py | dsa | math | ml | dl | nlp | llm | prompt | rag | agents | apps | ops | multi | safety | design | interview ]
    level     // core | deep | optional
    why       // one line on why it is in the pack
    verified, verified_on, verification
} ] }
```

## dsa.json

```text
{ as_of, problem_count_in_catalog, planned_problem_count, planned_slugs, habits: [string],
  patterns: [ { pattern, goal, say_aloud, problems: [ { slug, title, url } ] } ],
  ai_implementations: [ { id, name, plan_week, ties_to, spec, done_when } ],
  references: [ resource ] }
```

## projects.json

```text
{ as_of, recommended_order: [project id], note, projects: [ {
    id, name, plan_week, build_days, pitch, why_it_stands_out, corpus_ideas, mvp, architecture,
    key_decisions, evaluation, failure_modes_to_show, stack, deliverables, talking_points,
    extensions, resources: [ resource ]
} ] }
```

## questions.json

```text
{ as_of, groups: [ { id, questions: [string] } ],
  model_answer_outlines: [ { question, outline } ], note }
```
