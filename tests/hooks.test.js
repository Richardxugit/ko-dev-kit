// ko-dev-kit/tests/hooks.test.js
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const templateDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates');
const hooksDir = path.join(templateDir, 'hooks');

const runHook = (hookFile, payload) => {
  const out = execFileSync('node', [path.join(hooksDir, hookFile)], {
    input: JSON.stringify(payload),
    encoding: 'utf-8',
  });
  return JSON.parse(out);
};

describe('safety-guard.cjs', () => {
  const denied = [
    ['git push --force origin main', 'tool_input'],
    ['git push -f origin main', 'tool_input'],
    ['git reset --hard HEAD~1', 'tool_input'],
    ['git clean -fd', 'tool_input'],
    ['git checkout -- src/app.ts', 'tool_input'],
    ['npm publish', 'tool_input'],
    ['pnpm publish', 'tool_input'],
    ['rm -rf ~/', 'tool_input'],
    ['rm -rf .', 'tool_input'],
    ['git push --force origin main', 'command'], // legacy top-level field shape
  ];
  for (const [command, shape] of denied) {
    it(`denies: ${command} (${shape})`, () => {
      const payload = shape === 'tool_input' ? { tool_input: { command } } : { command };
      const decision = runHook('safety-guard.cjs', payload);
      expect(decision.permission).toBe('deny');
      expect(decision.agentMessage).toBeTruthy(); // denial must name a recovery path
    });
  }

  const allowed = [
    'git push --force-with-lease origin main', // lease-guarded force push is the sanctioned escape
    'git push origin main',
    'git status',
    'git checkout -b feat/x',
    'rm -rf node_modules', // scoped target, not broad
    'rm -rf packages/ui/dist',
    'pnpm install',
  ];
  for (const command of allowed) {
    it(`allows: ${command}`, () => {
      const decision = runHook('safety-guard.cjs', { tool_input: { command } });
      expect(decision.permission).toBe('allow');
    });
  }

  it('allows on unparseable stdin (fail-open, same as privacy-block)', () => {
    const out = execFileSync('node', [path.join(hooksDir, 'safety-guard.cjs')], {
      input: 'not json',
      encoding: 'utf-8',
    });
    expect(JSON.parse(out).permission).toBe('allow');
  });

  it('allows events with no command field', () => {
    expect(runHook('safety-guard.cjs', {}).permission).toBe('allow');
  });
});

describe('privacy-block.cjs (regression — wired to one more event)', () => {
  it('still denies likely-secret paths', () => {
    const decision = runHook('privacy-block.cjs', { file_path: '/repo/.env.local' });
    expect(decision.permission).toBe('deny');
  });

  it('allows ordinary files', () => {
    const decision = runHook('privacy-block.cjs', { file_path: '/repo/src/app.ts' });
    expect(decision.permission).toBe('allow');
  });
});

describe('hooks.json consistency', () => {
  const config = JSON.parse(fs.readFileSync(path.join(templateDir, 'settings', 'hooks.json'), 'utf-8'));
  const hookFiles = fs.readdirSync(hooksDir).filter((f) => f.endsWith('.cjs'));
  const referenced = Object.values(config.hooks).flat().map((h) => {
    const m = h.command.match(/\.cursor\/hooks\/(\S+\.cjs)/);
    return m?.[1];
  });

  it('every referenced hook script exists in templates/hooks', () => {
    for (const file of referenced) {
      expect(hookFiles, `hooks.json references missing script: ${file}`).toContain(file);
    }
  });

  it('every hook script is wired at least once', () => {
    for (const file of hookFiles) {
      expect(referenced, `${file} ships but is not wired in hooks.json`).toContain(file);
    }
  });
});
