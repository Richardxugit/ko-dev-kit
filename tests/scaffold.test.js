import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { scaffoldProject, pruneProject } from '../src/scaffold.js';
import { writeManifest } from '../src/scaffold-core/index.js';

const templateDir = path.resolve('templates');
const MANIFEST = path.join('.cursor', '.ko-dev-kit-manifest.json');

describe('scaffoldProject', () => {
  let tmpDir;
  beforeEach(async () => { tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devkit-scaffold-')); });
  afterEach(async () => { await fs.remove(tmpDir); });

  it('installs the union of resources for multiple archetypes', async () => {
    await scaffoldProject(tmpDir, ['nestjs-graphql', 'fe-nx'], templateDir);
    // rules from both archetypes + the shared baseline
    expect(await fs.pathExists(path.join(tmpDir, '.cursor/rules/nestjs-graphql.mdc'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, '.cursor/rules/fe-nx.mdc'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, '.cursor/rules/coding-standards.mdc'))).toBe(true);
    // archetype-gated commands from both sides
    expect(await fs.pathExists(path.join(tmpDir, '.cursor/commands/ko-svc-lib.md'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, '.cursor/commands/ko-lib-package.md'))).toBe(true);
    // design-system resources stay out
    expect(await fs.pathExists(path.join(tmpDir, '.cursor/commands/ko-ds-component.md'))).toBe(false);
    expect(await fs.pathExists(path.join(tmpDir, '.cursor/rules/design-system.mdc'))).toBe(false);
    // skills from both archetypes
    expect(await fs.pathExists(path.join(tmpDir, '.cursor/skills/nestjs-patterns/SKILL.md'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, '.cursor/skills/nx-monorepo/SKILL.md'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, '.cursor/skills/storybook/SKILL.md'))).toBe(false);
  });

  it('overwrites an unmodified rule (hash matches manifest)', async () => {
    await scaffoldProject(tmpDir, ['fe-nx'], templateDir);
    // Manifest must cover every merge-protected file the scaffold installs
    // (rules + hook policy JSON) — a file with no manifest entry reads as
    // user-modified by design.
    const RULES = ['.cursor/rules/coding-standards.mdc', '.cursor/rules/fe-nx.mdc', '.cursor/hooks/destructive-rules.json'];
    const first = await writeManifest(tmpDir, MANIFEST, { kitVersion: '0.0.0', archetypes: ['fe-nx'], files: RULES });
    const result = await scaffoldProject(tmpDir, ['fe-nx'], templateDir, { manifest: first });
    expect(result.updated).toContain('.cursor/rules/coding-standards.mdc');
    expect(result.mergeNeeded).toEqual([]);
    expect(await fs.pathExists(path.join(tmpDir, '.cursor/rules/coding-standards.mdc.kit-update'))).toBe(false);
  });

  it('never clobbers a user-modified rule — writes a .kit-update instead', async () => {
    await scaffoldProject(tmpDir, ['fe-nx'], templateDir);
    const manifest = await writeManifest(tmpDir, MANIFEST, { kitVersion: '0.0.0', archetypes: ['fe-nx'], files: ['.cursor/rules/coding-standards.mdc'] });
    const rulePath = path.join(tmpDir, '.cursor/rules/coding-standards.mdc');
    await fs.appendFile(rulePath, '\n- our house rule\n');
    const result = await scaffoldProject(tmpDir, ['fe-nx'], templateDir, { manifest });
    expect(result.mergeNeeded).toContain('.cursor/rules/coding-standards.mdc');
    expect(result.updated).not.toContain('.cursor/rules/coding-standards.mdc');
    expect(await fs.readFile(rulePath, 'utf-8')).toContain('our house rule');
    expect(await fs.pathExists(`${rulePath}.kit-update`)).toBe(true);
  });

  it('protects a pre-existing rule when there is no manifest entry', async () => {
    const rulePath = path.join(tmpDir, '.cursor/rules/coding-standards.mdc');
    await fs.outputFile(rulePath, 'hand-written rule\n');
    const result = await scaffoldProject(tmpDir, ['fe-nx'], templateDir, { manifest: null });
    expect(result.mergeNeeded).toContain('.cursor/rules/coding-standards.mdc');
    expect(await fs.readFile(rulePath, 'utf-8')).toBe('hand-written rule\n');
  });

  it('prunes only resources matching none of the active archetypes', async () => {
    // simulate a repo that went from single archetype to multi
    await scaffoldProject(tmpDir, ['design-system'], templateDir);
    const result = await pruneProject(tmpDir, ['nestjs-graphql', 'fe-nx'], templateDir);
    expect(result.removed).toContain('.cursor/rules/design-system.mdc');
    expect(await fs.pathExists(path.join(tmpDir, '.cursor/rules/coding-standards.mdc'))).toBe(true);
  });

  it('installs hook scripts AND the hook policy data file', async () => {
    await scaffoldProject(tmpDir, ['fe-nx'], templateDir);
    expect(await fs.pathExists(path.join(tmpDir, '.cursor/hooks/safety-guard.cjs'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, '.cursor/hooks/grep-negative.cjs'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, '.cursor/hooks/destructive-rules.json'))).toBe(true);
  });

  it('hook policy JSON is merge-protected like a rule (team-editable)', async () => {
    await scaffoldProject(tmpDir, ['fe-nx'], templateDir);
    const POLICY = '.cursor/hooks/destructive-rules.json';
    const manifest = await writeManifest(tmpDir, MANIFEST, { kitVersion: '0.0.0', archetypes: ['fe-nx'], files: [POLICY] });
    const policyPath = path.join(tmpDir, POLICY);
    const policy = await fs.readJson(policyPath);
    policy.safeDeleteTargets.push('our-build-out');
    await fs.writeJson(policyPath, policy, { spaces: 2 });
    const result = await scaffoldProject(tmpDir, ['fe-nx'], templateDir, { manifest });
    expect(result.mergeNeeded).toContain(POLICY);
    expect((await fs.readJson(policyPath)).safeDeleteTargets).toContain('our-build-out');
    expect(await fs.pathExists(`${policyPath}.kit-update`)).toBe(true);
  });

  it('hook scripts (.cjs) stay kit-managed: overwritten on re-scaffold', async () => {
    await scaffoldProject(tmpDir, ['fe-nx'], templateDir);
    const GUARD = '.cursor/hooks/safety-guard.cjs';
    const manifest = await writeManifest(tmpDir, MANIFEST, { kitVersion: '0.0.0', archetypes: ['fe-nx'], files: [GUARD] });
    const guardPath = path.join(tmpDir, GUARD);
    await fs.appendFile(guardPath, '// local tweak\n');
    const result = await scaffoldProject(tmpDir, ['fe-nx'], templateDir, { manifest });
    expect(result.updated).toContain(GUARD);
    expect(await fs.readFile(guardPath, 'utf-8')).not.toContain('local tweak');
  });

  it('multi-archetype repos get the UNION of recommended mcp servers', async () => {
    await scaffoldProject(tmpDir, ['nestjs-graphql', 'react-app'], templateDir);
    const mcp = await fs.readJson(path.join(tmpDir, '.cursor', 'mcp.json'));
    // react-app contributes figma, nestjs-graphql contributes atlassian
    expect(Object.keys(mcp.mcpServers).sort()).toEqual(['atlassian', 'figma']);
  });

  it('mcp.json is user-protected (never overwritten)', async () => {
    await scaffoldProject(tmpDir, ['nestjs-graphql'], templateDir);
    const first = await fs.readJson(path.join(tmpDir, '.cursor', 'mcp.json'));
    expect(Object.keys(first.mcpServers)).toEqual(['atlassian']);
    first.mcpServers['my-own'] = { url: 'http://localhost:1234' };
    await fs.writeJson(path.join(tmpDir, '.cursor', 'mcp.json'), first);
    const result = await scaffoldProject(tmpDir, ['react-app'], templateDir);
    const after = await fs.readJson(path.join(tmpDir, '.cursor', 'mcp.json'));
    expect(after.mcpServers['my-own']).toBeDefined();
    expect(result.skipped).toContain('.cursor/mcp.json');
  });

  it('hooks.json: existing install gains NEW kit wiring, user entries untouched', async () => {
    // a repo that scaffolded before grep-negative/context-usage existed
    await scaffoldProject(tmpDir, ['fe-nx'], templateDir);
    const cfgPath = path.join(tmpDir, '.cursor', 'hooks.json');
    const cfg = await fs.readJson(cfgPath);
    cfg.hooks.postToolUse = cfg.hooks.postToolUse.filter(
      (h) => !h.command.includes('grep-negative') && !h.command.includes('context-usage'),
    );
    cfg.hooks.beforeShellExecution.push({ command: 'node .cursor/hooks/my-own-guard.cjs' });
    await fs.writeJson(cfgPath, cfg, { spaces: 2 });

    const result = await scaffoldProject(tmpDir, ['fe-nx'], templateDir);
    const after = await fs.readJson(cfgPath);
    const post = after.hooks.postToolUse.map((h) => h.command);
    expect(post.some((c) => c.includes('grep-negative'))).toBe(true);
    expect(post.some((c) => c.includes('context-usage'))).toBe(true);
    expect(after.hooks.beforeShellExecution.some((h) => h.command.includes('my-own-guard'))).toBe(true);
    expect(result.updated).toContain('.cursor/hooks.json');
  });

  it('hooks.json: a changed kit matcher/timeout syncs on re-scaffold', async () => {
    await scaffoldProject(tmpDir, ['fe-nx'], templateDir);
    const cfgPath = path.join(tmpDir, '.cursor', 'hooks.json');
    const cfg = await fs.readJson(cfgPath);
    const entry = cfg.hooks.postToolUse.find((h) => h.command.includes('grep-negative'));
    entry.timeout = 99; // simulate drift from the template
    await fs.writeJson(cfgPath, cfg, { spaces: 2 });

    await scaffoldProject(tmpDir, ['fe-nx'], templateDir);
    const after = await fs.readJson(cfgPath);
    const synced = after.hooks.postToolUse.find((h) => h.command.includes('grep-negative'));
    const template = await fs.readJson(path.join(templateDir, 'settings', 'hooks.json'));
    const wanted = template.hooks.postToolUse.find((h) => h.command.includes('grep-negative'));
    expect(synced.timeout).toBe(wanted.timeout);
  });

  it('hooks.json: malformed existing file is left untouched (fail safe)', async () => {
    await fs.outputFile(path.join(tmpDir, '.cursor', 'hooks.json'), 'not json {');
    const result = await scaffoldProject(tmpDir, ['fe-nx'], templateDir);
    expect(await fs.readFile(path.join(tmpDir, '.cursor', 'hooks.json'), 'utf-8')).toBe('not json {');
    expect(result.skipped).toContain('.cursor/hooks.json');
  });

  it('hooks.json: byte-identical existing file reports no update', async () => {
    await scaffoldProject(tmpDir, ['fe-nx'], templateDir);
    const result = await scaffoldProject(tmpDir, ['fe-nx'], templateDir);
    expect(result.updated).not.toContain('.cursor/hooks.json');
  });

  it('multi-archetype repos get a minimal AGENTS.md skeleton, not an archetype template', async () => {
    await scaffoldProject(tmpDir, ['nestjs-graphql', 'react-app'], templateDir);
    const agents = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    expect(agents).toContain('multi-archetype repo');
    expect(agents).toContain('nestjs-graphql + react-app');
    expect(agents).toContain('.cursor/rules/react-app.mdc');
    expect(agents).toContain('/ko-onboard');
    // must NOT contain archetype-template content
    expect(agents).not.toContain('Project Type: NestJS');
  });

  it('single-archetype repos still get the archetype AGENTS.md template', async () => {
    await scaffoldProject(tmpDir, ['react-app'], templateDir);
    const agents = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    expect(agents).toContain('Project Type: Standalone React App');
  });

  it('never overwrites an existing AGENTS.md', async () => {
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), 'hand-written\n');
    const result = await scaffoldProject(tmpDir, ['nestjs-graphql', 'react-app'], templateDir);
    expect(await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf-8')).toBe('hand-written\n');
    expect(result.skipped).toContain('AGENTS.md');
  });

  it('does not auto-install manual-tier commands, but they install on demand', async () => {
    const { installResource, MANUAL_INSTALL_COMMANDS } = await import('../src/scaffold.js');
    const result = await scaffoldProject(tmpDir, ['fe-nx'], templateDir);
    for (const cmd of MANUAL_INSTALL_COMMANDS) {
      expect(await fs.pathExists(path.join(tmpDir, '.cursor/commands', `${cmd}.md`)), `${cmd} should not auto-install`).toBe(false);
      expect(result.owned.some(f => f.includes(cmd)), `${cmd} should not be owned by the manifest`).toBe(false);
    }
    const install = await installResource(tmpDir, 'command', 'ko-release-verify', templateDir);
    expect(install.created).toContain('.cursor/commands/ko-release-verify.md');
  });
});
