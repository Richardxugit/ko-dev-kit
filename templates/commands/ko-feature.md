---
name: ko-feature
description: Start a new feature with archetype-aware context, then hand off to superpowers brainstorming
---

# Feature Workflow

## Prerequisites

Requires the **superpowers** skills for the methodology phases (brainstorming, planning, implementation) — install from the [superpowers repo](https://github.com/obra/superpowers) if missing. The inline steps below are orchestration only and degrade to a summary without them.

## Profiles

Two execution profiles. Default is **standard**; the user selects **fast** with `/ko-feature <description> --fast` (or a hard time budget). Fast trades depth for speed — never promise a duration.

| Aspect | standard (default) | fast (`--fast`) |
|--------|--------------------|-----------------|
| Mockups / design exploration | When design is ambiguous | Skip — confirm the look once, in text |
| Clarifying questions | As needed during brainstorming | One batched multi-part question |
| Spec + plan | Separate docs, full task breakdown | One lean merged doc: file list + code snippets for the load-bearing tricky bits only |
| Execution | Ask subagent-driven vs inline | Inline, don't ask |
| Tests | TDD (default, see below) | Focused: full TDD on the genuinely tricky units, smoke tests for the rest |
| Review | Adversarial review sub-agent | One ~3-min self-review of the integration points only |
| Verify | Full `/ko-verify` | `/ko-verify` scoped (type check + affected tests + summary) |

**Fast-profile guardrails** — state these when fast is selected:
- Only viable when the env runs clean and the knowledge base is current; a cold repo blows the budget regardless — fall back to standard.
- Not for features needing genuine design exploration — forcing those into fast pays the time back in rework.
- The skipped adversarial review is the main risk trade-off; the self-review of integration points is the safeguard that stays.

You are starting a new feature. Follow these steps:

## Step 0: Gather Inputs

Before loading context, ask the user for anchoring artifacts — **Figma/design links, API specs (SDL/OpenAPI), design docs (RFC/ADR), tickets (Jira/Linear with ACs)**.

If they share links or files, fetch them before continuing so the material is in context for
brainstorming — fetch procedure per `.cursor/skills/workflow-refs/references/feature-input-fetching.md`
(never proceed on a guessed summary of an unfetched link).

Nothing to share → proceed; brainstorming surfaces requirements through dialogue.

## Step 0b: Clean-Slate Check

Before any design work, check for leftovers from prior attempts at this feature:

1. `git status --porcelain` — flag untracked files named like the feature (e.g. a stray `WishlistCard.test.tsx` from an abandoned run).
2. Check `.cursor/specs/` for existing files matching the feature name.
3. **Unit-of-work check** (only if the `unit-of-work` skill is installed — ko-product-kit, not this kit): glob `.cursor/specs/*/stories.md` for a unit matching the feature; if found, **claim it** per the skill's protocol and save the spec/plan into the unit's directory — brainstorming (Step 4) starts from the unit's stories/ACs, not a blank page.

If anything is found, list it and ask: resume, delete, or ignore. Never design on top of a dirty starting state.

## Step 1: Detect Archetype

List `.cursor/rules/`: `fe-nx.mdc` → Nx monorepo · `nestjs-graphql.mdc` → NestJS + Apollo GraphQL · `e2e-playwright.mdc` → Playwright BDD (if installed — ko-qa-kit, not this kit) · `design-system.mdc` → Storybook + MUI library.

## Step 2: Load Context

Review: the archetype rule in `.cursor/rules/`, `AGENTS.md` for project conventions, and `git log --oneline -10` for current work context.

## Step 2b: Check Codebase Conventions

Before brainstorming the design, identify how the codebase handles each cross-cutting concern the
feature touches — **user-facing text, styling, state management, error handling, data layer** —
checking 2-3 existing modules per aspect per
`.cursor/skills/workflow-refs/references/feature-conventions-checklist.md`. Never read a file over
~400 lines whole during recon — locate with LSP/Grep, read only the surrounding ~50 lines.

Document the conventions you find. They MUST be carried into brainstorming — the design follows existing patterns, never introduces new ones.

## Step 2b-2: Convention-Derived Deliverables (mandatory)

Conventions become **generated tasks in the plan's file list**, not prose the planner may forget. For every NEW component or module:

- Add a co-located test file task (`*.test.tsx` / `*.spec.ts`) — always.
- If `.storybook/` exists (or peers have `.stories.tsx`), add a stories task — even if the ticket's ACs don't mention it. Anchor on repo conventions, not just the ticket.

"Don't add beyond what was requested" applies to **features**, not conventions — co-located tests and stories are part of "done" in repos that follow them.

## Step 2c: Load Knowledge Base (if available)

If `.cursor/knowledge-base/` exists and contains `.md` files:
1. List files, read the first few lines of each to identify coverage
2. Select the 1-3 most relevant to the feature request
3. **Always also include the testing KB doc** (test config, utilities, mocks) — under the TDD default every feature includes tests, and relevance-ranking against the feature topic alone will miss it
4. Read those docs for architectural context

If the directory doesn't exist, skip this step.

## Step 3: Summarize Context

Tell the user: anchoring artifacts loaded (Step 0) and anything that constrains the design; detected archetype and key conventions; codebase conventions from Step 2b; knowledge-base context (Step 2c); available agents (`.cursor/agents/`); relevant patterns from recent commits.

## Step 4: Hand Off to Brainstorming

Invoke `superpowers:brainstorming` with the loaded project context — it guides the user through requirements, design, and spec creation. The spec is saved to `.cursor/specs/`.

**Spec style is enforced:** plain English, no filler; structure over prose (tables for options, Mermaid for flows/state); answers what-problem / what-decision / how-to-verify — everything else is appendix or cut. Acceptance criteria (observable behaviors) **only** — no test-scenario enumeration or test code; those live in the plan (Step 2b-2) and TDD execution. If the spec needs scrolling, compress it before asking for approval — it is re-fed as context in every later step, so size is a direct cost multiplier.

*Fallback (no superpowers):* restate the goal in one sentence, ask scoping questions (don't over-ask), write the spec yourself to `.cursor/specs/`.

**Do not skip brainstorming.** Every feature goes through the full workflow — `brainstorm → spec → plan → implement → /ko-verify` — and each step chains into the next without the user invoking anything (see Workflow Transitions).

## Workflow Transitions

Each step flows into the next without the user invoking anything:

1. Spec approved in brainstorming → immediately invoke `writing-plans` (do not wait for `/ko-implement`). The plan MUST include the convention-derived deliverables from Step 2b-2.

   **Before committing any spec/plan doc**, run `git check-ignore <path>` — if `.cursor/specs/` is gitignored, skip the commit and say so explicitly; never let a commit silently no-op. Commit only in a git worktree (per `coding-standards.mdc`).

   **Testing approach: TDD is the default — do not ask.** State it once ("Using TDD per the workflow; say 'lighter tests' to relax") and proceed. In the fast profile, focused tests replace full TDD without asking either.

2. After writing-plans creates the plan → run the `env-preflight` skill if available (writes `.cursor/env-recipe.md`). Then **ask the user explicitly** which execution mode to use (fast profile: skip the question, go inline). Do not pick for them:

   > How should I execute the plan?
   > 1. **subagent-driven** (`superpowers:subagent-driven-development`) — each task in its own sub-agent; faster, keeps main context clean.
   > 2. **inline** (`superpowers:executing-plans`) — tasks run in this session with review checkpoints; easier to interrupt.

   Wait for the answer. **If subagent-driven:** prepend `.cursor/env-recipe.md` to every sub-agent prompt — sub-agents don't share your shell state.
3. After all plan tasks complete → say "All tasks complete. Running `/ko-verify`." Then invoke `/ko-verify`, followed by `/ko-review` on the diff. If a unit of work was claimed (Step 0b), mark the story `done` and append a bolt-log row with the outcome.

The user invokes `/ko-feature` once; everything else chains automatically. **`/ko-implement`** is for resuming across sessions, not continuing within one.

## Dependency Version Check

During plan writing, before writing code that uses project dependencies, check installed versions
(`package.json`) and use the project's actual API, not the latest — common-mismatch list in
`.cursor/skills/workflow-refs/references/feature-dependency-versions.md`.
