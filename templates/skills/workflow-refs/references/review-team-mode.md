# ko-review reference: --team mode procedure

Loaded by `/ko-review --team` only. The six-dimension table and the verdict definitions live in the
command body; this file holds the procedure.

## Step T1: Classify the files and load context

Bucket every changed file to decide which conditional dimensions fire:

- **Frontend** — `*.tsx`, `*.jsx`, `*.css` / `*.scss` / `*.module.*`, `*.stories.tsx`, component/UI
  library dirs, MUI/theme code.
- **Backend** — `*.resolver.ts`, `*.service.ts`, `*.module.ts`, `*.controller.ts`, `*.entity.ts`,
  `*.dto.ts`, `*.graphql` / SDL, serverless/lambda handlers.
- **Shared / ambiguous** — plain `*.ts` utilities, config, CI, scripts → covered by the always-on
  dimensions regardless.

Add dimension **frontend** if any FE file changed, **backend** if any BE file changed. If a file is
genuinely ambiguous and could carry either risk, **include both** rather than guess.

Then load the shared context every specialist gets: the archetype rule(s) in `.cursor/rules/` plus
`coding-standards.mdc`, `AGENTS.md`, and prior evidence — the newest report in
`.cursor/specs/qa-reports/*.md` and the acceptance criteria of any matching spec in
`.cursor/specs/`. This primes reviewers with known risk areas instead of a cold read.

## Step T2: Dispatch the review team (parallel, one round)

Dispatch **one `review-specialist` sub-agent per applicable dimension, in parallel**. Each returns
findings only — specialists are read-only and write nothing. Give every agent the same block,
filled per dimension:

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

- The **frontend** specialist is additionally told: *use the `wcag-2.2-aa` skill if it is
  installed* for the accessibility portion.
- **Sequential fallback:** if the environment cannot fan out sub-agents, run the dimensions one at
  a time and collect their findings — the output is identical, only slower.

## Step T3: Aggregate

Collect every specialist's findings into one list. Drop or down-tag anything BugBot already
reported (note "also caught by BugBot" instead of duplicating). When two dimensions flag the
**same `path:line`**, merge them into a single entry, keep the **highest** severity, and tag which
dimensions raised it. Group the merged list by severity — **Blocking / Should-fix / Nit** — and tag
each finding with its dimension(s).

## Step T4: Cross-PR consistency pass (only when reviewing more than one PR)

Review the PRs as a set, not just individually:

- Do the contracts line up — does the frontend consume exactly the API/GraphQL shape the backend PR
  exposes? Do shared types/enums match on both sides?
- Are they independently mergeable, or must they ship together (and in which order)? Flag any
  migration/feature-flag/rollout coupling.
- Is anything defined twice or left as a dangling reference across the PRs?

Report this as its own section; a broken contract between the PRs is a **Blocking** finding.

## Step T5: Write the output

Write the consolidated review to `.cursor/specs/mr-reviews/<id>.md` (create the dir; `<id>` = the
PR number(s) or the branch slug; run `git check-ignore .cursor/specs` first and warn if it is
ignored; no repo → output in chat only) **and** present it in chat. The file holds: the change-set
summary, findings grouped by severity with dimension tags, the cross-PR section when relevant, and
the verdict (verdict definitions are in the command body).
