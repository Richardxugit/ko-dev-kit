---
name: ko-pr-creation
description: Create a GitHub pull request safely with logical commits, a non-force push, and a generated title/body
---

# Create Pull Request

Generate the PR content, preview the exact plan, and only on approval commit, push, and create the PR.

**Usage:** `/ko-pr-creation`

**Out of scope:** merge, comments/reviews, editing existing PRs, or ko-feature integration.

## Step 0: Preflight and branch safety

Start read-only. Resolve the current branch/HEAD and remote. Track `<pr-base>` as the repository branch name (`main`, then `master`, or the authenticated `gh` default) and `<diff-base>` as its existing remote-tracking ref (normally `origin/<pr-base>`). Use `<diff-base>` for local diffs and `<pr-base>` for GitHub; never pass `origin/...` to `gh pr create --base`. Gather staged, unstaged, and untracked changes and existing commits; record status/diff and HEAD for later comparison.

- Run `gh auth status` and verify a suitable remote before any full execution. Without them: local preview/manual only; no partial commits, push, or PR.
- An existing branch with a clean tree and commits absent from base may still push/create with an empty commit plan.
- With authenticated `gh`, check `gh pr view` for this branch. If an existing PR exists, print its URL and stop; never duplicate or edit it.
- After accounting for uncommitted changes and existing commits, if there is no PR diff against base, stop; no empty PR.

On main, master, and detached HEAD: no commit, push, or PR before branch setup. Ask the user to choose a new **branch in place** OR **new worktree + branch**. Propose a branch name from change type/ticket/slug and repo conventions; ask if a required ticket cannot be inferred. Never overwrite an existing branch or worktree path; choose another if either exists.

- **Branch in place** retains dirty changes naturally (`git switch -c <branch>`). A non-main/master independent branch may commit in an ordinary checkout; worktree is optional.
- **New worktree + branch with a dirty tree:** record status/diff (including staged and untracked); create an include-untracked stash (`git stash push --include-untracked ...`) and save its exact stash commit/ref; create the worktree/branch; apply that exact stash there with `--index`; compare resulting status/diffs/untracked content with the original. Only after a clean, matching transfer, drop the stash. On conflict or mismatch, stop; preserve the stash and both worktrees, and report paths, stash ref, and recovery state.

Run all later steps from the selected checkout/worktree.

## Step 1: Derive the PR Title

Read the current branch name (`git rev-parse --abbrev-ref HEAD`):

| Branch pattern | PR title |
|---|---|
| `feat/CON-1234-add-cart-page` | `feat: CON-1234 Add cart page` |
| `fix/OXP-5678-short-desc` | `fix: OXP-5678 Short desc` |
| `feat/CON-1234` (no slug) | `feat: CON-1234 <summary from commit messages>` |
| `refactor/no-ticket-slug` | `refactor: No ticket slug` |

Split on `/`, take the prefix as the type; extract the ticket pattern (`[A-Z]+-[0-9]+`) from the remainder if present. The remaining slug becomes the title content — hyphens/underscores to spaces, capitalize the first letter, sentence case (`MTP-161-create-seller-portal-page-structure` → `MTP-161 Create seller portal page structure`). No slug → derive content from the branch's commit messages (imperative, ≤6 words). A ticket alone is only acceptable when no slug and no usable commit message exist. Keep the title at most 72 characters.

## Step 2: Load the PR Template

Search in this order:

1. `.github/pull_request_template.md`
2. `.github/PULL_REQUEST_TEMPLATE.md`
3. `.github/PULL_REQUEST_TEMPLATE/*.md` (use the first file found)
4. `docs/pull_request_template.md`

If no local template and `gh` is authenticated, probe the same paths read-only in the target repository at `<pr-base>` (for example `gh api repos/{owner}/{repo}/contents/<path>?ref=<pr-base>`); first match wins. Use the returned template without writing remote content.

If found, use it as the body skeleton — fill every `<<...>>` placeholder with generated content based on the diff. Otherwise use:

```markdown
# Change

In non-technical terms please explain your changes

### What changed
### What can break

# Description

<<Include a summary of changes in this PR. Provide any relevant context for the reviewer>>

## What does this PR address

Jira - <<insert Jira Link>>
```

## Step 3: Gather Diff Context

With `<diff-base>` resolved in Step 0:

```bash
git diff <diff-base>...HEAD --stat
git log <diff-base>...HEAD --oneline
```

Also inspect staged/unstaged diffs and untracked files. Use changed files and commit messages to understand the PR.

**QA report chaining:** glob `.cursor/specs/qa-reports/*.md` and pick the newest report matching this branch/feature (branch name in the header, or feature-name overlap). When one exists, its Summary, introduced-failure list, and risk areas are the primary source for "What can break" and reviewer context — richer than rederiving from the raw diff. No report → fall back to the diff alone.

## Step 4: Fill the Template

- **Non-technical explanation** — one or two plain-English sentences describing the user-visible or system-level change. No code jargon.
- **What changed** — bullet points of key technical changes (files, modules, behaviours).
- **What can break** — honest risks, side-effects, or reviewer probes; if none, write "None identified."
- **Description** — concise summary and reviewer context (why this approach, trade-offs).
- **Jira link** — extract a ticket from the branch name if present (e.g. `https://jira.example.com/browse/CON-1234`); otherwise leave the placeholder.

Leave any section that cannot be filled from the diff as its placeholder text — do not invent content.

## Step 5: Plan commits

Existing commits are never rewritten; plan only uncommitted changes. Group each independently explainable logical change, not by file count, extension, or directory. Implementation and its tests normally stay together; separate unrelated features, fixes, refactors, docs, and chores.

For every commit, preview a SHORT MEANINGFUL message following repo type/scope/ticket conventions, its exact file list, and grouping reason. Forbid generic `update files`, `fix stuff`, or `wip`.

Stage explicit paths only (`git add -- <paths>`); never `git add -A`. After every staging operation, verify the staged paths exactly match the approved commit; preserve working-tree content when restaging. If same-file hunks need different commits and cannot be split reliably, stop. Never amend or rebase.

## Step 6: Preview and approve once

Show one preview with current/base branches (`<branch>` / `<diff-base>`), changed files (staged/unstaged/untracked), existing commits, commit plan (or none), **PR Title**, **PR Body**, remote push target (`remote/branch`), and PR base (`<pr-base>`).

Ask ONCE: “Execute this exact commit → push → PR plan, or leave it manual?” Manual means no commit, push, or PR creation; print the plan/text only. If the tree or HEAD changes after preview, stop and re-preview; approval never covers new files or hunks.

## Step 7: Execute the approved plan

1. Commit only the approved groups in order. Run pre-commit hooks normally; never `--no-verify`. On hook failure, stop before push/PR and report any commits already created honestly.
2. Push the current branch without force (`git push -u <remote> <branch>`). A rejection/non-fast-forward stops; report commits created and do not create a PR.
3. Create with the approved title/body/base using `gh pr create --base <pr-base> --head <branch> --title <title> --body <body>` and print the returned URL.
4. If PR creation fails after commit/push, report the exact completed state and original error; no blind retry and never claim false success.
