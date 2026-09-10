---
name: ko-spike
description: Timeboxed throwaway experiment to answer a technical question — output is a findings doc and a go/no-go decision, not mergeable code
args: "<question or hypothesis> [--timebox 4h|1d]"
---

# Spike

A spike answers a **question**, it does not ship code. The destination is a findings doc
and a go/no-go decision — the code is a means, and it is throwaway.

## Steps

1. **Frame the question** — one sentence: "This spike answers: ___". State upfront what
   evidence would mean *go* vs *no-go*. If you can't frame the question, stop and ask the
   user — an unframed spike is just wandering.

2. **Timebox** — state the budget (default: half a day). When it expires, stop and report
   whatever you have. An inconclusive spike reported on time beats a conclusive one that
   ate a week.

3. **Claim the story** — if a `type: spike` story exists in `.cursor/specs/*/stories.md`,
   claim it per the `unit-of-work` protocol (status → `in-progress`, bolt-log row) — only when that skill is installed (ko-product-kit).

4. **Explore** — build the cheapest thing that produces evidence. Spikes are explicitly
   exempt from: TDD, `/ko-verify`, `/ko-review`, and coding-standards polish. Code lives
   on a `spike/<slug>` branch or in `spikes/<slug>/` — never on a feature branch.

5. **Report** — write `.cursor/specs/<slug>/findings.md`:
   - the question and the go/no-go criteria from Step 1
   - what was tried, with the evidence (numbers, logs, timings — not impressions)
   - the verdict: **go** / **no-go** / **inconclusive** (with what would settle it)
   - if *go*: the anchoring artifacts for `/ko-feature` (its Step 0 intake)

6. **Never merge** — the spike branch is throwaway. If the user wants to promote any of it
   to production code, that code goes through the full `/ko-feature` path (spec, TDD,
   review) — pasted spike code is not exempt.

## Anti-patterns

- Scope creep: "while I'm here, let me also…" — no. Answer the question, stop.
- Gold-plating the spike: if you're writing tests for throwaway code, you're off track.
- Silent overtime: hitting the timebox and continuing without telling the user.
