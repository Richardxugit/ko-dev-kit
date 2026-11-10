# ko-review reference: incremental round procedure

Loaded by `/ko-review` when a prior review file exists for the same change set and no `--full`
is passed. A full pass stays the default for first reviews; this file describes the cheaper
second pass.

## When an incremental round applies

`/ko-review <id>` checks `.cursor/specs/mr-reviews/<id>.md` (`<id>` = PR number, else sanitized
branch slug):

- **No file** → full pass (current behavior).
- **File exists with a footer** `reviewed-sha: <sha>` and `mode: full|incremental|team|guide`:
  - `merge-base(HEAD, base)` unchanged since the last round **and** HEAD advanced past
    `reviewed-sha` → incremental round. Print one line of scope:
    `incremental: delta <sha>..<HEAD>; --full for a fresh pass`.
  - Base moved, HEAD not advanced, `--full` passed, or the footer is unparseable → full pass.
- `--team` and `--guide` always run full; incremental scoping applies to the single-pass mode
  only.

## Step I1: Compute the delta

- `git diff <reviewed-sha>..HEAD -- <files from the stored diff>` plus any files newly
  appearing in the change set.
- Only these hunks are re-read in depth; untouched files are not re-opened (their findings were
  already derived and are verified by state below).

## Step I2: Verify prior findings

For each stored finding from earlier rounds:

- Cited `path:line` region changed in the delta **and** the change addresses it → mark
  `resolved`, cite the evidence (`fixed in <sha>`).
- Region changed **and** not addressed → carry forward unchanged.
- Region untouched → carry forward as `still open (unchanged)` — verified by the hash, not
  re-read.

## Step I3: New findings

New findings come **only** from delta hunks, same severity taxonomy (Blocking / Should-fix /
Nit) and `path:line` format. Nothing is re-derived from untouched code — prior rounds covered
it.

## Step I4: Write the output

Append to the same review file:

```
## Round N (incremental, <sha-old>..<sha-new>)

### Delta covered
<files and hunk ranges re-reviewed>

### Prior findings
| Finding | State |
|---|---|
| <path:line — summary> | resolved (fixed in <sha>) / carried forward / still open (unchanged) |

### New findings
<grouped by severity, same format as a full pass>
```

- Update the footer: `reviewed-sha: <new HEAD sha>` and `mode: incremental`.
- Chat presents the merged verdict — carried-forward findings count toward it exactly as in a
  full pass — plus the one-line delta scope.

## Degradation (never a scope cut)

- Unresolvable `reviewed-sha` (force-push / rewritten history) → fall back to a full pass
  silently and note it in the output.
- The stored diff's file list cannot be recovered → full pass.
- If the delta cannot be computed confidently for any reason, review fully rather than guess:
  incremental is a cost optimization, never a scope cut.
