---
name: ko-review
description: Review the working diff for correctness, standards compliance, and design via the code-reviewer agent
agents: [code-reviewer]
---

# Review the current changes

> Review the working diff for correctness, standards compliance, and design — via the `code-reviewer` agent.

**Usage:** `/ko-review`

## Workflow

Invoke **`superpowers:requesting-code-review`** to structure the review with verification checkpoints and dimensional analysis.

*Fallback (no superpowers):* Follow the steps below manually.

## Steps

0. **Resolve the base branch** (don't assume `main`): `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` when `gh auth status` is green; otherwise probe `origin/main` then `origin/master`. When `gh` is available and a PR exists for this branch, also note PR context and failing CI checks — enrichment only; local review needs zero tools.
1. Gather the diff: uncommitted changes (`git diff` + staged), or the diff against the resolved base branch if reviewing a branch/PR.
2. Gather prior evidence: the newest matching QA report in `.cursor/specs/qa-reports/` (risk areas, introduced failures) and the spec's acceptance criteria when one exists — these prime the reviewer with known risk areas instead of a cold read.
3. Delegate to the **`code-reviewer`** subagent (in `.cursor/agents/`) with the diff, the repo's rules, and the Step-2 evidence as context.
3. The reviewer checks: correctness (logic, edge cases, async, error handling), compliance with `.cursor/rules/` + `AGENTS.md`, design (placement, reuse, small focused units), test coverage of the change, and security (input validation, no secrets).
4. Present findings grouped by severity — **Blocking / Should-fix / Nit** — each as `path:line — problem. Suggested fix.`
5. If nothing is wrong, say so. Don't manufacture issues.
6. If a spec exists in `.cursor/specs/` for this work, verify the diff satisfies the acceptance criteria.

This is review only — it reports, it doesn't rewrite. Address Blocking and Should-fix items, then re-run if needed.
