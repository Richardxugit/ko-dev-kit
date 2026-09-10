---
name: ko-bugfix
description: Start a structured bug fix with git archaeology, archetype-aware context, then hand off to superpowers debugging
agents: [code-reviewer]
skills-optional: [unit-of-work]
---

# Bug Fix Workflow

## Prerequisites

This command requires the **superpowers** skills for the debugging methodology. If `superpowers:systematic-debugging` is not available, install it via the [superpowers repo](https://github.com/obra/superpowers) first — the inline steps below are orchestration only (git archaeology, archetype context, regression-test handoff) and degrade to a summary without the methodology skills. Per the Bug fixes rules: no fix without a stated root cause.

You are fixing a bug in this project. Follow these steps:

## Step 1: Detect Archetype & Load Context

List `.cursor/rules/` to identify the archetype:
- `fe-nx.mdc` → Frontend Nx monorepo
- `nestjs-graphql.mdc` → NestJS + Apollo GraphQL
- `e2e-playwright.mdc` → Playwright BDD e2e tests (if installed — shipped by ko-qa-kit, not this kit)
- `design-system.mdc` → Storybook + MUI component library

Load the archetype rules, `AGENTS.md`, and testing setup.

If `.cursor/knowledge-base/` exists, list the docs and read the 1-3 most relevant for the affected area.

## Step 2: Gather Bug Context

If the bug references a Jira ticket, fetch it via the Atlassian MCP first (the fetch is the probe) — pull the summary, description, repro steps, environment, and attachments/comments worth reading. If the fetch fails or the MCP isn't configured, say so and ask for a paste — never work from a guessed ticket summary.

Then ask the user for whatever the ticket didn't answer:
- What is the expected behavior?
- What is the actual behavior?
- Steps to reproduce (if known)
- Any error messages or logs

## Step 3: Investigate Root Cause

Invoke **`superpowers:systematic-debugging`** for hypothesis-driven debugging with evidence gathering.

*Fallback (no superpowers):*
- **Reproduce:** Establish a reliable repro — exact steps or a failing test.
- **Isolate:** Read the code path, trace from symptom back to cause.
- **Hypothesis:** Form one, confirm with evidence before changing anything.
- Distinguish root cause from symptom.

## Step 4: Git Archaeology (optional — only when useful)

**Skip this step** for straightforward bugs where the cause is obvious from reading the code.

**Use this step** when:
- It's a **regression** — "it used to work"
- You can't understand the original intent of the buggy code
- You want context on why it was written that way

```bash
# Blame the suspect lines to find the introducing commit
git blame -L <start>,<end> <file>

# See recent changes to the file
git log --oneline -20 -- <file>

# Show the full introducing commit
git show <commit-sha>

# For regressions where "it used to work": bisect
git bisect start
git bisect bad HEAD
git bisect good <known-good-sha>
# ... then test at each step
```

**Record the findings:**
- Introducing commit SHA
- Author
- Date
- Original commit message (what was the intent?)

**Review the introducing commit** using the `superpowers:requesting-code-review` pattern — dispatch a code-reviewer subagent on the commit range to understand what went wrong:

```
Code reviewer subagent:
  DESCRIPTION: "Review commit that introduced bug: <symptom>"
  BASE_SHA: <parent-of-introducing-commit>
  HEAD_SHA: <introducing-commit>
  
  Focus on:
  - What was the original intent of this change?
  - What side effect or oversight caused the bug?
  - Was there a missing test that should have caught this?
```

This is informational — it helps understand context, not assign blame.

## Step 5: Write the bugfix spec

**Unit-of-work check first** (if the `unit-of-work` skill is installed): glob `.cursor/specs/*/stories.md` — if a unit's story covers this bug, claim it per the skill's protocol (story → `in-progress`, bolt-log row `construction: bugfix` / `/ko-bugfix`) and put the spec inside that unit's directory instead.

Create a spec at `.cursor/specs/fix-<slug>/spec.md` (its own directory, matching the kit's per-slug spec convention):

```markdown
# Bugfix: <title>

## Symptom
<what the user sees / what fails>

## Repro
<exact steps or failing test>

## Root cause
<one sentence: why it happens>

## Git archaeology (if investigated)
- **Introduced by:** <author> in <commit-sha> on <date>
- **Original intent:** <what the commit was trying to do>
- **What went wrong:** <the oversight or side effect>

## Fix
- **Where:** <file(s) to change>
- **What:** <the fix — smallest change addressing the root cause>
- **Check elsewhere:** <does this pattern repeat in other places?>

## Regression test
<the test that locks this fix in>

## Status: INVESTIGATING
```

## Step 6: ⏸️ Review checkpoint — STOP and ask the user

**Present the spec** (root cause + git archaeology + proposed fix) to the user.
- Ask: "This is the root cause and proposed fix. Look right?"
- Wait for approval. If the user disagrees, investigate further.
- **Only for refactoring fixes**: ask "Want a git worktree?"

## Step 7: Fix

- Invoke **`superpowers:test-driven-development`** — write the failing regression test first, then implement the fix. (Standalone fallback for the regression test: `/ko-test <affected file>` — it reuses the repo's existing test infrastructure.)
- Make the smallest change that addresses the root cause.
- Follow `.cursor/rules/` and surrounding code patterns.
- Check for the same bug elsewhere (it often repeats).
- Update spec status: `FIXING`

## Step 8: Verify & lock in

- Invoke **`superpowers:verification-before-completion`**.
- Run `/ko-verify` for the affected area.
- Invoke **`superpowers:requesting-code-review`** via `/ko-review` on the fix diff.
- Update the spec:
  ```markdown
  ## Verification
  - [x] Regression test passes
  - [x] Existing tests still pass
  - [x] Lint passes
  - [x] Same pattern checked elsewhere: <yes/no, where>

  ## Status: DONE
  ```

If a unit-of-work story was claimed in Step 5, mark it `done` and append the outcome bolt-log row.

Report: the root cause (one sentence), who introduced it and why, the fix, and the test that proves it. Finish with the report.
