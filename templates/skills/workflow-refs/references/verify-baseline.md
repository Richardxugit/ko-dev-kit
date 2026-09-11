# ko-verify reference: base-branch baseline procedure

Loaded by `/ko-verify` Step 1.5 when a gate FAILS and you must determine whether the failure
pre-exists on the base branch:

1. Identify the base: `git merge-base HEAD origin/main` (or `master` — check which exists).
2. Create a throwaway worktree: `git worktree add /tmp/ko-baseline <merge-base-sha>` (reuse the
   installed `node_modules` via symlink if the lockfile is unchanged; otherwise install).
3. Run the same failing gate command there with the same env recipe.
4. **Subtract**: failures present on base are reported as `PRE-EXISTING (also fails on base)` under
   Repo Health; only the delta counts against the feature.
5. Remove the worktree afterward: `git worktree remove /tmp/ko-baseline --force`.

Shortcut: if a gate passes on HEAD, skip its baseline run. Cache baseline results for the session.
