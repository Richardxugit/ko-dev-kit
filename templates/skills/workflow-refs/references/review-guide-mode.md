# Guided review protocol (`ko-review --guide`)

The human holds the verdict; the agent is the co-pilot. The goal is not to find
issues FOR the user — it is to make the user fast and well-informed enough to
judge the change themselves. Comprehension first, findings woven in.

## Building the route

One orientation pass over the diff (read it fully, but cheaply — no deep
analysis yet). Then chunk it into **stations**: coherent units a reviewer can
hold in their head at once (a resolver + its service, a component + its state
hook, a schema change + its migration).

Order stations so each builds on the last:

1. **Contracts first** — schema/API/types/migrations. Everything downstream
   depends on these; a reviewer who misreads the contract misreads the rest.
2. **Orchestration** — the entry points and state machines that wire the change.
3. **Implementation** — the guts, in dependency order.
4. **Tests last** — by now the user knows what SHOULD be tested; test quality
   becomes checkable instead of taken on faith.

Present the route before starting: numbered stations with one-line labels, the
rationale for the order in one line, total count. The user may reorder or skip
up front — their call, zero friction.

## Station message format

Every station follows the same shape, in plain language (no filler, jargon
defined on first use — same contract as `ko-explain`):

```
Station 2/6 — order.repository.ts: optimistic locking on status updates

What changed: updates now carry a version field; a mismatched version
throws instead of overwriting (order.repository.ts:45).

The file's job: the only writer to the orders table — every status
change funnels through here.

Watch: the throw is NOT_FOUND-shaped; callers may misreport it as
"missing order" (order.repository.ts:52).

Your call: does any caller update status WITHOUT reading the version
first? (checkout.service.ts:112 looks like one — want me to check?)
```

- **What changed** — 1–3 sentences, `path:line` anchors.
- **The file's job** — one line, its role in the flow, never a restatement of
  its name.
- **Watch** — the agent's own findings surface HERE, framed as things to look
  at, not verdicts. The user should feel they spotted it.
- **Your call** — exactly ONE question the reviewer should answer to own this
  station. It must be answerable from what they just read plus repo context.

## User controls

- `next` / `n` / `skip` — advance. Skipped stations are listed at the end as
  unreviewed — never silently dropped.
- Any question — answer it with `path:line` evidence, then return to the SAME
  station. The route pauses; it never derails.
- `flag <note>` — record a user finding: `{station, path:line, note}` into the
  running ledger shown at the end. User flags are first-class: they outrank
  agent observations in the final report.
- `flag?` — show the ledger so far.
- `map` — re-print the route with visited/skipped/current marked.
- `wrap` — user is done early: skip to the verdict with remaining stations
  listed as unreviewed.

Show the controls once, at the route presentation. After that, each station
ends with the single `Your call` question — not a menu.

## Interrupts and resume

Show `Station N/total` on every message so an interrupted session loses little.
On a fresh session asked to resume: rebuild the route from the same change set,
ask which station to restart from, and carry over any flags the user pastes or
that survive in the transcript.

## Verdict synthesis

When the route completes (or the user says `wrap`):

1. Present the flag ledger: user flags first, then agent observations the user
   never reacted to (mark these `unconfirmed` — the user may adopt or drop each).
2. Merge into the standard ko-review verdict block — **Ship / Ship with fixes /
   Do not merge** — with severity grouping (Blocking / Should-fix / Nit).
3. Write the file to `.cursor/specs/mr-reviews/<id>.md` per the review-team
   reference (same shape, marked `mode: guide` so `/ko-fix-review` reads it
   identically), and offer a paste-ready comment block. The command never posts.

## Boundaries specific to guide mode

- `--guide` is always a single co-pilot — never fan out sub-agents. If the user
  asks for `--team --guide`, run `--team` first, then guide them through the
  team findings mapped onto the diff stations.
- The agent advises; the user decides. If the user dismisses a Blocking-tier
  observation, record it as dismissed — never relitigate it station after
  station, and never silently drop it from the final report.
- Stations are sized for attention, not completeness: hunks that are pure
  formatting, lockfiles, or generated code collapse into one line
  ("generated, skipped") — they are not stations.
- Cost shape: interactive by design, more turns than a single pass. Keep
  per-station work small; depth goes where the user's questions go, not where
  the agent's curiosity goes.
