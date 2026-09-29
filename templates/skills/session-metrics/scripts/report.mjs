#!/usr/bin/env node
// report.mjs — aggregate ko-dev-kit session ledgers into a metrics report.
//
// Usage:
//   node report.mjs [--ledger-dir DIR] [--conv ID]   single session (default: most recent)
//   node report.mjs [--ledger-dir DIR] --aggregate [--days N]
//   node report.mjs ... --json                        machine-readable output
//
// Ledgers are JSONL written by the session-ledger hook: one event per line,
// { ts, t: 'turn'|'tool'|'stop', ... }. Malformed lines are skipped — a
// half-written last line must never break the report.
//
// Aggregate mode's headline is the peak-context percentile table: the
// evidence base for calibrating KO_CONTEXT_WARN / KO_CONTEXT_HANDOFF
// (threshold-at-p90 — a warning most sessions trip is one people ignore).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const LEDGER_DIR = opt('ledger-dir', path.join(os.tmpdir(), 'ko-session-ledger'));
const DAY_MS = 86_400_000;
const IDLE_GAP_MS = 5 * 60_000; // gaps longer than this don't count as active time

const kfmt = (n) => `${(n / 1000).toFixed(1)}K`;
const pctile = (sorted, p) => {
  if (sorted.length === 0) return 0;
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
};

function readLedger(file) {
  const events = [];
  for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (typeof e.ts === 'number' && e.t) events.push(e);
    } catch { /* skip malformed lines */ }
  }
  return events;
}

function summarize(convId, events) {
  const turns = events.filter((e) => e.t === 'turn');
  const tools = events.filter((e) => e.t === 'tool');
  const peak = turns.reduce((m, t) => Math.max(m, (t.in || 0) + (t.cr || 0) + (t.cw || 0)), 0);
  const models = {};
  for (const t of turns) {
    models[t.model] = models[t.model] || { turns: 0, in: 0 };
    models[t.model].turns += 1;
    models[t.model].in += t.in || 0;
  }
  const toolCounts = {};
  let toolMs = 0;
  for (const t of tools) {
    toolCounts[t.tool] = (toolCounts[t.tool] || 0) + 1;
    toolMs += t.ms || 0;
  }
  const start = events[0]?.ts ?? 0;
  const end = events[events.length - 1]?.ts ?? start;
  let active = 0;
  for (let i = 1; i < events.length; i++) {
    active += Math.min(events[i].ts - events[i - 1].ts, IDLE_GAP_MS);
  }
  return {
    convId, start, end,
    wallMin: Math.round((end - start) / 60_000),
    activeMin: Math.round(active / 60_000),
    turns: turns.length, peak,
    tokensIn: turns.reduce((s, t) => s + (t.in || 0), 0),
    tokensOut: turns.reduce((s, t) => s + (t.out || 0), 0),
    models, toolCounts, toolMs,
  };
}

function renderSession(s) {
  const models = Object.entries(s.models)
    .map(([m, v]) => `${m} ×${v.turns} (in ${kfmt(v.in)})`).join(', ') || 'none';
  const tools = Object.entries(s.toolCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `${t} ×${c}`).join(', ') || 'none';
  return [
    `# Session metrics — ${s.convId}`,
    `Window: ${new Date(s.start).toISOString()} → ${new Date(s.end).toISOString()} (wall ${s.wallMin} min, active ${s.activeMin} min)`,
    `Turns: ${s.turns} | Tokens: in ${kfmt(s.tokensIn)} / out ${kfmt(s.tokensOut)}`,
    `Peak context: ~${kfmt(s.peak)} tokens`,
    `Models: ${models}`,
    `Tools: ${tools} (total ${(s.toolMs / 1000).toFixed(1)}s)`,
  ].join('\n');
}

function main() {
  let files = [];
  try {
    files = fs.readdirSync(LEDGER_DIR).filter((f) => f.endsWith('.jsonl'));
  } catch { /* dir missing */ }
  if (files.length === 0) {
    console.log('No session data found. The session-ledger hook records as you work — run this again after a real session.');
    process.exit(0);
  }

  const days = Number(opt('days', '7'));
  const cutoff = Date.now() - days * DAY_MS;

  if (flag('aggregate')) {
    const sessions = [];
    for (const f of files) {
      const events = readLedger(path.join(LEDGER_DIR, f)).filter((e) => e.ts >= cutoff);
      if (events.length === 0) continue;
      sessions.push(summarize(f.replace(/\.jsonl$/, ''), events));
    }
    if (sessions.length === 0) {
      console.log(`No session data in the last ${days} days.`);
      process.exit(0);
    }
    const peaks = sessions.map((s) => s.peak).sort((a, b) => a - b);
    const p50 = pctile(peaks, 50);
    const p75 = pctile(peaks, 75);
    const p90 = pctile(peaks, 90);
    const windowTokens = Number(process.env.KO_CONTEXT_WINDOW || 200_000);
    const handoff = Math.round(windowTokens * 0.75);
    const result = {
      sessions: sessions.length, days,
      peakContext: { p50, p75, p90 },
      suggested: { KO_CONTEXT_WARN: p90, KO_CONTEXT_HANDOFF: handoff },
    };
    if (flag('json')) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log([
        `# Session metrics — aggregate`,
        `Sessions: ${result.sessions} (last ${days} days)`,
        `Peak context percentiles: p50 ~${kfmt(p50)} / p75 ~${kfmt(p75)} / p90 ~${kfmt(p90)} tokens`,
        `Suggested calibration: KO_CONTEXT_WARN=${p90} KO_CONTEXT_HANDOFF=${handoff}` +
          ` (warn at your p90, handoff at 75% of the ${kfmt(windowTokens)} window)`,
      ].join('\n'));
    }
    return;
  }

  // single session
  let file;
  if (opt('conv')) {
    file = `${opt('conv')}.jsonl`;
    if (!files.includes(file)) {
      console.log(`No ledger for conversation "${opt('conv')}". Available: ${files.map((f) => f.replace(/\.jsonl$/, '')).join(', ')}`);
      process.exit(0);
    }
  } else {
    // most recent session = most recent event, not file mtime (same-ms writes happen)
    file = files
      .map((f) => {
        const events = readLedger(path.join(LEDGER_DIR, f));
        return { f, last: events[events.length - 1]?.ts ?? 0 };
      })
      .sort((a, b) => b.last - a.last)[0].f;
  }
  const s = summarize(file.replace(/\.jsonl$/, ''), readLedger(path.join(LEDGER_DIR, file)));
  console.log(flag('json') ? JSON.stringify(s, null, 2) : renderSession(s));
}

main();
