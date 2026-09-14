---
name: ko-feature
description: Start a new feature with archetype-aware context, then hand off to superpowers brainstorming
---

# Feature Workflow

## Prerequisites

Requires the **superpowers** skills for the methodology phases (brainstorming, planning, implementation) — install from the [superpowers repo](https://github.com/obra/superpowers) if missing. The inline steps below are orchestration only and degrade to a summary without them.

## Profiles

Two profiles: **standard** (default) and **fast** (`/ko-feature <description> --fast`). Fast trades depth for speed — never promise a duration.

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
- Only viable when the env runs clean and the KB is current; a cold repo blows the budget — fall back to standard.
- Not for features needing genuine design exploration — forcing those into fast pays the time back in rework.
- The skipped adversarial review is the main risk trade-off; the self-review of integration points is the safeguard that stays.

You are starting a new feature. Follow these steps:

## Step 0: Gather Inputs

Before loading context, ask the user for anchoring artifacts — **Figma/design links, API specs (SDL/OpenAPI), design docs (RFC/ADR), tickets (Jira/Linear with ACs)**.

If they share links or files, fetch them before continuing per
`.cursor/skills/workflow-refs/references/feature-input-fetching.md` — never proceed on a guessed
summary of an unfetched link.

Nothing to share → proceed; brainstorming surfaces requirements through dialogue.

## Step 0b: Clean-Slate Check

Before any design work, check for leftovers from prior attempts at this feature:

1. `git status --porcelain` — flag untracked files named like the feature (e.g. a stray `WishlistCard.test.tsx` from an abandoned run).
2. Check `.cursor/specs/` for existing files matching the feature name.
3. **Unit-of-work check** (only if the `unit-of-work` skill is installed — ko-product-kit): glob `.cursor/specs/*/stories.md` for a matching unit; if found, **claim it** per the skill's protocol, save spec/plan into its directory — brainstorming starts from its stories/ACs, not a blank page.

If anything is found, list it and ask: resume, delete, or ignore. Never design on top of a dirty starting state.

## Step 1: Detect Archetype

List `.cursor/rules/`: `fe-nx.mdc` → Nx monorepo · `nestjs-graphql.mdc` → NestJS + Apollo GraphQL · `e2e-playwright.mdc` → Playwright BDD (if installed — ko-qa-kit, not this kit) · `design-system.mdc` → Storybook + MUI library.

## Step 2: Load Context

Review: the archetype rule in `.cursor/rules/`, `AGENTS.md` for project conventions, and `git log --oneline -10` for current work context.

## Step 2b: Check Codebase Conventions

Dispatch ONE recon subagent to map how the codebase handles each cross-cutting concern the feature
touches, per `.cursor/skills/workflow-refs/references/feature-conventions-checklist.md`, and return
a ≤1-page conventions summary. Keep only the summary in context — the raw file reads stay in the
subagent.

*Fallback (no subagent capability):* the same recon inline — locate with LSP/Grep, read only the
surrounding ~50 lines, never a file over ~400 lines whole.

The conventions found MUST be carried into brainstorming — the design follows existing patterns,
never introduces new ones.

## Step 2b-2: Convention-Derived Deliverables (mandatory)

Conventions become **generated tasks in the plan's file list**, not prose the planner may forget. For every NEW component or module:

- Add a co-located test file task (`*.test.tsx` / `*.spec.ts`) — always.
- If `.storybook/` exists (or peers have `.stories.tsx`), add a stories task — even if the ticket's ACs don't mention it. Anchor on repo conventions, not just the ticket.

"Don't add beyond what was requested" applies to **features**, not conventions — co-located tests and stories are part of "done" in repos that follow them.

## Step 2c: Load Knowledge Base (if available)

If `.cursor/knowledge-base/` exists and contains `.md` files:
1. List files, read the first few lines of each to identify coverage
2. Select the 1-3 most relevant to the feature request
3. **Always include the testing KB doc** (config, utilities, mocks) — TDD is the default, and topic-ranking alone misses it
4. Read those docs for architectural context

If the directory doesn't exist, skip this step.

## Step 3: Summarize Context

Tell the user: artifacts loaded and design constraints (Step 0); archetype and key conventions; the Step 2b conventions summary; KB context (Step 2c); available agents (`.cursor/agents/`).

If the scope obviously spans ≤3 files in one layer, say once: "This looks small — consider re-running with `--fast`" — then proceed with the user's choice; never auto-switch.

## Step 4: Hand Off to Brainstorming

Invoke `superpowers:brainstorming` with the loaded project context — it guides the user through requirements, design, and spec creation. The spec is saved to `.cursor/specs/`.

**Spec style is enforced:** plain English, no filler; structure over prose (tables for options, Mermaid for flows/state); answers what-problem / what-decision / how-to-verify — everything else is appendix or cut. Acceptance criteria (observable behaviors) **only** — no test-scenario enumeration or test code; those live in the plan (Step 2b-2) and TDD execution. If the spec needs scrolling, compress it before asking for approval — it is re-fed as context in every later step, so size is a direct cost multiplier.

*Fallback (no superpowers):* restate the goal in one sentence, ask scoping questions (don't over-ask), write the spec yourself to `.cursor/specs/`.

**Do not skip brainstorming** — every feature goes through `brainstorm → spec → plan → implement → /ko-verify` (see Workflow Transitions).

## Workflow Transitions

Each step flows into the next without the user invoking anything:

1. Spec approved in brainstorming → immediately invoke `writing-plans` (do not wait for `/ko-implement`). The plan MUST include the convention-derived deliverables from Step 2b-2.

   **Plan economy** — same discipline as specs: file list + task breakdown + short snippets ONLY for load-bearing tricky bits. No full implementations — code is written during TDD execution, not in the plan. If the plan needs scrolling, split phases or cut detail; it is re-fed to every executing step.

   **Before committing any spec/plan doc**, run `git check-ignore <path>` — if `.cursor/specs/` is gitignored, skip the commit and say so explicitly; never let a commit silently no-op. Commit only in a git worktree (per `coding-standards.mdc`).

   **Testing approach: TDD is the default — do not ask.** State it once ("Using TDD per the workflow; say 'lighter tests' to relax") and proceed. In the fast profile, focused tests replace full TDD without asking either.

2. After writing-plans creates the plan → run the `env-preflight` skill if available (writes `.cursor/env-recipe.md`). Then **ask the user explicitly** which execution mode to use (fast profile: skip the question, go inline). Do not pick for them:

   > How should I execute the plan?
   > 1. **subagent-driven** (`superpowers:subagent-driven-development`) — each task in its own sub-agent; faster, keeps main context clean.
   > 2. **inline** (`superpowers:executing-plans`) — tasks run in this session with review checkpoints; easier to interrupt.

   Wait for the answer. **If subagent-driven:** prepend `.cursor/env-recipe.md` to every sub-agent prompt — sub-agents don't share your shell state.
3. After all plan tasks complete → invoke `/ko-verify`, then `/ko-review` on the diff. If a unit of work was claimed (Step 0b), mark the story `done` and append a bolt-log row with the outcome.

The user invokes `/ko-feature` once; everything else chains automatically. **`/ko-implement`** is for resuming across sessions, not continuing within one.

## Dependency Version Check

During plan writing, before writing code that uses project dependencies, check installed versions
(`package.json`) and use the project's actual API, not the latest — common-mismatch list in
`.cursor/skills/workflow-refs/references/feature-dependency-versions.md`.
