---
name: session-metrics
description: Report on AI session cost and shape — turns, tokens, peak context, tool usage — from the local session ledger, single session or aggregate. Use when the user asks what a session cost, how heavy it was, runs `/ko-session-metrics` (if installed — it is a manual-tier command), or wants evidence to calibrate context-usage thresholds.
---

# Session Metrics

Reads the append-only ledgers the `session-ledger` hook writes (one JSONL per
conversation, metadata only — no message content) and turns them into reports.

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

## Calibration loop

1. Let the ledger collect real sessions for a week.
2. Run `--aggregate` and set the printed `KO_CONTEXT_WARN` / `KO_CONTEXT_HANDOFF`
   in the environment (or adjust the hook defaults if the values stabilize).
3. Re-run after workflow changes — a kit edit that cuts context should move p50
   down measurably.
