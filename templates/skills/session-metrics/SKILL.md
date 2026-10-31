---
name: session-metrics
description: Report on AI session usage and shape — command-led turns, tokens, peak context, tool usage — from the local session ledger, single session or aggregate. Use when the user asks how heavy a session or command was, runs `/ko-session-metrics` (if installed — it is a manual-tier command), or wants evidence to calibrate context-usage thresholds.
---

# Session Metrics

Reads the append-only ledgers the `session-ledger` hook writes (one JSONL per
conversation, metadata only — no message content) and turns them into reports.
Command attribution uses stored command names and IDs only, never prompt text.

## Run it

```bash
# single session (most recent by default)
node .cursor/skills/session-metrics/scripts/report.mjs
node .cursor/skills/session-metrics/scripts/report.mjs --conv <ledger-name>

# aggregate: the calibration evidence for context-usage thresholds
node .cursor/skills/session-metrics/scripts/report.mjs --aggregate [--days 7]

# machine-readable
node .cursor/skills/session-metrics/scripts/report.mjs --json
```

Ledger names are base64url-encoded conversation ids — the aggregate report and
the "no ledger" message list the available names; pick from there.

## What the numbers mean

- **Peak context** — the largest single-turn input (input + cache read + cache
  write). That is the turn where the session was heaviest, and the number the
  `context-usage` hook thresholds must be tuned against.
- **Active vs wall minutes** — gaps over 5 minutes count as idle, not work.
- **Aggregate p90** is the suggested `KO_CONTEXT_WARN`: a warning most sessions
  trip is one people learn to ignore, so warn only on the heaviest ~10%.

## Command-led attribution

- An explicit leading `/ko-*` prompt opens a segment. Repeating the same command
  opens another segment, including when the previous segment contains only its
  prompt; prompts themselves are not turns or tool calls.
- Free-form follow-ups (`command: null`) and nested workflow activity stay in
  the active command. Stop events are inert for attribution. Activity before
  the first command, and ledgers from before prompt events existed, is reported
  as `unattributed`.
- Aggregate reports reconstruct the active command from full event history,
  then clip segment events to the requested window. An older command therefore
  retains its in-window turns and tools without contributing out-of-window
  tokens.
- Single-session JSON adds `segments`; aggregate JSON adds `commands`, grouped
  by command with segment/turn/token/tool totals and segment-peak percentiles.
  Text reports show the same command-led usage.

The ledger stores command names and generation/model identifiers, never prompt
arguments, free-form text, attachment paths, or tool input. Command-led usage
is observational, **not exact billing**; no provider-billing join is claimed,
and the report does not invent per-command dollars or other currency amounts.

## Calibration loop

1. Let the ledger collect real sessions for a week.
2. Run `--aggregate` and set the printed `KO_CONTEXT_WARN` / `KO_CONTEXT_HANDOFF`
   in the environment (or adjust the hook defaults if the values stabilize).
3. Re-run after workflow changes — a kit edit that cuts context should move p50
   down measurably.
