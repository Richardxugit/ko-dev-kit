---
name: ko-verify
description: Post-implementation verification — checks lint, build, type check, tests, a11y, storybook, and generates a QA report. Run after completing a feature or plan to confirm quality gates pass before handoff.
skills-optional: [wcag-2.2-aa]
---

# Verify Implementation

Run after completing a feature implementation (or a significant chunk of one) to verify quality gates and generate a QA handoff report — the final step before code review.

Invoke **`superpowers:verification-before-completion`** — it requires running the commands and confirming output before any success claim. If it is not installed, install superpowers first; the gates below still run, but treat every result as unverified until the skill is back.

Continue through all steps even if earlier steps find issues — the goal is to gather all findings into a single report, not to fail fast.

## Lean mode (`/ko-verify --lean`)

Used by the `--fast` feature profile or on request. Run only: Step 1 (scope), Step 1.5 (capability matrix + baseline — still required, it's what keeps lean results honest), type check, and the test suites covering the changed feature. Report results in chat — no QA report file, no Storybook audit, no browser check. The recommendation is capped at **"Lean verification passed — manual QA required before merge"**; lean mode can never output "Ready for code review."

## Step 1: Detect Archetype and Scope

1. List `.cursor/rules/` to detect archetype:
   - `nestjs-graphql.mdc` → **nestjs-graphql**
   - `fe-nx.mdc` → **fe-nx**
   - `e2e-playwright.mdc` → **e2e-playwright** (if installed — shipped by ko-qa-kit, not this kit)
   - `design-system.mdc` → **design-system**
   - None → **generic**

2. Determine what to verify:
   - If specs exist in `.cursor/specs/`, list files with unchecked items. If multiple, ask the user to pick. If one, use it.
   - If no spec, use `git diff main...HEAD --name-only` (or `master`) to identify changed files
   - Ask the user to confirm scope if ambiguous

3. If a spec was found, cross-check that all planned deliverables exist in the codebase — key files, functions, and types mentioned in the plan should be present. Report any that are missing as "Incomplete Implementation."

## Step 1.5: Capability Matrix and Base-Branch Baseline

Gates must reflect what THIS repo is actually wired for, and failures must be separated into "introduced by this work" vs "already broken on the base branch." Do this once, before running any gate.

### Capability detection

Read `.cursor/env-recipe.md` if present (written by the `env-preflight` skill) and use its verified commands. In an Nx monorepo, prefer `pnpm nx affected -t lint test build typecheck` scoped to the change. Then build the matrix from `package.json` (scripts + devDependencies) and `nx.json`/`project.json`:

| Capability | Detect via | If absent |
|------------|-----------|-----------|
| Lint | `scripts.lint` or an `nx` lint target | Gate = **N/A — not configured in this repo** |
| Type check | `tsconfig.json` present | N/A |
| Build | `scripts.build` or `nx` build target | N/A |
| Unit tests | `scripts.test` / jest / vitest | N/A (flag as repo-health: no test runner) |
| axe a11y | `jest-axe` / `vitest-axe` / `@axe-core/*` in devDeps | N/A (flag as repo-health: add jest-axe) |
| Storybook | `.storybook/` or `@storybook/*` | N/A |
| Playwright | `@playwright/test` in devDeps | N/A (e2e gate skipped) |

**N/A is not FAIL.** A gate with no backing tooling is reported as `N/A — not configured`, listed under **Repo Health** in the report with suggested setup, and never blocks the feature recommendation. Only configured-and-failing gates block.

### Base-branch baseline

For every gate that FAILS, determine whether the failure pre-exists on the base branch before
attributing it to the feature — the worktree procedure is in
`.cursor/skills/workflow-refs/references/verify-baseline.md`. Failures present on base are reported
as `PRE-EXISTING (also fails on base)` under Repo Health; only the delta counts against the feature.

Shortcut: if a gate passes on HEAD, skip its baseline run. Cache baseline results for the session.

## Step 2: Lint, Type Check, Build

Run the project's lint, type-check, and build commands (per the capability matrix and env recipe) to catch type errors, formatting issues, and build failures before testing.

In an Nx repo: `pnpm nx affected -t lint typecheck build`. Otherwise run the `package.json` scripts (`lint`, `tsc --noEmit`, `build`). Gates with no backing tooling are `N/A`, not run.

Report any failures, then apply the Step 1.5 baseline: failures that also occur on the base branch are `PRE-EXISTING` (Repo Health), not feature blockers. Only failures introduced by this work are blocking — they should be fixed before tests can be trusted.

## Step 3: Test Coverage Verification

Check that the implementation has appropriate tests at each level. What "appropriate" means depends
on the archetype. Discover the test runner from `package.json` `scripts.test` or the Nx target.

Follow the per-archetype check tables and coverage report format in
`.cursor/skills/workflow-refs/references/verify-archetype-tests.md`.

## Step 4: Accessibility Audit (Frontend Archetypes Only)

Skip this step for nestjs-graphql, e2e-playwright, and generic.

Activate the `wcag-2.2-aa` skill and audit all changed/new components. If the skill is not available,
use the fallback code-review checklist in
`.cursor/skills/workflow-refs/references/verify-a11y-checklist.md` instead.

1. **Automated** — Check axe results from the test suite (run in Step 3). If axe tests are missing for any component, flag it explicitly: "No automated a11y verification for `<file>` — axe test required."

2. **Code review** — checklist per the skill (or the fallback reference).

3. **Report** findings by severity (critical / serious / moderate) with WCAG criterion references.

## Step 5: Storybook Verification (design-system / fe-nx with Storybook)

Skip for nestjs-graphql, e2e-playwright, and generic.

First, check whether Storybook is installed: look for `.storybook/` or `@storybook/*` in devDependencies. If not configured, note it in the report and skip this step.

1. Check that new/changed components have `.stories.tsx` files
2. Verify stories cover meaningful states (Default, Loading, Error, Disabled, Empty)
3. If Storybook is running, check the a11y addon tab for violations
4. Report missing or incomplete stories

## Step 6: Browser / Live Verification (Frontend Archetypes Only)

Skip this step for `nestjs-graphql` and `generic`.

**Preflight first:** confirm a dev server is runnable — `package.json` `scripts.dev`/`scripts.start` (or the Nx serve target) exists and its port is free. No runnable server → record the skip and move on; don't fight the environment.

Then follow the tier procedure (Playwright MCP when configured, fallback otherwise) and skip
conditions in `.cursor/skills/workflow-refs/references/verify-browser-tiers.md`.

In any non-trivial skip case, the final recommendation in Step 8 cannot be "Ready for code review."

## Step 7: Generate QA Report

Produce a QA handoff report that tells a human tester exactly what needs manual attention. Save to
`.cursor/specs/qa-reports/YYYY-MM-DD-<feature-name>.md` using the template in
`.cursor/skills/workflow-refs/references/verify-qa-report-template.md`.

## Step 8: Report to User

Present a summary:
- Lint / type / build results
- Test results (pass/fail counts)
- A11y audit findings (critical issues if any)
- Storybook coverage
- **Browser verification:** `browser verification: PASS|FAIL|SKIPPED` (top-level signal)
- Implementation completeness (any missing deliverables)
- Path to the QA report file

**Recommendation logic:**

Only **introduced** failures count against the feature. `N/A` gates and `PRE-EXISTING` failures never block — they appear under Repo Health instead.

| Conditions | Recommendation |
|-----------|----------------|
| All configured checks PASS or pre-existing-only, browser verification PASS | "Ready for code review" (note Repo Health items) |
| Browser verification FAIL | "Address browser issues before review" |
| Browser verification SKIPPED (non-UI archetype) | "Ready for code review" if other checks pass |
| Browser verification SKIPPED (no runner) | "Manual browser testing required before review" |
| Any check has introduced failures | "Address N issues before review" with the specific introduced issues listed |

**Unit-of-work bolt log:** if the verified work belongs to a unit (`.cursor/specs/*/stories.md` — only when the `unit-of-work` skill is installed, shipped by ko-product-kit), append a bolt-log row (`verify` / `/ko-verify` / gate outcome summary, e.g. "all gates pass" or "2 introduced failures"). Append-only — never edit prior rows.

The recommendation cannot be "Ready for code review" if browser verification is FAIL or SKIPPED-without-a-runner on a UI archetype — even if all other checks pass. Finish by suggesting `/ko-review` on the diff.
