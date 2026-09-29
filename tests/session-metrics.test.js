// ko-dev-kit/tests/session-metrics.test.js
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const report = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', 'templates', 'skills', 'session-metrics', 'scripts', 'report.mjs',
);

const NOW = Date.now();
const HOUR = 3_600_000;

const turn = (ts, tokens, model = 'claude-sonnet') =>
  JSON.stringify({ t: 'turn', ts, in: tokens, out: 100, cr: 0, cw: 0, model });
const tool = (ts, name, ms) => JSON.stringify({ t: 'tool', ts, tool: name, ms });
const stop = (ts) => JSON.stringify({ t: 'stop', ts, status: 'completed' });

const mkLedger = (dir, name, lines) => {
  fs.writeFileSync(path.join(dir, `${name}.jsonl`), lines.join('\n') + '\n');
};

const runReport = (args) =>
  execFileSync('node', [report, ...args], { encoding: 'utf-8' });

describe('report.mjs — single session', () => {
  it('summarizes turns, tokens, peak context, models and tools', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-report-'));
    mkLedger(dir, 'aaa', [
      turn(NOW - 3 * HOUR, 10_000),
      tool(NOW - 3 * HOUR + 1000, 'Read', 50),
      tool(NOW - 3 * HOUR + 2000, 'Shell', 150),
      turn(NOW - 2 * HOUR, 42_000, 'gpt-5.5'),
      turn(NOW - 1 * HOUR, 30_000),
      stop(NOW - 1 * HOUR + 5000),
    ]);
    const out = runReport(['--ledger-dir', dir, '--conv', 'aaa']);
    expect(out).toContain('Turns: 3');
    expect(out).toContain('Peak context: ~42.0K tokens');
    expect(out).toContain('claude-sonnet ×2');
    expect(out).toContain('gpt-5.5 ×1');
    expect(out).toContain('Read ×1');
    expect(out).toContain('Shell ×1');
  });

  it('picks the most recent ledger when --conv is omitted', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-report-'));
    mkLedger(dir, 'old', [turn(NOW - 5 * HOUR, 10_000)]);
    mkLedger(dir, 'new', [turn(NOW - 1000, 77_000)]);
    const out = runReport(['--ledger-dir', dir]);
    expect(out).toContain('Peak context: ~77.0K tokens');
  });

  it('prints a clean message and exits 0 on an empty ledger dir', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-report-'));
    const out = runReport(['--ledger-dir', dir]);
    expect(out).toMatch(/no session data/i);
  });

  it('skips malformed ledger lines instead of crashing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-report-'));
    fs.writeFileSync(path.join(dir, 'bad.jsonl'),
      `{"t":"turn","ts":${NOW},"in":5000,"out":1,"cr":0,"cw":0,"model":"m"}\nNOT JSON\n{"t":"tool"}\n`);
    const out = runReport(['--ledger-dir', dir, '--conv', 'bad']);
    expect(out).toContain('Turns: 1');
  });
});

describe('report.mjs — aggregate', () => {
  it('computes peak-context percentiles and suggests thresholds', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-report-'));
    // 4 sessions with peaks 50K / 80K / 100K / 160K
    mkLedger(dir, 's1', [turn(NOW - 4 * HOUR, 50_000), stop(NOW - 3 * HOUR)]);
    mkLedger(dir, 's2', [turn(NOW - 3 * HOUR, 80_000), stop(NOW - 2 * HOUR)]);
    mkLedger(dir, 's3', [turn(NOW - 2 * HOUR, 100_000), stop(NOW - 1 * HOUR)]);
    mkLedger(dir, 's4', [turn(NOW - 1 * HOUR, 160_000), stop(NOW)]);
    const out = runReport(['--ledger-dir', dir, '--aggregate']);
    expect(out).toContain('Sessions: 4');
    expect(out).toMatch(/p50 .?80/);   // 50K,80K,100K,160K → p50 = 80K
    expect(out).toMatch(/p90 .?160/);  // p90 = 160K
    expect(out).toContain('KO_CONTEXT_WARN=160000');
  });

  it('--days excludes sessions older than the window', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-report-'));
    mkLedger(dir, 'recent', [turn(NOW - HOUR, 90_000)]);
    mkLedger(dir, 'ancient', [turn(NOW - 30 * 24 * HOUR, 200_000)]);
    const out = runReport(['--ledger-dir', dir, '--aggregate', '--days', '7']);
    expect(out).toContain('Sessions: 1');
    expect(out).toMatch(/p50 .?90/);
  });
});
