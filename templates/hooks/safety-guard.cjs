#!/usr/bin/env node
// ko-dev-kit safety hook (Cursor hook protocol).
// Denies destructive shell commands before they run, and names the safe
// alternative so the agent can recover on its own.
// Wired in .cursor/hooks.json to: beforeShellExecution.
//
// Cursor hook contract: receives a JSON event on stdin, writes a JSON decision
// on stdout, exits 0. A "deny" decision blocks the action; anything else allows it.

// [pattern, why it's blocked, safe alternative]
const RULES = [
  [
    /\bgit\s+push\b[^|;&]*\s--force\b(?!\-with\-lease)/,
    'force push rewrites remote history',
    'use --force-with-lease if a force push is truly intended',
  ],
  [
    /\bgit\s+push\b[^|;&]*\s-f\b/,
    'force push rewrites remote history',
    'use --force-with-lease if a force push is truly intended',
  ],
  [
    /\bgit\s+reset\s+--hard\b/,
    'reset --hard discards uncommitted work irreversibly',
    'git stash (or commit to a scratch branch) keeps the work recoverable',
  ],
  [
    /\bgit\s+clean\s+-[a-zA-Z]*f/,
    'git clean -f deletes untracked files irreversibly',
    'git stash -u, or list targets first with git clean -n',
  ],
  [
    /\bgit\s+checkout\s+--/,
    'checkout -- discards uncommitted changes irreversibly',
    'git stash keeps the work recoverable',
  ],
  [
    /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[^|;&]*(\s\/\s*$|\s~|\s\$HOME|\s\.\s*$|\s\*\s*$)/,
    'rm -rf against a broad target can wipe the workspace',
    'delete a specific subdirectory, and prefer moving to /tmp over deleting',
  ],
  [
    /\b(npm|pnpm|yarn)\s+publish\b/,
    'publishing from a local shell bypasses release checks',
    'publish via the repo release workflow / CI',
  ],
];

let raw = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(raw || '{}'); } catch { /* allow on unparseable input */ }

  const ti = input.tool_input || input.toolInput || {};
  const command = input.command ?? ti.command;
  const cmd = command == null ? '' : String(command);

  const hit = cmd ? RULES.find(([re]) => re.test(cmd)) : null;

  if (hit) {
    process.stdout.write(JSON.stringify({
      permission: 'deny',
      userMessage: `Blocked by ko-dev-kit safety hook: "${cmd}" — ${hit[1]}.`,
      agentMessage: `The command "${cmd}" was denied by the safety hook (${hit[1]}). ${hit[2]}. If the user explicitly asked for this exact operation, stop and let them run it themselves.`,
    }));
    process.exit(0);
  }

  process.stdout.write(JSON.stringify({ permission: 'allow' }));
  process.exit(0);
});
