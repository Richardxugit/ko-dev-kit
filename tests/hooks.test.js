// ko-dev-kit/tests/hooks.test.js
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
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

describe('edit-lint.cjs', () => {
  const mkFixture = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-edit-lint-'));
    const binDir = path.join(dir, 'node_modules', 'eslint', 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(
      path.join(binDir, 'eslint.js'),
      `if (process.env.FAKE_ESLINT_CRASH) { console.log('Oops! Something went wrong!'); process.exit(2); }
process.stdout.write(process.env.FAKE_ESLINT_JSON || '[]');
process.exit(Number(process.env.FAKE_ESLINT_EXIT || 0));
`,
    );
    const file = path.join(dir, 'src', 'app.ts');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'const x = 1;\n');
    return { dir, file };
  };
  const runLint = (payload, env = {}, stateDir) => {
    const out = execFileSync('node', [path.join(hooksDir, 'edit-lint.cjs')], {
      input: JSON.stringify(payload),
      encoding: 'utf-8',
      env: {
        ...process.env,
        ...env,
        KO_EDIT_LINT_STATE_DIR: stateDir || fs.mkdtempSync(path.join(os.tmpdir(), 'ko-lint-state-')),
      },
    });
    return JSON.parse(out);
  };
  const reportWithError = (file) => JSON.stringify([{
    filePath: file,
    messages: [
      { severity: 2, line: 1, column: 7, ruleId: 'no-unused-vars', message: "'x' is assigned a value but never used." },
      { severity: 1, line: 1, column: 1, ruleId: 'warn-only', message: 'warning ignored' },
    ],
  }]);

  it('feeds eslint errors back as additional_context', () => {
    const { dir, file } = mkFixture();
    const decision = runLint(
      { tool_name: 'Write', tool_input: { file_path: file } },
      { CURSOR_PROJECT_DIR: dir, FAKE_ESLINT_JSON: reportWithError(file), FAKE_ESLINT_EXIT: '1' },
    );
    expect(decision.additional_context).toContain('edit-lint:');
    expect(decision.additional_context).toContain('no-unused-vars');
    expect(decision.additional_context).not.toContain('warn-only'); // errors only
  });

  it('says nothing when the file is clean', () => {
    const { dir, file } = mkFixture();
    const decision = runLint(
      { tool_name: 'Write', tool_input: { file_path: file } },
      { CURSOR_PROJECT_DIR: dir, FAKE_ESLINT_JSON: JSON.stringify([{ filePath: file, messages: [] }]) },
    );
    expect(decision.additional_context).toBeUndefined();
  });

  it('ignores non-TS/JS files', () => {
    const { dir } = mkFixture();
    const decision = runLint(
      { tool_name: 'Write', tool_input: { file_path: path.join(dir, 'README.md') } },
      { CURSOR_PROJECT_DIR: dir },
    );
    expect(decision.additional_context).toBeUndefined();
  });

  it('stays silent when the project has no eslint', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-no-eslint-'));
    const decision = runLint(
      { tool_name: 'Write', tool_input: { file_path: path.join(dir, 'a.ts') } },
      { CURSOR_PROJECT_DIR: dir },
    );
    expect(decision.additional_context).toBeUndefined();
  });

  it('stays silent when eslint crashes (fail-open + fail-silent)', () => {
    const { dir, file } = mkFixture();
    const decision = runLint(
      { tool_name: 'Write', tool_input: { file_path: file } },
      { CURSOR_PROJECT_DIR: dir, FAKE_ESLINT_CRASH: '1' },
    );
    expect(decision.additional_context).toBeUndefined();
  });

  it('cooldown: same file edited twice in a burst lints once', () => {
    const { dir, file } = mkFixture();
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-lint-state-'));
    const env = { CURSOR_PROJECT_DIR: dir, FAKE_ESLINT_JSON: reportWithError(file), FAKE_ESLINT_EXIT: '1' };
    const payload = { tool_name: 'Write', tool_input: { file_path: file } };
    const first = runLint(payload, env, stateDir);
    const second = runLint(payload, env, stateDir);
    expect(first.additional_context).toBeTruthy();
    expect(second.additional_context).toBeUndefined();
  });

  it('handles events with no recognizable file path', () => {
    const { dir } = mkFixture();
    expect(runLint({ tool_name: 'Write', tool_input: {} }, { CURSOR_PROJECT_DIR: dir }).additional_context).toBeUndefined();
    expect(runLint({}, { CURSOR_PROJECT_DIR: dir }).additional_context).toBeUndefined();
  });

  it('exits 0 with empty JSON on unparseable stdin', () => {
    const out = execFileSync('node', [path.join(hooksDir, 'edit-lint.cjs')], {
      input: 'not json',
      encoding: 'utf-8',
    });
    expect(JSON.parse(out)).toEqual({});
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
