#!/usr/bin/env node
// ko-dev-kit context-usage hook (Cursor hook protocol).
// Wired in .cursor/hooks.json to: afterAgentResponse (record) + postToolUse (warn).
//
// Cursor auto-summarizes the conversation when it hits the context window — and
// the summary silently drops things. This hook warns BEFORE that cliff, at two
// levels, so the decision happens at a phase boundary instead of mid-edit.
//
// Data path: Cursor's afterAgentResponse event carries the turn's token usage
// (input + cache read + cache write ≈ current context size). This hook stores
// the latest reading per conversation; postToolUse checks it and emits
// additional_context once per level. The level re-arms when context drops
// (e.g. after /summarize).
//
// Thresholds are fractions of the assumed window because Cursor model windows
// vary (~200K default here): KO_CONTEXT_WINDOW / KO_CONTEXT_WARN /
// KO_CONTEXT_HANDOFF override (tokens); KO_CONTEXT_BUDGET=off disables.
// Recalibrate the defaults once real session data says where p90 lives.
//
// Contract: JSON on stdin, JSON on stdout, exit 0. Never blocks; every failure
// path is silent.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const num = (v) => (/^\d+$/.test(v || '') ? Number(v) : null);
const windowTokens = () => num(process.env.KO_CONTEXT_WINDOW) ?? 200_000;
const thresholds = () => ({
  warn: num(process.env.KO_CONTEXT_WARN) ?? Math.round(windowTokens() * 0.5),
  handoff: num(process.env.KO_CONTEXT_HANDOFF) ?? Math.round(windowTokens() * 0.75),
});

const finish = (obj) => {
  process.stdout.write(JSON.stringify(obj || {}));
  process.exit(0);
};

const stateDir = () => process.env.KO_CONTEXT_STATE_DIR || path.join(os.tmpdir(), 'ko-context-usage');
const statePath = (conversationId) =>
  path.join(stateDir(), `${Buffer.from(String(conversationId || 'default')).toString('base64url')}.json`);

const readState = (conversationId) => {
  try { return JSON.parse(fs.readFileSync(statePath(conversationId), 'utf-8')); } catch { return null; }
};
const writeState = (conversationId, state) => {
  try {
    fs.mkdirSync(stateDir(), { recursive: true });
    fs.writeFileSync(statePath(conversationId), JSON.stringify(state));
  } catch { /* best-effort */ }
};

const levelFor = (tokens) => {
  const t = thresholds();
  if (tokens >= t.handoff) return 'handoff';
  if (tokens >= t.warn) return 'warn';
  return null;
};

let raw = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    main(JSON.parse(raw || '{}'));
  } catch {
    finish({});
  }
});

function main(input) {
  const event = input.hook_event_name;
  if (event === 'afterAgentResponse') return record(input);
  if (event === 'postToolUse') return check(input);
  return finish({});
}

// afterAgentResponse has no documented feedback channel — it only records.
function record(input) {
  const tokens =
    (num(input.input_tokens) ?? 0) +
    (num(input.cache_read_tokens) ?? 0) +
    (num(input.cache_write_tokens) ?? 0);
  if (tokens <= 0) return finish({});
  const conv = input.conversation_id;
  const prev = readState(conv) || { fired: [] };
  // re-arm any level the current context has dropped back below
  const t = thresholds();
  const fired = (prev.fired || []).filter((l) => tokens >= (l === 'handoff' ? t.handoff : t.warn));
  writeState(conv, { tokens, model: input.model || 'unknown', fired });
  finish({});
}

function check(input) {
  if (process.env.KO_CONTEXT_BUDGET === 'off') return finish({});
  const conv = input.conversation_id;
  const state = readState(conv);
  if (!state || !state.tokens) return finish({});

  const level = levelFor(state.tokens);
  if (!level) return finish({});
  const fired = state.fired || [];
  if (fired.includes(level)) return finish({}); // already said it — silence beats nagging

  writeState(conv, { ...state, fired: [...fired, level] });

  const pct = Math.round((state.tokens / windowTokens()) * 100);
  const size = `~${Math.round(state.tokens / 1000)}K tokens (${pct}% of the assumed ${Math.round(windowTokens() / 1000)}K window)`;
  const body =
    level === 'handoff'
      ? `context-usage: last turn carried ${size}. Cursor will auto-summarize soon and may drop early context silently. Wrap up at the next phase boundary: /summarize, or start a fresh session with artifacts on disk. Do not stop mid-edit.`
      : `context-usage: last turn carried ${size}. Every later turn re-reads that context and attention thins as it grows. At the next phase boundary, consider /summarize or wrapping up — decide there, not mid-edit. Set KO_CONTEXT_WINDOW if this model's window differs.`;
  finish({ additional_context: body });
}
