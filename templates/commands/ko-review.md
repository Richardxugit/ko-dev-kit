---
name: ko-review
description: Review a change set — single code-reviewer pass by default; --team dispatches specialist reviewers (compliance, regression, frontend, backend, tests, simplicity) in one round with a consolidated severity-ranked verdict
args: "[PR number/URL, or several comma-separated] [--team]"
agents: [code-reviewer, review-specialist]
skills-optional: [wcag-2.2-aa]
---

# Review a change set

Two depths of the same operation:

- **`/ko-review`** (default) — one `code-reviewer` pass over the diff. Fast, cheap, right for the working diff.
- **`/ko-review --team`** — dispatch a team of `review-specialist` sub-agents, one per dimension, consolidated severity-ranked verdict. Costs more tokens on purpose — the payoff is that one invocation surfaces every dimension's findings. Use before merging a real PR, or for a feature whose backend and frontend ship as separate PRs.

**Choosing a mode:** no argument + a working diff → single pass. A PR URL/number, several PRs, or a diff over ~15 files → use `--team` (or suggest it to the user).

This command **reviews and reports — it never edits code and never posts to the PR.**

## Step 0: Preflight (probe, then degrade — no hard stop)

One quick probe; this is user-triggered analysis, not a release gate, so a missing tool degrades the scope rather than blocking:

- `gh auth status` — if green, `gh` may be used **read-only**: fetch a PR's diff and metadata, resolve the default branch, note failing CI checks as context. **Never** `gh pr create` / `edit` / `comment` / `review` — this command is output-only.
- **BugBot evidence** — when reviewing a PR, also pull existing bot reviews: `gh api repos/{owner}/{repo}/pulls/<n>/comments` (inline) and `gh pr view <n> --comments` (summary), filtered to BugBot/Cursor-bot authors. Feed them to reviewers as prior findings. BugBot is good at logic-bug spotting in the diff; it cannot see spec compliance, simplicity, or blast radius — that is our lane. If no BugBot comments exist, mention one line: "BugBot not configured on this repo — worth enabling (Cursor → Automations)" and move on.
- If `gh` is absent or unauthenticated, or the arg is not a PR: proceed on **local git only**, resolving the base branch by probing `origin/main` then `origin/master`.

Print a one-line `✅/❌ gh` so the user knows which mode they're in.

## Step 1: Resolve the change set

- **No argument** → the working diff: uncommitted + staged (`git diff` and `git diff --staged`), or the branch vs the resolved base when the tree is clean.
- **One PR** (`<number>` or URL) → `gh pr diff <n>` for the patch and `gh pr view <n> --json title,body,headRefName,files` for metadata.
- **Several PRs** (comma/space-separated) → fetch each the same way. This is the "one feature, backend PR + frontend PR" case; keep each PR's diff labeled so findings and the cross-PR pass can attribute them.

Restate the change set in one or two lines (what it does, which PR(s)/branch) before reviewing.

## Mode A: single pass (default)

Invoke **`superpowers:requesting-code-review`** to structure the review with verification checkpoints and dimensional analysis. *Fallback (no superpowers):* follow the steps below manually.

1. Gather the diff (Step 1) and prior evidence: the newest matching QA report in `.cursor/specs/qa-reports/` (risk areas, introduced failures) and the spec's acceptance criteria when one exists — these prime the reviewer with known risk areas instead of a cold read.
2. Delegate to the **`code-reviewer`** subagent (in `.cursor/agents/`) with the diff, the repo's rules, and the prior evidence as context.
3. The reviewer checks: correctness (logic, edge cases, async, error handling), compliance with `.cursor/rules/` + `AGENTS.md` (including the Simplicity rules), design (placement, reuse, small focused units), test coverage of the change, and security (input validation, no secrets).
4. Present findings grouped by severity — **Blocking / Should-fix / Nit** — each as `path:line — problem. Suggested fix.`
5. If nothing is wrong, say so. Don't manufacture issues.
6. If a spec exists in `.cursor/specs/` for this work, verify the diff satisfies the acceptance criteria.

## Mode B: `--team` — specialist review team

### The six review dimensions

| # | Dimension | Runs | Focus |
|---|-----------|------|-------|
| 1 | **compliance** | always | `.cursor/rules/` + `AGENTS.md` conformance; correctness (logic, edge cases, async, error handling); secrets / input validation |
| 2 | **regression** | always | **the base gate** — blast radius: callers/consumers of changed symbols, API/signature/schema/DTO changes, backward compatibility, migration safety, removed or renamed exports, behavior changes to shared code |
| 3 | **simplicity** | always | what earns its place — unjustified code, speculative defensive code, premature abstraction, anything not traceable to the requirement |
| 4 | **frontend** | FE files present | React/component patterns, state & props, the FE archetype rule, **WCAG 2.2 AA** accessibility |
| 5 | **backend** | BE files present | resolver/API contracts, service/module boundaries, data access (N+1, transactions), auth, idempotency, the BE archetype rule |
| 6 | **tests** | always | new behavior + edge cases covered, deterministic/isolated, whether existing tests still protect the changed paths |

Dimensions 1, 2, 3, and 6 always run. Dimensions 4 and 5 run only when the diff touches files of that kind. Each runs as its own `review-specialist` sub-agent — the agent holds the full playbook for every dimension.

### Step T1: Classify the files and load context

Bucket every changed file to decide which conditional dimensions fire:

- **Frontend** — `*.tsx`, `*.jsx`, `*.css` / `*.scss` / `*.module.*`, `*.stories.tsx`, component/UI library dirs, MUI/theme code.
- **Backend** — `*.resolver.ts`, `*.service.ts`, `*.module.ts`, `*.controller.ts`, `*.entity.ts`, `*.dto.ts`, `*.graphql` / SDL, serverless/lambda handlers.
- **Shared / ambiguous** — plain `*.ts` utilities, config, CI, scripts → covered by the always-on dimensions regardless.

Add dimension **frontend** if any FE file changed, **backend** if any BE file changed. If a file is genuinely ambiguous and could carry either risk, **include both** rather than guess.

Then load the shared context every specialist gets: the archetype rule(s) in `.cursor/rules/` plus `coding-standards.mdc`, `AGENTS.md`, and prior evidence — the newest report in `.cursor/specs/qa-reports/*.md` and the acceptance criteria of any matching spec in `.cursor/specs/`. This primes reviewers with known risk areas instead of a cold read.

### Step T2: Dispatch the review team (parallel, one round)

Dispatch **one `review-specialist` sub-agent per applicable dimension, in parallel**. Each returns findings only — specialists are read-only and write nothing. Give every agent the same block, filled per dimension:

```
You are a review-specialist on a team reviewing a change set. Your assigned
dimension is: <compliance | regression | simplicity | frontend | backend | tests>.

Review ONLY your dimension. Follow your dimension's playbook exactly.

Change set: <PR number(s) / branch — one-line description>
Diff (scoped to files relevant to your dimension):
<the unified diff hunks; for frontend/backend pass only that bucket's files,
 plus any shared file whose change plausibly affects your dimension>

Repo rules: <.cursor/rules/ archetype rule + coding-standards.mdc>
Conventions: <relevant AGENTS.md excerpts>
Prior evidence: <newest QA report risk areas + spec acceptance criteria, if any>

Report findings as: `path:line — problem. Suggested fix.`, grouped by
severity (Blocking / Should-fix / Nit). Every finding must cite an actual
diff hunk. If your dimension is clean, say so plainly.
BugBot already flagged: <its comments, or "nothing">. Do not re-report what
it caught unless you disagree with its assessment — spend your attention on
what it cannot see.
```

- The **frontend** specialist is additionally told: *use the `wcag-2.2-aa` skill if it is installed* for the accessibility portion.
- **Sequential fallback:** if the environment cannot fan out sub-agents, run the dimensions one at a time and collect their findings — the output is identical, only slower.

### Step T3: Aggregate

Collect every specialist's findings into one list. Drop or down-tag anything BugBot already reported (note "also caught by BugBot" instead of duplicating). When two dimensions flag the **same `path:line`**, merge them into a single entry, keep the **highest** severity, and tag which dimensions raised it. Group the merged list by severity — **Blocking / Should-fix / Nit** — and tag each finding with its dimension(s).

### Step T4: Cross-PR consistency pass (only when reviewing more than one PR)

Review the PRs as a set, not just individually:

- Do the contracts line up — does the frontend consume exactly the API/GraphQL shape the backend PR exposes? Do shared types/enums match on both sides?
- Are they independently mergeable, or must they ship together (and in which order)? Flag any migration/feature-flag/rollout coupling.
- Is anything defined twice or left as a dangling reference across the PRs?

Report this as its own section; a broken contract between the PRs is a **Blocking** finding.

### Step T5: Verdict and output

Give a verdict per PR and for the set as a whole:

- **Ship** — no Blocking, no Should-fix.
- **Ship with fixes** — Should-fix items only; list them.
- **Do not merge** — any Blocking. A **regression** Blocking is decisive: the base gate is that the change must not break current behavior or introduce new issues.

Write the consolidated review to `.cursor/specs/mr-reviews/<id>.md` (create the dir; `<id>` = the PR number(s) or the branch slug; run `git check-ignore .cursor/specs` first and warn if it is ignored; no repo → output in chat only) **and** present it in chat. The file holds: the change-set summary, findings grouped by severity with dimension tags, the cross-PR section when relevant, and the verdict.

## Boundaries

- **Reports, never rewrites.** The review diagnoses; fixing is `/ko-fix-review`'s job (run it in a fresh session against the findings file), and empirical "won't break" confirmation is `/ko-verify`'s job — this command reasons statically.
- **Findings cite the diff.** No issues invented from memory about code the change set does not touch.
- **Scope to the change and its immediate blast radius** — not an unrelated-refactor hunt.
- Read-only to the end: never comment on or modify the PR. If the user wants to post the review, offer a **paste-ready** comment block — they post it themselves.
- Degrade gracefully: no `gh` → local diff review; no `wcag-2.2-aa` skill → the frontend specialist applies its inline accessibility checklist.
