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
    const RULES = ['.cursor/rules/coding-standards.mdc', '.cursor/rules/fe-nx.mdc'];
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
