---
name: ko-fix-review
description: Address review feedback for a PR — syncs ko-review findings, human reviewer comments, and BugBot comments into one findings file, then fixes each item with regression tests
args: "<PR number> (or omit to use the newest file in .cursor/specs/mr-reviews/)"
---

# Fix Review Findings

Review feedback lives in three places: the kit's findings file, human reviewer comments
on the PR, and BugBot comments. This command merges all three into one file, then fixes
every open item. **Run it in a fresh session** — the findings file is the handoff; you
do not need the session that wrote the code.

## Step 0: Resolve the target

- **With a PR number** → the PR and (if it exists) `.cursor/specs/mr-reviews/<n>.md`.
- **Without** → newest file in `.cursor/specs/mr-reviews/`; infer the PR from the current
  branch via `gh pr view --json number` when `gh` is available.
- If neither exists, stop and say so — there is nothing to fix from.

## Step 1: Sync external comments into the findings file

Requires `gh` (read-only, same rules as `/ko-review` — never comment back or edit the PR).
Skip with a one-line note when `gh` is unavailable or the PR number is unknown.

1. Pull review comments: `gh api repos/{owner}/{repo}/pulls/<n>/comments` (inline code
   comments) and `gh pr view <n> --comments` (top-level discussion).
2. Classify each by author: BugBot/Cursor-bot → `[bugbot]`; anyone else → `[human]`.
3. Merge into the findings file (create it if `/ko-review` never ran):
   - Each item gets: source tag (`[kit]` / `[human]` / `[bugbot]`), `path:line`, the
     problem statement, and status `open`.
   - **Dedupe**: if an external comment matches an existing finding's `path:line` (same
     file, line within ~5), add the source tag to the existing entry instead of creating
     a duplicate. Human wording beats kit wording when they describe the same thing.
   - Never delete or rewrite resolved entries.

The findings file is now the single source of truth. Print a summary: N kit findings,
N human comments, N BugBot comments, M total open items after dedupe.

## Step 2: Triage with the user (one batched round)

Present the open items grouped by severity, and ask once:

- All of them, or a subset? (Human "won't fix" / "by design" comments happen — do not
  silently fix something a reviewer flagged as intentional.)
- For any item that is ambiguous or contradicts another comment, ask now, not mid-fix.

## Step 3: Fix each item (one at a time)

Per item, in severity order (Blocking → Should-fix → Nit):

1. Read the cited code and its immediate context — no drive-by changes outside it
   (coding-standards Simplicity rules apply: fix the flagged problem, nothing more).
2. State the root cause in one sentence before editing (Bug fixes rules).
3. Fix it. Add or update a regression test that would have caught the problem —
   invoke `/ko-test` for the affected file if no test exists.
4. Mark the item `resolved` in the findings file with a one-line note of what changed.

If three consecutive items fail to fix cleanly, stop and report — that signals the
review found an architectural problem, not three separate ones.

## Step 4: Verify and wrap up

1. Run `/ko-verify` on the full change set.
2. Update the findings file: every item `resolved` / `wontfix` (with the reason from
   Step 2), plus a summary line with the date and commit range.
3. Present the summary in chat. If the user wants the PR updated, offer a paste-ready
   reply block per human comment — they post it themselves; this command never writes
   to the PR.

## Boundaries

- Fixes only what the findings file lists. New ideas go to `/ko-feature`, not here.
- Read-only on GitHub: syncs comments down, never pushes comments up.
- If the diff has moved since the review (rebase, new commits), say so and re-check each
  finding against current code before fixing — stale line numbers are expected.
