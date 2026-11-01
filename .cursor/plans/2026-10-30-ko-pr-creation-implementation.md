# PR Creation Command Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace output-only `/ko-pr-desc` with guarded `/ko-pr-creation`, including logical commits, push, and PR creation.

**Architecture:** Keep the workflow in one Cursor command. Preserve the existing title/body sections, add explicit git safety and preview/execution stages, and enforce the contract through repository consistency tests plus real git dry-runs. No helper script or second command.

**Tech Stack:** Markdown Cursor command, MDC rule, Node 20, Vitest, git, GitHub CLI.

---

### Task 1: Define the failing command contract

**Objective:** Encode rename, safety, commit-quality, and preserved-title/body requirements before editing production templates.

**Files:**
- Modify: `tests/consistency.test.js`

**Steps:**
1. Add a `ko-pr-creation` describe block asserting the new file exists and old file does not.
2. Assert frontmatter/name, main/master/detached guards, branch/worktree choices, one preview, manual mode, logical commit grouping, exact paths/messages/reasons, no `git add -A`, no force, no `--no-verify`, hook failure stop, existing PR handling, `gh` requirement, final URL, and preserved QA/title/template sections.
3. Assert `/ko-feature` does not reference `/ko-pr-creation`.
4. Update stale REQUIRED entries from `ko-pr-desc.md` to `ko-pr-creation.md` and add `ko-pr-desc` to BANNED.
5. Run `pnpm vitest run tests/consistency.test.js`; verify failure is caused by the missing new command/old command still present.

### Task 2: Implement the command and synchronize rules/docs

**Objective:** Satisfy the contract with the smallest direct rename and content changes.

**Files:**
- Rename: `templates/commands/ko-pr-desc.md` → `templates/commands/ko-pr-creation.md`
- Modify: `templates/rules/coding-standards.mdc`
- Modify: `scripts/smoke-init.mjs`
- Modify: `README.md`
- Test: `tests/consistency.test.js`

**Steps:**
1. Rename the command and preserve its title derivation, template lookup/fill, diff, Jira, and QA-report logic.
2. Add branch/worktree preflight, safe dirty transfer, logical commit preview, one execution/manual choice, guarded commit/push/create stages, and honest failure stops.
3. Replace the worktree-only commit rule with the approved independent-branch rule in both the MDC and README.
4. Update command/lifecycle references to `/ko-pr-creation`; do not add it to `/ko-feature`.
5. Update the universal smoke-install expectation from the old command to the new one.
6. Run `pnpm vitest run tests/consistency.test.js`; verify all consistency tests pass and the command remains ≤9,000 chars.

### Task 3: Verify integration and real git behavior

**Objective:** Prove installation, pruning/export compatibility, budgets, and representative git flows with real repositories.

**Files:**
- Modify only if a verified defect requires a regression test and fix.

**Steps:**
1. Run `pnpm test`, `pnpm smoke`, `pnpm dup-check --strict`, and `node scripts/context-budget.mjs --enforce`.
2. Scaffold every archetype and confirm `ko-pr-creation.md` installs while `ko-pr-desc.md` does not; export the command and verify a self-contained bundle.
3. In disposable real git repos, dry-run: dirty main → branch; dirty main → worktree with untracked file; independent branch with two logical commit groups; empty diff; and simulated hook failure. Do not create a real PR without separate user approval.
4. Inspect `git diff`, run the full suite again after any fix, and commit only logically related changes with a short meaningful message.
