---
name: ko-review-team
description: Multi-agent PR review — dispatches a team of specialist reviewers (compliance, regression safety, frontend+a11y, backend, tests) over the diff in one round, treats FE and BE changes differently, and consolidates a severity-ranked verdict
args: "[PR number/URL, or several for one feature — omit for the working diff]"
agents: [review-specialist]
skills-optional: [wcag-2.2-aa]
---

# Team review a change set

> Review a change set — the working diff, a branch, or one or more GitHub PRs — with a **team of specialist reviewers running in one round**. Each specialist owns one dimension; frontend and backend changes are routed to different specialists; the results are merged into one severity-ranked verdict. This command **reviews and reports — it never edits code and never posts to the PR.**

This is the heavyweight counterpart to `/ko-review` (one generic pass). Use it before merging a real MR, or to review a feature whose backend and frontend ship as separate PRs. It costs more tokens on purpose — the payoff is that one invocation surfaces every dimension's findings.

## The five review dimensions

| # | Dimension | Runs | Focus |
|---|-----------|------|-------|
| 1 | **compliance** | always | `.cursor/rules/` + `AGENTS.md` conformance; correctness (logic, edge cases, async, error handling); secrets / input validation |
| 2 | **regression** | always | **the base gate** — blast radius: callers/consumers of changed symbols, API/signature/schema/DTO changes, backward compatibility, migration safety, removed or renamed exports, behavior changes to shared code |
| 3 | **frontend** | FE files present | React/component patterns, state & props, the FE archetype rule, **WCAG 2.2 AA** accessibility |
| 4 | **backend** | BE files present | resolver/API contracts, service/module boundaries, data access (N+1, transactions), auth, idempotency, the BE archetype rule |
| 5 | **tests** | always | new behavior + edge cases covered, deterministic/isolated, whether existing tests still protect the changed paths |

Dimensions 1, 2, and 5 always run. Dimensions 3 and 4 run only when the diff touches files of that kind (Step 2). Each runs as its own `review-specialist` sub-agent — the agent holds the full playbook for every dimension.

## Step 0: Preflight (probe, then degrade — no hard stop)

One quick probe; this is user-triggered analysis, not a release gate, so a missing tool degrades the scope rather than blocking:

- `gh auth status` — if green, `gh` may be used **read-only**: fetch a PR's diff and metadata, resolve the default branch, note failing CI checks as context. **Never** `gh pr create` / `edit` / `comment` / `review` — this command is output-only.
- If `gh` is absent or unauthenticated, or the arg is not a PR: proceed on **local git only** (working/branch diff), resolving the base branch by probing `origin/main` then `origin/master`.

Print a one-line `✅/❌ gh` so the user knows which mode they're in.

## Step 1: Resolve the change set

- **No argument** → the working diff: uncommitted + staged (`git diff` and `git diff --staged`), or the branch vs the resolved base when the tree is clean.
- **One PR** (`<number>` or URL) → `gh pr diff <n>` for the patch and `gh pr view <n> --json title,body,headRefName,files` for metadata.
- **Several PRs** (comma/space-separated) → fetch each the same way. This is the "one feature, backend PR + frontend PR" case; keep each PR's diff labeled so findings and the Step 5 cross-PR pass can attribute them.

Restate the change set in one or two lines (what it does, which PR(s)/branch) before reviewing.

## Step 2: Classify the files and load context

Bucket every changed file to decide which conditional dimensions fire:

- **Frontend** — `*.tsx`, `*.jsx`, `*.css` / `*.scss` / `*.module.*`, `*.stories.tsx`, component/UI library dirs, MUI/theme code.
- **Backend** — `*.resolver.ts`, `*.service.ts`, `*.module.ts`, `*.controller.ts`, `*.entity.ts`, `*.dto.ts`, `*.graphql` / SDL, serverless/lambda handlers.
- **Shared / ambiguous** — plain `*.ts` utilities, config, CI, scripts → covered by dimensions 1/2/5 regardless.

Add dimension **frontend** if any FE file changed, **backend** if any BE file changed. If a file is genuinely ambiguous and could carry either risk, **include both** rather than guess.

Then load the shared context every specialist gets: the archetype rule(s) in `.cursor/rules/` plus `coding-standards.mdc`, `AGENTS.md`, and prior evidence — the newest report in `.cursor/specs/qa-reports/*.md` and the acceptance criteria of any matching spec in `.cursor/specs/`. This primes reviewers with known risk areas instead of a cold read.

## Step 3: Dispatch the review team (parallel, one round)

Dispatch **one `review-specialist` sub-agent per applicable dimension, in parallel**. Each returns findings only — specialists are read-only and write nothing. Give every agent the same block, filled per dimension:

```
You are a review-specialist on a team reviewing a change set. Your assigned
dimension is: <compliance | regression | frontend | backend | tests>.

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
```

- The **frontend** specialist is additionally told: *use the `wcag-2.2-aa` skill if it is installed* for the accessibility portion.
- **Sequential fallback:** if the environment cannot fan out sub-agents, run the dimensions one at a time and collect their findings — the output is identical, only slower.

## Step 4: Aggregate

Collect every specialist's findings into one list. When two dimensions flag the **same `path:line`**, merge them into a single entry, keep the **highest** severity, and tag which dimensions raised it. Group the merged list by severity — **Blocking / Should-fix / Nit** — and tag each finding with its dimension(s).

## Step 5: Cross-PR consistency pass (only when reviewing more than one PR)

Review the PRs as a set, not just individually:

- Do the contracts line up — does the frontend consume exactly the API/GraphQL shape the backend PR exposes? Do shared types/enums match on both sides?
- Are they independently mergeable, or must they ship together (and in which order)? Flag any migration/feature-flag/rollout coupling.
- Is anything defined twice or left as a dangling reference across the PRs?

Report this as its own section; a broken contract between the PRs is a **Blocking** finding.

## Step 6: Verdict and output

Give a verdict per PR and for the set as a whole:

- **Ship** — no Blocking, no Should-fix.
- **Ship with fixes** — Should-fix items only; list them.
- **Do not merge** — any Blocking. A **regression** Blocking is decisive: the base gate is that the change must not break current behavior or introduce new issues.

Write the consolidated review to `.cursor/specs/mr-reviews/<id>.md` (create the dir; `<id>` = the PR number(s) or the branch slug; run `git check-ignore .cursor/specs` first and warn if it is ignored; no repo → output in chat only) **and** present it in chat. The file holds: the change-set summary, findings grouped by severity with dimension tags, the cross-PR section when relevant, and the verdict.

Read-only to the end: never comment on or modify the PR. If the user wants to post the review, offer a **paste-ready** comment block — they post it themselves.

## Boundaries

- **Reports, never rewrites.** The team diagnoses; fixing is a separate step (`/ko-feature`, `/ko-bugfix`, or hand edits), and empirical "won't break" confirmation is `/ko-verify`'s job — this command reasons statically.
- **Findings cite the diff.** No issues invented from memory about code the change set does not touch.
- **Scope to the change and its immediate blast radius** — not an unrelated-refactor hunt.
- Degrade gracefully: no `gh` → local diff review; no `wcag-2.2-aa` skill → the frontend specialist applies its inline accessibility checklist.
