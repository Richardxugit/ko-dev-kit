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
const prompt = (ts, command = null) => JSON.stringify({ t: 'prompt', ts, command });
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

  it('keeps old ledgers in one unattributed segment', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-report-'));
    mkLedger(dir, 'old', [turn(NOW - HOUR, 12_000), tool(NOW - HOUR + 1000, 'Read', 20)]);
    const result = JSON.parse(runReport(['--ledger-dir', dir, '--conv', 'old', '--json']));
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]).toMatchObject({
      command: 'unattributed', turns: 1, tokensIn: 12_000, tokensOut: 100,
      peak: 12_000, toolCounts: { Read: 1 },
    });
  });

  it('segments commands, follow-ups, nested work, stops, repeats and malformed lines', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-report-'));
    const t = NOW - 8 * HOUR;
    mkLedger(dir, 'segments', [
      prompt(t, null), turn(t + 1000, 1_000), tool(t + 2000, 'Read', 10),
      prompt(t + 3000, 'ko-feature'), turn(t + 4000, 2_000, 'fast'), tool(t + 5000, 'Grep', 20),
      prompt(t + 6000, null), turn(t + 7000, 3_000, 'fast'), tool(t + 8000, 'Task', 30), stop(t + 9000),
      prompt(t + 10_000, 'ko-feature'), turn(t + 11_000, 4_000, 'fast'), tool(t + 12_000, 'Shell', 40),
      prompt(t + 12_500, 'ko-feature'),
      'NOT JSON',
      prompt(t + 13_000, 'ko-review'), turn(t + 14_000, 5_000, 'claude-sonnet'), stop(t + 15_000),
    ]);
    const result = JSON.parse(runReport(['--ledger-dir', dir, '--conv', 'segments', '--json']));
    expect(result.segments.map((s) => s.command)).toEqual([
      'unattributed', 'ko-feature', 'ko-feature', 'ko-feature', 'ko-review',
    ]);
    expect(result.segments[0]).toMatchObject({ turns: 1, tokensIn: 1_000, toolCounts: { Read: 1 } });
    expect(result.segments[1]).toMatchObject({
      turns: 2, tokensIn: 5_000, tokensOut: 200, peak: 3_000,
      models: { fast: { turns: 2, in: 5_000 } }, toolCounts: { Grep: 1, Task: 1 },
    });
    expect(result.segments[2]).toMatchObject({ turns: 1, tokensIn: 4_000, toolCounts: { Shell: 1 } });
    expect(result.segments[3]).toMatchObject({ turns: 0, tokensIn: 0, tokensOut: 0, toolCounts: {} });
    expect(result.segments[4]).toMatchObject({ turns: 1, tokensIn: 5_000 });

    const text = runReport(['--ledger-dir', dir, '--conv', 'segments']);
    expect(text).toContain('Command-led segments (not exact billing)');
    expect(text).toMatch(/ko-feature: 2 turns/);
    expect(text).toMatch(/ko-feature: 2 turns .*Models: fast ×2 .*Tools: Grep ×1, Task ×1/);
    expect(text).not.toMatch(/estimated.*cost|dollars?|\$\d/i);

    const aggregate = JSON.parse(runReport(['--ledger-dir', dir, '--aggregate', '--json']));
    const feature = aggregate.commands.find((c) => c.command === 'ko-feature');
    expect(feature).toMatchObject({
      segments: 3, turns: 3, tokensIn: 9_000, tokensOut: 300, toolCalls: 3,
      peakContext: { p50: 3_000, p75: 4_000, p90: 4_000 },
    });
    expect(aggregate.commands.find((c) => c.command === 'unattributed')).toMatchObject({ segments: 1, turns: 1 });
    const aggregateText = runReport(['--ledger-dir', dir, '--aggregate']);
    expect(aggregateText).toContain('Command-led segments (not exact billing)');
    expect(aggregateText).toMatch(/ko-feature: 3 segments/);
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

  it('retains command attribution from before the cutoff but excludes old usage', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-report-'));
    mkLedger(dir, 'window', [
      prompt(NOW - 2 * 24 * HOUR, 'ko-feature'),
      turn(NOW - 2 * 24 * HOUR + 1000, 200_000, 'slow'),
      prompt(NOW - 25 * HOUR, null),
      turn(NOW - HOUR, 90_000, 'fast'), tool(NOW - HOUR + 1000, 'Grep', 20), stop(NOW - HOUR + 2000),
    ]);
    mkLedger(dir, 'ancient', [prompt(NOW - 30 * 24 * HOUR, 'ko-review'), turn(NOW - 29 * 24 * HOUR, 10_000)]);
    const result = JSON.parse(runReport(['--ledger-dir', dir, '--aggregate', '--days', '1', '--json']));
    expect(result.sessions).toBe(1);
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0]).toMatchObject({
      command: 'ko-feature', segments: 1, turns: 1, tokensIn: 90_000, tokensOut: 100,
      toolCalls: 1, peakContext: { p50: 90_000, p75: 90_000, p90: 90_000 },
    });
    expect(JSON.stringify(result)).not.toContain('200000');
    expect(JSON.stringify(result)).not.toContain('slow');
  });
});
