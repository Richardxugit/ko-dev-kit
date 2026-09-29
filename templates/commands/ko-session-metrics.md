---
name: ko-session-metrics
description: Report what your AI sessions actually cost — turns, tokens, peak context, tool usage — from the local session ledger. Single session or aggregate percentiles for calibrating context-usage thresholds.
args: "[--aggregate] [--days N] [--conv <ledger-name>]"
---

# Session Metrics

Reads the local session ledger (written by the `session-ledger` hook — metadata
only, no message content) and reports what sessions cost and how heavy they get.

## Steps

1. **Run the report** (script lives at `.cursor/skills/session-metrics/scripts/report.mjs`):

   ```bash
   node .cursor/skills/session-metrics/scripts/report.mjs            # latest session
   node .cursor/skills/session-metrics/scripts/report.mjs --aggregate
   ```

   Pass the user's args through (`--days`, `--conv`, `--json`). If it prints
   "No session data found", say so and stop — the ledger only exists after the
   hook has recorded real sessions.

2. **Persist the report** so a later session can read it without re-running:
   first run only — create `.cursor/metrics/`, add `.cursor/metrics/` to
   `.gitignore` (skip if already covered), and drop a one-line README inside
   ("Local AI session metrics — gitignored, regenerate with /ko-session-metrics").
   Then write the report to `.cursor/metrics/<date>-<ledger-name|aggregate>.md`.
   Report what you created and continue without asking — local, reversible.

3. **Interpret, don't just relay**:
   - Single session: name the heaviest turn (peak context) and the top tool —
     both are the cost drivers.
   - Aggregate: the p50/p75/p90 table is the evidence for calibrating the
     `context-usage` hook. If the suggested `KO_CONTEXT_WARN` differs from the
     hook's current default, say so and show the one-line env override.
   - Never invent a dollar figure — Cursor billing is pool-based; report tokens
     and turns, which are the honest units.

## Boundary

Read-only over local ledger files. Never modifies code, never uploads anything.
