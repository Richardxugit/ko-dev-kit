#!/usr/bin/env node
// ko-dev-kit session-ledger hook (Cursor hook protocol).
// Wired in .cursor/hooks.json to: afterAgentResponse, postToolUse, stop.
//
// Appends an append-only JSONL event stream per conversation to a tmpdir —
// the raw material for `/ko-session-metrics` reports and for calibrating the
// context-usage hook's thresholds from real sessions.
//
// PRIVACY: metadata only — timestamps, token counts, model, tool names,
// durations. Never message content, never file paths, never tool input.
//
// Contract: JSON on stdin, `{}` on stdout, exit 0. The ledger never feeds
// back into the loop; every failure path is silent.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const num = (v) => (/^\d+$/.test(String(v ?? '')) ? Number(v) : null);

const ledgerDir = () => process.env.KO_SESSION_LEDGER_DIR || path.join(os.tmpdir(), 'ko-session-ledger');
const ledgerPath = (conversationId) =>
  path.join(ledgerDir(), `${Buffer.from(String(conversationId || 'default')).toString('base64url')}.jsonl`);

const append = (conversationId, event) => {
  try {
    fs.mkdirSync(ledgerDir(), { recursive: true });
    fs.appendFileSync(ledgerPath(conversationId), JSON.stringify({ ts: Date.now(), ...event }) + '\n');
  } catch { /* ledger is best-effort */ }
};

const finish = () => {
  process.stdout.write('{}');
  process.exit(0);
};

let raw = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(raw || '{}'); } catch { return finish(); }

  try {
    const conv = input.conversation_id;
    switch (input.hook_event_name) {
      case 'afterAgentResponse': {
        const inTok = num(input.input_tokens);
        const outTok = num(input.output_tokens);
        const cr = num(input.cache_read_tokens);
        const cw = num(input.cache_write_tokens);
        if (inTok === null && outTok === null && cr === null && cw === null) break;
        append(conv, {
          t: 'turn', model: input.model || 'unknown',
          in: inTok ?? 0, out: outTok ?? 0, cr: cr ?? 0, cw: cw ?? 0,
        });
        break;
      }
      case 'postToolUse':
        append(conv, { t: 'tool', tool: input.tool_name || 'unknown', ms: num(input.duration) ?? 0 });
        break;
      case 'stop':
        append(conv, { t: 'stop', status: input.status || 'unknown' });
        break;
      default:
        break;
    }
  } catch { /* fail-silent */ }
  finish();
});
