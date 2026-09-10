---
name: ko-feature
description: Start a new feature with archetype-aware context, then hand off to superpowers brainstorming
skills-optional: [unit-of-work]
---

# Feature Workflow

## Prerequisites

This command requires the **superpowers** skills for the methodology phases (brainstorming, planning, implementation). If `superpowers:brainstorming` is not available, install it via the [superpowers repo](https://github.com/obra/superpowers) first — the inline steps below are orchestration only (archetype context, unit-of-work, specs/) and degrade to a summary without the methodology skills.

## Profiles

Two execution profiles. Default is **standard**. The user selects **fast** with `/ko-feature <description> --fast` (or by stating a hard time budget). Fast trades depth for speed — do not promise a specific duration; how long it takes depends on the feature.

| Aspect | standard (default) | fast (`--fast`) |
|--------|--------------------|-----------------|
| Mockups / design exploration | When design is ambiguous | Skip — confirm the look once, in text |
| Clarifying questions | As needed during brainstorming | One batched multi-part question |
| Spec + plan | Separate docs, full task breakdown | One lean merged doc: file list + code snippets for the load-bearing tricky bits only |
| Execution | Ask subagent-driven vs inline | Inline, don't ask |
| Tests | TDD (default, see below) | Focused: full TDD on the genuinely tricky units, smoke tests for the rest |
| Review | Adversarial review sub-agent | One ~3-min self-review of the integration points only |
| Verify | Full `/ko-verify` | `/ko-verify` scoped (type check + affected tests + summary) |

**Fast-profile guardrails** — state these to the user when fast is selected:
- Only viable when the env runs clean and the knowledge base is current; a cold repo blows the budget regardless — fall back to standard.
- Not for features needing genuine design exploration — forcing those into fast just pays the time back in rework.
- The skipped adversarial review is the main risk trade-off; the self-review of integration points is the one safeguard that stays.

You are starting a new feature in this project. Follow these steps:

## Step 0: Gather Inputs

Before loading context, ask the user if they have any anchoring artifacts to share:

- **Figma / design links** — mockups, prototypes, or design tokens
- **API specs** — GraphQL schema/SDL, OpenAPI, or endpoint contracts
- **Design docs** — RFCs, ADRs, one-pagers describing the intended approach
- **Tickets** — Jira/Linear issues with acceptance criteria

If they share links or files, fetch them before continuing so the material is in context for brainstorming — **the fetch itself is the tool probe**:

- **Jira/Confluence** → fetch via the Atlassian MCP; pull the summary, description, acceptance criteria, and any linked designs from a ticket.
- **Figma** → fetch via the Figma MCP when configured.
- **Fetch fails or the MCP isn't set up** → say which tool is missing and ask the user to paste the content instead (degraded intake, not a hard stop). Never proceed on a guessed summary of an unfetched link.

If they have nothing to share, proceed — brainstorming will surface requirements through dialogue.

## Step 0b: Clean-Slate Check

Before any design work, check for leftovers from prior attempts at this feature:

1. `git status --porcelain` — flag untracked files whose names relate to the feature (e.g. a stray `WishlistCard.test.tsx` from an abandoned run).
2. Check `.cursor/specs/` for existing files matching the feature name.
3. **Unit-of-work check** (if the `unit-of-work` skill is installed): glob `.cursor/specs/*/stories.md` for a unit matching the feature (slug, title, or story text). If one matches, **claim it** per the skill's protocol — set the story to `in-progress`, Phase to `construction`, append a bolt-log row (`construction: story N` / `/ko-feature`) — and save this feature's spec/plan into the unit's directory. The product pipeline (`/ko-slice` skeletons, deepened by `/ko-groom`) already elaborated the requirement, so brainstorming (Step 4) starts from the unit's stories and ACs instead of a blank page.

If anything is found, list it and ask the user: resume from it, delete it, or ignore it. Do not silently design on top of a dirty starting state.

## Step 1: Detect Archetype

List `.cursor/rules/` to identify which archetype rule is present:
- `fe-nx.mdc` → Frontend Nx monorepo (Nx + React)
- `nestjs-graphql.mdc` → NestJS + Apollo GraphQL (+ Lambda workers)
- `e2e-playwright.mdc` → Playwright BDD end-to-end tests (if installed — shipped by ko-qa-kit, not this kit)
- `design-system.mdc` → Storybook + MUI component library

## Step 2: Load Context

Based on the archetype, review:
- The archetype-specific rule in `.cursor/rules/`
- `AGENTS.md` for project-specific conventions
- Recent git history (`git log --oneline -10`) for current work context

## Step 2b: Check Codebase Conventions

Before brainstorming the design, identify how the codebase handles each cross-cutting concern the feature will touch. For each aspect below, check 2-3 existing modules/components in the same area.

**How to check — locate, then read by range:** find the symbol or pattern with LSP (`documentSymbol`/`goToDefinition`) or Grep first, then read only the surrounding lines (~50 lines). Never read a file over ~400 lines whole during recon — anything that size is already a god-file by the size rule in `coding-standards.mdc`; hitting one is the signal to read by range, not the excuse to load it all.

- **User-facing text** — Is there an i18n/localization pattern? (e.g., `react-i18next`, `t()`) Grep for how sibling components render user-visible strings.
- **Styling** — What styling approach do peer components use? (e.g., styled-components, MUI `sx`/theme, CSS modules, emotion)
- **State management** — What state pattern do nearby modules follow? (e.g., Apollo cache, zustand, jotai, Redux, local state)
- **Error handling** — How do siblings handle and display errors? (NestJS exception filters, GraphQL error formatting, React error boundaries)
- **Data layer** — What data-fetching pattern is established? (e.g., generated Apollo hooks, services, resolvers)

Document any conventions you discover. These MUST be carried into brainstorming — the design must follow existing patterns, not introduce new ones.

## Step 2b-2: Convention-Derived Deliverables (mandatory)

Conventions must become **generated tasks in the plan's file list**, not prose the planner may forget. When the spec/plan is written, for every NEW component or module:

- Add a co-located test file task (`*.test.tsx` / `*.spec.ts`) — always.
- If `.storybook/` exists (or peer components have `.stories.tsx`), add a `*.stories.tsx` task — even if the ticket's ACs don't mention it. Anchor on the repo's conventions, not just the ticket.

"Don't add beyond what was requested" applies to **features**, not conventions — co-located tests and stories are part of "done" in repos that follow them.

## Step 2c: Load Knowledge Base (if available)

If `.cursor/knowledge-base/` exists and contains `.md` files:
1. List the files and read their first few lines to identify what each covers
2. Based on the user's feature request, select the 1-3 most relevant docs
3. **Always also include the testing KB doc** (the one covering test config, test utilities, mocks) whenever the work includes tests, which under the TDD default is every feature. Relevance-ranking against the feature description alone will miss it — test idioms are orthogonal to the feature topic.
4. Read those docs to load architectural context for the work ahead

If the directory doesn't exist, skip this step.

## Step 3: Summarize Context

Tell the user:
- Anchoring artifacts loaded in Step 0 — call out anything that constrains the design
- Detected archetype and key conventions
- Codebase conventions discovered in Step 2b (text handling, styling, state, etc.)
- Relevant knowledge base context (if loaded in Step 2c)
- Available agents for this archetype (in `.cursor/agents/`)
- Any relevant patterns from recent commits

## Step 4: Hand Off to Brainstorming

Invoke the `superpowers:brainstorming` skill with the project context loaded. The brainstorming process will guide the user through requirements, design, and spec creation. The design spec is saved to `.cursor/specs/`.

**Spec style is enforced** (coding-standards → "Specs and docs"): plain English, no filler; structure over prose — tables for options, Mermaid diagrams for flows/sequences/state; the spec answers what-problem / what-decision / how-to-verify fast, everything else is appendix or cut.

*Fallback (no superpowers):* restate the goal in one sentence, ask scoping questions (don't over-ask), and write the spec yourself to `.cursor/specs/`.

After brainstorming completes and the user approves the spec, do NOT ask what to do next — proceed directly to invoking `superpowers:writing-plans`. After writing-plans creates the plan and execution finishes, do NOT stop — invoke `/ko-verify`.

**Important:** Do not skip brainstorming. Every feature goes through the full workflow:

```
brainstorm → spec → plan → implement → /ko-verify
```

## Workflow Transitions

Each step must flow into the next without requiring the user to manually invoke the next command:

1. After brainstorming approves the spec → immediately invoke `writing-plans` to create the implementation plan (do not wait for the user to run `/ko-implement`). The plan MUST include the convention-derived deliverables from Step 2b-2.

   **Before committing any spec/plan doc**, run `git check-ignore <path>`. If `.cursor/specs/` is gitignored, skip the commit and say so explicitly ("spec saved to `.cursor/specs/` — not committed, directory is gitignored") — never let the commit silently no-op. Also: only commit when in a git worktree (per `coding-standards.mdc`); otherwise leave changes for the user.

   **Testing approach: TDD is the default — do not ask.** State it once ("Using TDD per the workflow; say 'lighter tests' to relax") and proceed. In the fast profile, focused tests replace full TDD without asking either.

2. After writing-plans creates the plan → run the `env-preflight` skill if available (node vs engines, package manager, test/typecheck/build all execute; writes `.cursor/env-recipe.md`). Then **ask the user explicitly** which execution mode to use (fast profile: skip the question, go inline). Do not pick for them:

   > How should I execute the plan?
   > 1. **subagent-driven** (`superpowers:subagent-driven-development`) — each task runs in its own sub-agent. Faster, keeps main context clean, best for independent tasks.
   > 2. **inline** (`superpowers:executing-plans`) — tasks run in this session with review checkpoints. Easier to interrupt and redirect.

   Wait for the user's answer before invoking either skill. **If subagent-driven:** prepend the contents of `.cursor/env-recipe.md` to every sub-agent prompt — sub-agents don't share your shell state.
3. After all plan tasks are complete → tell the user: "All tasks complete. Running `/ko-verify` to check quality gates." Then invoke `/ko-verify`, followed by `/ko-review` on the diff. If a unit of work was claimed in Step 0b, mark the story `done` in its status table and append a bolt-log row with the outcome.

The user should only need to invoke `/ko-feature` once. Everything else chains automatically.

**`/ko-implement`** is for resuming across sessions — not for continuing within the same session.

## Dependency Version Check

During plan writing, before writing test code or implementation code that uses project dependencies, check the installed versions of key libraries (`package.json` dependencies). Use the project's actual API, not the latest API. Common mismatches: Apollo Client v3 vs v4, MUI v5 vs v6, NestJS major versions, React Testing Library, Nx version (affects generator flags).
