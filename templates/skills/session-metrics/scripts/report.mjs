#!/usr/bin/env node
// report.mjs — aggregate ko-dev-kit session ledgers into a metrics report.
//
// Usage:
//   node report.mjs [--ledger-dir DIR] [--conv ID]   single session (default: most recent)
//   node report.mjs [--ledger-dir DIR] --aggregate [--days N]
//   node report.mjs ... --json                        machine-readable output
//
// Ledgers are JSONL written by the session-ledger hook: one event per line,
// { ts, t: 'prompt'|'turn'|'tool'|'stop', ... }. Malformed lines are skipped — a
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

// Attribution is reconstructed from full history before any aggregate window
// is applied. A non-command prompt or stop never ends the active command.
function segmentEvents(events) {
  const segments = [];
  let current;
  for (const event of events) {
    if (event.t === 'prompt' && event.command) {
      current = { command: event.command, events: [] };
      segments.push(current);
    } else if (!current) {
      current = { command: 'unattributed', events: [] };
      segments.push(current);
    }
    current.events.push(event);
  }
  return segments;
}

function summarizeSegment(segment) {
  const { convId, ...summary } = summarize(segment.command, segment.events);
  return { command: segment.command, ...summary };
}

const toolCallCount = (toolCounts) => Object.values(toolCounts).reduce((sum, count) => sum + count, 0);

function groupCommands(segments) {
  const groups = new Map();
  for (const segment of segments) {
    if (!groups.has(segment.command)) groups.set(segment.command, []);
    groups.get(segment.command).push(segment);
  }
  return [...groups.entries()].map(([command, items]) => {
    const peaks = items.map((item) => item.peak).sort((a, b) => a - b);
    return {
      command,
      segments: items.length,
      turns: items.reduce((sum, item) => sum + item.turns, 0),
      tokensIn: items.reduce((sum, item) => sum + item.tokensIn, 0),
      tokensOut: items.reduce((sum, item) => sum + item.tokensOut, 0),
      toolCalls: items.reduce((sum, item) => sum + toolCallCount(item.toolCounts), 0),
      peakContext: { p50: pctile(peaks, 50), p75: pctile(peaks, 75), p90: pctile(peaks, 90) },
    };
  });
}

function renderSession(s) {
  const models = Object.entries(s.models)
    .map(([m, v]) => `${m} ×${v.turns} (in ${kfmt(v.in)})`).join(', ') || 'none';
  const tools = Object.entries(s.toolCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `${t} ×${c}`).join(', ') || 'none';
  const lines = [
    `# Session metrics — ${s.convId}`,
    `Window: ${new Date(s.start).toISOString()} → ${new Date(s.end).toISOString()} (wall ${s.wallMin} min, active ${s.activeMin} min)`,
    `Turns: ${s.turns} | Tokens: in ${kfmt(s.tokensIn)} / out ${kfmt(s.tokensOut)}`,
    `Peak context: ~${kfmt(s.peak)} tokens`,
    `Models: ${models}`,
    `Tools: ${tools} (total ${(s.toolMs / 1000).toFixed(1)}s)`,
  ];
  if (s.segments.length > 0) {
    lines.push('', 'Command-led segments (not exact billing):');
    for (const segment of s.segments) {
      const segmentModels = Object.entries(segment.models)
        .map(([m, v]) => `${m} ×${v.turns} (in ${kfmt(v.in)})`).join(', ') || 'none';
      const segmentTools = Object.entries(segment.toolCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([t, c]) => `${t} ×${c}`).join(', ') || 'none';
      lines.push(`${segment.command}: ${segment.turns} turns | Tokens: in ${kfmt(segment.tokensIn)} / out ${kfmt(segment.tokensOut)} | Peak: ~${kfmt(segment.peak)} | Models: ${segmentModels} | Tools: ${segmentTools} | Tool calls: ${toolCallCount(segment.toolCounts)}`);
    }
  }
  return lines.join('\n');
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
    const commandSegments = [];
    for (const f of files) {
      const allEvents = readLedger(path.join(LEDGER_DIR, f));
      const events = allEvents.filter((e) => e.ts >= cutoff);
      if (events.length === 0) continue;
      sessions.push(summarize(f.replace(/\.jsonl$/, ''), events));
      for (const segment of segmentEvents(allEvents)) {
        const clipped = { ...segment, events: segment.events.filter((e) => e.ts >= cutoff) };
        if (clipped.events.length > 0) commandSegments.push(summarizeSegment(clipped));
      }
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
      commands: groupCommands(commandSegments),
    };
    if (flag('json')) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const lines = [
        `# Session metrics — aggregate`,
        `Sessions: ${result.sessions} (last ${days} days)`,
        `Peak context percentiles: p50 ~${kfmt(p50)} / p75 ~${kfmt(p75)} / p90 ~${kfmt(p90)} tokens`,
        `Suggested calibration: KO_CONTEXT_WARN=${p90} KO_CONTEXT_HANDOFF=${handoff}` +
          ` (warn at your p90, handoff at 75% of the ${kfmt(windowTokens)} window)`,
      ];
      if (result.commands.length > 0) {
        lines.push('', 'Command-led segments (not exact billing):');
        for (const command of result.commands) {
          lines.push(`${command.command}: ${command.segments} segments | Turns: ${command.turns} | Tokens: in ${kfmt(command.tokensIn)} / out ${kfmt(command.tokensOut)} | Tool calls: ${command.toolCalls} | Peak p50/p75/p90: ~${kfmt(command.peakContext.p50)}/${kfmt(command.peakContext.p75)}/${kfmt(command.peakContext.p90)}`);
        }
      }
      console.log(lines.join('\n'));
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
  const events = readLedger(path.join(LEDGER_DIR, file));
  const s = summarize(file.replace(/\.jsonl$/, ''), events);
  s.segments = segmentEvents(events).map(summarizeSegment);
  console.log(flag('json') ? JSON.stringify(s, null, 2) : renderSession(s));
}

main();
