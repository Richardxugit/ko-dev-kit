---
name: ko-verify
description: Post-implementation verification — checks lint, build, type check, tests, a11y, storybook, and generates a QA report. Run after completing a feature or plan to confirm quality gates pass before handoff.
skills-optional: [wcag-2.2-aa, unit-of-work]
---

# Verify Implementation

Run after completing a feature implementation (or a significant chunk of one) to verify quality gates and generate a QA handoff report. This is the final step before the work is ready for code review.

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

For every gate that FAILS, determine whether the failure pre-exists on the base branch before attributing it to the feature:

1. Identify the base: `git merge-base HEAD origin/main` (or `master` — check which exists).
2. Create a throwaway worktree: `git worktree add /tmp/ko-baseline <merge-base-sha>` (reuse the installed `node_modules` via symlink if the lockfile is unchanged; otherwise install).
3. Run the same failing gate command there with the same env recipe.
4. **Subtract**: failures present on base are reported as `PRE-EXISTING (also fails on base)` under Repo Health; only the delta counts against the feature.
5. Remove the worktree afterward: `git worktree remove /tmp/ko-baseline --force`.

Shortcut: if a gate passes on HEAD, skip its baseline run. Cache baseline results for the session.

## Step 2: Lint, Type Check, Build

Run the project's lint, type-check, and build commands (per the capability matrix and env recipe) to catch type errors, formatting issues, and build failures before testing.

In an Nx repo: `pnpm nx affected -t lint typecheck build`. Otherwise run the `package.json` scripts (`lint`, `tsc --noEmit`, `build`). Gates with no backing tooling are `N/A`, not run.

Report any failures, then apply the Step 1.5 baseline: failures that also occur on the base branch are `PRE-EXISTING` (Repo Health), not feature blockers. Only failures introduced by this work are blocking — they should be fixed before tests can be trusted.

## Step 3: Test Coverage Verification

Check that the implementation has appropriate tests at each level. What "appropriate" means depends on the archetype. Discover the test runner from `package.json` `scripts.test` or the Nx target.

### nestjs-graphql

| Test Type | What to Check | How to Check |
|-----------|--------------|--------------|
| **Unit tests** | Services/business logic have `*.spec.ts` with providers mocked | Check spec files co-located with changed services |
| **Resolver/controller tests** | GraphQL resolvers / REST controllers tested | Grep for `Test.createTestingModule` and resolver spec files |
| **e2e tests** | Endpoints have Supertest e2e coverage with a booted module | Check `test/` or `*.e2e-spec.ts` for the changed feature |
| **Contract tests** | Federation/consumer contracts covered (if pact is used) | Grep for `@pact-foundation` / pact files for changed subgraph |

Run the test target and report results. Note tests that passed on the base but now fail (regressions).

### fe-nx

| Test Type | What to Check | How to Check |
|-----------|--------------|--------------|
| **Unit tests** | Components and utilities have co-located `.test.tsx` / `.test.ts` | Check for test files alongside changed files |
| **axe a11y** | Component tests include an accessibility check | Grep for `toHaveNoViolations` or `axe(` in test files. If `jest-axe`/`vitest-axe` is installed but missing for changed components, flag as **blocking**. If not installed at all, report `N/A — not configured` + a Repo Health item; do not mark a11y as PASS. |
| **Interaction tests** | Interactive components tested with `userEvent` (keyboard + mouse) | Grep for `userEvent` and keyboard testing (`getByRole`, `Tab`, `Enter`) |
| **Integration tests** | Multi-component flows / pages covered | Check for tests rendering parent components or pages |

Run `pnpm nx affected -t test` (or the test script) and report results.

### design-system

| Test Type | What to Check | How to Check |
|-----------|--------------|--------------|
| **Component tests** | Each component has a `.test.tsx` with RTL + `userEvent` | Check co-located test files |
| **axe a11y** | Every component test includes an axe check | Grep for `toHaveNoViolations` / `axe(` |
| **Stories** | New/changed components have `.stories.tsx` covering key states | Check for co-located stories |

### e2e-playwright (if installed — ko-qa-kit repos)

| Test Type | What to Check | How to Check |
|-----------|--------------|--------------|
| **Scenario coverage** | New/changed flows have `.feature` + step defs (or specs) | Check for matching `.feature`/spec files |
| **Run result** | The relevant scenarios pass | Run the targeted Playwright/BDD command; capture trace on failure |

### Report format for test coverage

```
## Test Coverage

| Type | Status | Base branch | Details |
|------|--------|-------------|---------|
| Unit tests | PASS/FAIL/MISSING/N/A | PASS/FAIL | N tests; N failing (N pre-existing on base, N introduced) |
| A11y (axe) | PASS/FAIL/MISSING/N/A | PASS/FAIL | N components checked |
| e2e / integration | PASS/FAIL/MISSING/N/A | PASS/FAIL | N tests |
| ... | ... | ... | ... |

### Missing Coverage
- `packages/ui/src/lib/NewWidget/NewWidget.tsx` — no test file found
- `apps/account/src/wishlist/wishlist.service.ts` — no spec for `handleEdgeCase()`
```

## Step 4: Accessibility Audit (Frontend Archetypes Only)

Skip this step for nestjs-graphql, e2e-playwright, and generic.

Activate the `wcag-2.2-aa` skill and audit all changed/new components. If the skill is not available, perform the code-review checklist below directly.

1. **Automated** — Check axe results from the test suite (run in Step 3). If axe tests are missing for any component, flag it explicitly: "No automated a11y verification for `<file>` — axe test required."

2. **Code review** — For each changed component, check:
   - Labels: every input has a programmatically associated visible label
   - Keyboard: all interactive elements reachable and operable via keyboard
   - Focus: focus managed correctly after dialogs, route transitions, async actions
   - Contrast: text and UI components meet contrast ratios (flag if theme tokens are not used)
   - ARIA: correct roles, states, and live regions for dynamic content
   - Semantic HTML: native elements over ARIA roles (`<button>` not `<div role="button">`)
   - Target size: interactive elements at least 24x24px
   - Reflow: layout works at 320px width

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

**Preflight first:** confirm a dev server is runnable — `package.json` `scripts.dev`/`scripts.start` (or the Nx serve target) exists and its port is free. No runnable server → record the skip (below) and move on; don't fight the environment.

### Tier 1 — Playwright MCP (when `.cursor/mcp.json` defines the `playwright` server)

1. Start the dev server (background, capture PID); wait for it to become available
2. Drive the changed feature through the MCP: `browser_navigate` to the affected page/story, then read `browser_snapshot` (accessibility tree) — see the `dom-sight` skill when installed
3. Confirm the happy path: expected elements present in the snapshot, no error states rendered; interact via the MCP tools where the change demands it
4. Kill the dev server PID; record the snapshot evidence in the QA report under "Browser Verification"

### Tier 2 — fallback (no Playwright MCP)

1. Start the dev server (background, capture PID); wait for it to become available
2. For e2e-playwright repos: run the relevant scenario via the project's Playwright runner
3. For fe-nx / design-system: load the page or story and confirm the happy path renders without console errors; capture a screenshot to `.cursor/screenshots/<feature>-happy-path.png`
4. Kill the dev server PID; record the result in the QA report under "Browser Verification"

### Skip conditions

- Non-UI archetype (`nestjs-graphql` or `generic`) → record "Skipped — non-UI archetype"
- No runnable dev server / Playwright → record "Browser verification SKIPPED — manual testing required"

In any non-trivial skip case, the final recommendation in Step 8 cannot be "Ready for code review."

## Step 7: Generate QA Report

Produce a QA handoff report that tells a human tester exactly what needs manual attention. Save to `.cursor/specs/qa-reports/YYYY-MM-DD-<feature-name>.md`.

```markdown
# QA Report: <Feature Name>

**Date:** YYYY-MM-DD
**Archetype:** <detected archetype>
**Spec:** <link to spec file if exists>
**Branch:** <current branch name>

## Summary
<1-2 sentences: what was built, what's the risk area>

## How to Test
<Setup steps: commands to run, URL to navigate to, test account info if needed>

## Implementation Completeness
| Planned | Status |
|---------|--------|
| <deliverable from plan> | DONE / MISSING |

## Capability Matrix
| Gate | Configured? | Notes |
|------|-------------|-------|
| Lint | YES / N/A | |
| Type check | YES / N/A | |
| Build | YES / N/A | |
| axe | YES / N/A | |
| Storybook | YES / N/A | |

## Lint / Type / Build
| Check | Result | Base branch |
|-------|--------|-------------|
| Lint | PASS/FAIL/N/A | PASS/FAIL |
| Type check | PASS/FAIL/N/A | PASS/FAIL |
| Build | PASS/FAIL/N/A | PASS/FAIL |

Failure counts list introduced vs pre-existing.

## Automated Test Results
| Category | Result | Count |
|----------|--------|-------|
| Unit tests | PASS/FAIL | N passing, N failing |
| A11y (axe) | PASS/FAIL/MISSING | N components, N violations |
| e2e / integration | PASS/FAIL | N passing, N failing |
| Storybook stories | PRESENT/MISSING/N/A | N stories for N components |

## A11y Findings
### Issues Found (fix before merge)
- **[severity] [WCAG criterion]** — description, file:line
### Verified (no issues)
- Keyboard navigation / Focus management / Color contrast: <what was checked>

## Browser Verification
**Result:** PASS | FAIL | SKIPPED
**Artifacts:** screenshot / trace path
**What was exercised:** page, interactions, final state
**Skipped reason (if any):** <reason> — manual QA required

## Manual QA Checklist
### Functional
- [ ] <specific user flow to test end-to-end, with steps>
- [ ] <edge case / error handling>
### Accessibility (Manual)
- [ ] Keyboard navigation: Tab through <flow>, verify focus order
- [ ] Screen reader: navigate <component/page>, verify announcements
- [ ] Zoom: layout at 200%
- [ ] Reflow: no horizontal scroll at 320px
### Browser / Device
- [ ] Chrome (primary)  - [ ] Safari (if applicable)  - [ ] Mobile viewport (if responsive)

## Repo Health (not caused by this feature)
- **PRE-EXISTING:** <gate> — <N failures, also present on base at <sha>>
- **NOT CONFIGURED:** <gate> — <suggested setup>

## Not Covered
<anything explicitly out of scope or deferred>
```

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

**Unit-of-work bolt log:** if the verified work belongs to a unit (`.cursor/specs/*/stories.md` — see the `unit-of-work` skill, if installed), append a bolt-log row (`verify` / `/ko-verify` / gate outcome summary, e.g. "all gates pass" or "2 introduced failures"). Append-only — never edit prior rows.

The recommendation cannot be "Ready for code review" if browser verification is FAIL or SKIPPED-without-a-runner on a UI archetype — even if all other checks pass. Finish by suggesting `/ko-review` on the diff.
