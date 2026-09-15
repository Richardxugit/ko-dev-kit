# ko-feature reference: pair mode (`--pair`)

Loaded by `/ko-feature` when `--pair` is passed. Pair mode changes the EXECUTION cadence, not
the pipeline: brainstorm → spec → plan run unchanged; TDD, `/ko-verify`, and `/ko-review` still
run at the end.

**Why it exists:** solo AI execution finishes the ticket, but the human ends up trailing the
AI's reasoning — easy to get led by the nose. Pair mode keeps the human in the loop at every
step so analysis and writing stay shared.

## Hard rules

- **Inline execution only — never subagent-driven.** Pairing needs one shared context; fan-out
  defeats the purpose. Skip the execution-mode question in Workflow Transitions step 2. (The
  Step 2b recon subagent is unaffected — that's pre-flight, not execution.)
- **Checkpoint after EVERY task.** Never chain into the next task unprompted.

## The pair loop (per plan task)

1. **Brief** — before touching code: ≤3 sentences on what this task does, the approach, and the
   files it touches. Wait for confirmation or redirection.
2. **Red** — state the failing test's intent in one line BEFORE writing it, then write it and
   show it fail.
3. **Green** — write the minimal implementation; show the test pass.
4. **Review the diff together** — summarize what changed and why; the user approves, requests
   changes, or takes over (below).
5. **Stop** — diff summary + wait for "continue" before the next task.

## Human takeover

- The user can claim any step at any time ("I'll write this part"). Switch to navigator: review
  their code, spot issues, suggest — do not write the implementation for the claimed part.
- When the user hands the keyboard back, resume the loop at the current step.
- Default roles: AI drives (types), the user navigates with an approval gate on every step. If
  the user prefers to drive from the start, they say so once — invert roles for the session.

## Guardrails

- Quality gates unchanged: pair mode slows the cadence, it never skips TDD, verify, or review.
- Context cost: pairing keeps everything in the main session. For long tickets, commit per
  completed task so `/ko-implement` can resume cleanly in a fresh session.
- Combinable with `--fast` — fast sets depth, pair sets cadence.
