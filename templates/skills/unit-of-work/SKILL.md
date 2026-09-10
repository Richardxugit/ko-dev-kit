---
name: unit-of-work
description: The AI-DLC unit-of-work artifact — the stories.md format, phase/status vocabulary, and the discover/claim/update/log protocol. Use when reading or writing .cursor/specs/*/stories.md, starting construction on a story, or logging a bolt.
---

# Unit of Work

A **unit of work** is the persistent artifact connecting the AI-DLC phases, and it is the same `stories.md` the product pipeline produces when installed (ko-product-kit): `/ko-slice` creates it (story skeletons), `/ko-groom` deepens it to Definition-of-Ready, construction executes its stories in **bolts** (short focused work bursts — the AI-DLC replacement for sprints), operations closes it out. One file, start to finish — it lives in the repo so any session, human or agent, can pick up exactly where the last one stopped.

## Location & discovery

- One directory per unit: `.cursor/specs/<feature-slug>/stories.md` (next to its `discovery.md` when the pipeline created one).
- Discover units by globbing `.cursor/specs/*/stories.md`. Anything else in `.cursor/specs/` (flat `<slug>.md` files) is a plain feature spec, not a unit.
- A unit's supporting docs (discovery analysis, design specs, plans from `/ko-feature`) live next to it in the same directory.

## stories.md format

````markdown
# <Feature name> — Stories

**Slug:** <feature-slug>
**Phase:** sliced | groomed | construction | operations | done
**Created:** <YYYY-MM-DD>
**Size:** <XS-XL> — <one-line rationale>
**Source:** <discovery.md | ticket | pasted>
**Requirement:** <one paragraph of business language>

## Assumptions & open questions
- <assumption or open item — remove when resolved>

## Stories

| # | Story | Type | Status |
|---|-------|------|--------|
| 1 | <title> | story | todo |
| 2 | <title> | refactoring | in-progress |

### Story 1: <Title>

As a <actor>, I want <capability>, so that <value>.

**Type:** story | spike | refactoring | solution-design
**Description:** <what this story covers and why>

**Acceptance criteria:**
1. <a concrete condition and its observable outcome — plain language a QA can execute, no Gherkin blocks>
2. <...>

**INVEST:** <only when a letter is at risk — omit otherwise>

**In scope:** <...>
**Out of scope:** <...>
**DoR:** READY | READY WITH NOTES | NOT READY — <reason>   ← added by /ko-groom

## Bolt log

| Date | Bolt | Actor | Outcome |
|------|------|-------|---------|
| <YYYY-MM-DD> | inception: slice | /ko-slice | 2 story skeletons |
| <YYYY-MM-DD> | inception: groom | /ko-groom | 2 stories groomed, 2 READY |
````

Phases: `sliced` → `groomed` (the inception stages, owned by the product pipeline) → `construction` → `operations` → `done`. Story statuses: `todo` → `in-progress` → `done` (plus `blocked: <reason>`).

## Protocol

- **Discover** — before starting feature work, glob `.cursor/specs/*/stories.md` and check whether the work belongs to an existing unit (match by slug, title, or story text). Never create a duplicate unit for work that already has one.
- **Claim** — when construction starts on a story: set the story's status to `in-progress`, set the unit's Phase to `construction` (if it was `sliced`/`groomed`), and append a bolt-log row. If a story is already `in-progress`, say so — another session may own it; ask before taking over.
- **Update** — when a story's state changes (done, blocked), update the status table in place and keep the story section accurate (note accepted deviations under the story, don't rewrite history).
- **Log** — the Bolt log is **append-only**. One row per bolt: date, a short bolt name (`construction: story 2`, `verify`, `release 1.4.0`), the actor (command or agent), and the outcome in a few words. Never edit or delete prior rows.
- **Close** — when every story is `done` and the release work is finished, set Phase to `operations` (shipped, being watched) or `done` (fully closed).

## Who touches it

- `/ko-slice` creates the file (skeletons, Phase `sliced`); `/ko-groom` deepens it in place to DoR (Phase `groomed`). Units can also be written by hand in this format.
- `/ko-feature` claims a unit's story when the feature maps to one (its clean-slate check discovers them) and logs construction bolts.
- `/ko-implement` picks up `in-progress` stories across sessions and marks them `done` on completion.
- `/ko-verify` appends a verification bolt-log row with the gate results.
- `/ko-release-verify` flips Phase to `operations`/`done` and logs the release bolt. (Manual-tier command — when installed; without it, whoever runs the release flips the Phase by hand.)
