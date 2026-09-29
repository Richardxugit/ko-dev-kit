// ko-dev-kit/tests/export.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractDependencies, exportPlugin, exportCommand } from '../src/scaffold-core/export.js';
import { ARCHETYPE_RESOURCES } from '../src/scaffold.js';

const templateDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates');
let outDir;

beforeEach(async () => { outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ko-export-')); });
afterEach(async () => { await fs.remove(outDir); });

const AUTHOR = { name: 'Test Author', email: 'test@example.com' };
const CORE_COMMANDS = ['ko-onboard', 'ko-spike', 'ko-feature', 'ko-bugfix', 'ko-test',
  'ko-review', 'ko-verify', 'ko-fix-review', 'ko-pr-desc', 'ko-implement'];

describe('extractDependencies', () => {
  it('unions frontmatter deps with skill paths cited in the body', () => {
    const content = [
      '---',
      'name: ko-verify',
      'description: x',
      'skills-optional: [wcag-2.2-aa]',
      '---',
      '',
      'Read `.cursor/skills/workflow-refs/references/verify-baseline.md` before running.',
    ].join('\n');
    const deps = extractDependencies(content);
    expect(deps.skills).toContain('wcag-2.2-aa');
    expect(deps.skills).toContain('workflow-refs');
  });
});

describe('exportPlugin', () => {
  const base = () => ({
    name: 'ko-dev', commands: CORE_COMMANDS, templateDir, outputDir: outDir,
    resourceMap: ARCHETYPE_RESOURCES, author: AUTHOR, description: 'Dev workflow',
    keywords: ['sdlc', 'tdd'], tags: ['dev'],
  });

  it('emits a marketplace-shaped plugin.json', async () => {
    await exportPlugin(base());
    const manifest = await fs.readJson(path.join(outDir, 'ko-dev', '.cursor-plugin', 'plugin.json'));
    expect(manifest).toMatchObject({
      name: 'ko-dev', version: '1.0.0', license: 'MIT',
      author: AUTHOR,
      commands: './commands/', agents: './agents/', skills: './skills/', rules: './rules/',
      hooks: './hooks.json', mcpServers: './mcp.json',
    });
    expect(typeof manifest.displayName).toBe('string');
    expect(manifest.keywords).toEqual(['sdlc', 'tdd']);
    expect(manifest.tags).toEqual(['dev']);
  });

  it('bundles hooks with plugin-relative wiring in hooks.json', async () => {
    await exportPlugin(base());
    const dir = path.join(outDir, 'ko-dev');
    expect(await fs.pathExists(path.join(dir, 'hooks', 'safety-guard.cjs'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, 'hooks', 'destructive-rules.json'))).toBe(true);
    const wiring = await fs.readJson(path.join(dir, 'hooks.json'));
    const commands = Object.values(wiring.hooks).flat().map((h) => h.command);
    expect(commands.length).toBeGreaterThan(0);
    expect(commands.every((c) => c.startsWith('node ./hooks/'))).toBe(true);
  });

  it('rewrites project-scope skill references inside exported markdown', async () => {
    await exportPlugin(base());
    const verify = await fs.readFile(path.join(outDir, 'ko-dev', 'commands', 'ko-verify.md'), 'utf-8');
    expect(verify).not.toContain('.cursor/skills/');
    expect(verify).toContain('skills/workflow-refs/references/verify-baseline.md');
  });

  it('pulls workflow-refs even though commands only cite it in body text', async () => {
    const result = await exportPlugin(base());
    expect(result.exported).toContain('skills/workflow-refs/');
    expect(result.missing).not.toContain('skills/workflow-refs');
  });

  it('emits an MIT LICENSE by default and honours license option', async () => {
    await exportPlugin(base());
    const license = await fs.readFile(path.join(outDir, 'ko-dev', 'LICENSE'), 'utf-8');
    expect(license).toContain('MIT License');
    const manifest = await fs.readJson(path.join(outDir, 'ko-dev', '.cursor-plugin', 'plugin.json'));
    expect(manifest.license).toBe('MIT');
  });

  it('mcp.json: purely-shared commands ship atlassian; archetype-owned ones add their servers', async () => {
    await exportPlugin({ ...base(), commands: ['ko-onboard', 'ko-pr-desc'] }); // unlisted in resourceMap → shared
    let mcp = await fs.readJson(path.join(outDir, 'ko-dev', 'mcp.json'));
    expect(Object.keys(mcp.mcpServers)).toEqual(['atlassian']);

    await exportPlugin({ ...base(), name: 'fe-pack', commands: ['ko-lib-package'] }); // fe-nx only
    mcp = await fs.readJson(path.join(outDir, 'fe-pack', 'mcp.json'));
    expect(Object.keys(mcp.mcpServers).sort()).toEqual(['atlassian', 'figma']);
  });

  it('hooks: false omits the hooks folder and manifest key', async () => {
    await exportPlugin({ ...base(), name: 'lean', hooks: false });
    const manifest = await fs.readJson(path.join(outDir, 'lean', '.cursor-plugin', 'plugin.json'));
    expect(manifest.hooks).toBeUndefined();
    expect(await fs.pathExists(path.join(outDir, 'lean', 'hooks'))).toBe(false);
  });

  it('omitting author leaves the key out (schema-valid) instead of inventing one', async () => {
    const opts = base(); delete opts.author;
    await exportPlugin(opts);
    const manifest = await fs.readJson(path.join(outDir, 'ko-dev', '.cursor-plugin', 'plugin.json'));
    expect('author' in manifest).toBe(false);
  });
});

describe('exportCommand --plugin', () => {
  it('single-command bundle gets the marketplace manifest shape too', async () => {
    await exportCommand('ko-pr-desc', templateDir, outDir, { plugin: true, author: AUTHOR });
    const manifest = await fs.readJson(path.join(outDir, 'ko-pr-desc', '.cursor-plugin', 'plugin.json'));
    expect(manifest).toMatchObject({ name: 'ko-pr-desc', version: '1.0.0', license: 'MIT', author: AUTHOR });
    expect(manifest.commands).toBe('./commands/');
    expect(await fs.pathExists(path.join(outDir, 'ko-pr-desc', 'LICENSE'))).toBe(true);
  });
});
