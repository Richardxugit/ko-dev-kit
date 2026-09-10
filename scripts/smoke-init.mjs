#!/usr/bin/env node
// Smoke test: run `ko-dev-kit init --archetype <x>` against minimal fixture repos
// and assert the expected .cursor/ file set lands. Used by CI; also runnable locally:
//   node scripts/smoke-init.mjs
import { execFileSync } from 'child_process';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');

const FIXTURES = [
  {
    name: 'fe-nx',
    files: { 'package.json': {}, 'nx.json': {} },
    expect: ['.cursor/rules/fe-nx.mdc', '.cursor/rules/coding-standards.mdc', '.cursor/commands/ko-lib-package.md', 'AGENTS.md'],
    reject: ['.cursor/commands/ko-svc-lib.md', '.cursor/commands/ko-ds-component.md', '.cursor/rules/nestjs-graphql.mdc'],
  },
  {
    name: 'nestjs-graphql',
    files: { 'package.json': { dependencies: { '@nestjs/core': '^10.0.0' } }, 'nest-cli.json': {} },
    expect: ['.cursor/rules/nestjs-graphql.mdc', '.cursor/commands/ko-svc-lib.md', '.cursor/commands/ko-feature.md'],
    reject: ['.cursor/commands/ko-lib-package.md', '.cursor/rules/fe-nx.mdc'],
  },
  {
    name: 'design-system',
    files: {
      'package.json': { dependencies: { '@mui/material': '^6.0.0' }, devDependencies: { '@storybook/react': '^10.0.0' } },
      '.storybook/main.ts': 'export default {};\n',
    },
    expect: ['.cursor/rules/design-system.mdc', '.cursor/commands/ko-ds-component.md'],
    reject: ['.cursor/commands/ko-feature.md', '.cursor/commands/ko-svc-lib.md'],
  },
  {
    name: 'nextjs-app',
    files: { 'package.json': { dependencies: { next: '^15.0.0', react: '^19.0.0' } } },
    expect: ['.cursor/rules/nextjs-app.mdc', '.cursor/commands/ko-feature.md', '.cursor/skills/nextjs-app-router/SKILL.md', '.cursor/agents/frontend-developer.md'],
    reject: ['.cursor/commands/ko-lib-package.md', '.cursor/rules/fe-nx.mdc', '.cursor/rules/react-app.mdc', '.cursor/skills/nx-monorepo/SKILL.md'],
  },
  {
    name: 'react-app',
    files: { 'package.json': { dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' } } },
    expect: ['.cursor/rules/react-app.mdc', '.cursor/commands/ko-spike.md', '.cursor/skills/ts-react-patterns/SKILL.md'],
    reject: ['.cursor/rules/nextjs-app.mdc', '.cursor/skills/nextjs-app-router/SKILL.md', '.cursor/commands/ko-svc-lib.md'],
  },
  {
    name: 'nestjs-graphql,react-app', // React + Nest full-stack repo
    files: { 'package.json': { dependencies: { '@nestjs/core': '^10.0.0', react: '^19.0.0' } }, 'nest-cli.json': {} },
    expect: ['.cursor/rules/nestjs-graphql.mdc', '.cursor/rules/react-app.mdc', '.cursor/commands/ko-svc-lib.md', '.cursor/agents/frontend-developer.md', '.cursor/agents/backend-developer.md'],
    reject: ['.cursor/rules/fe-nx.mdc', '.cursor/commands/ko-ds-component.md'],
  },
  {
    name: 'fe-nx,nestjs-graphql', // multi-archetype monorepo
    files: { 'package.json': { dependencies: { '@nestjs/core': '^10.0.0' } }, 'nest-cli.json': {}, 'nx.json': {} },
    expect: ['.cursor/rules/fe-nx.mdc', '.cursor/rules/nestjs-graphql.mdc', '.cursor/commands/ko-lib-package.md', '.cursor/commands/ko-svc-lib.md'],
    reject: ['.cursor/commands/ko-ds-component.md'],
  },
];

// Manual-tier commands must never be auto-installed, in any fixture.
const MANUAL = ['ko-new-command', 'ko-knowledge-gen', 'ko-pr-desc', 'ko-release-verify'];

let failures = 0;
for (const fixture of FIXTURES) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `ko-smoke-${fixture.name.replace(',', '-')}-`));
  try {
    for (const [rel, content] of Object.entries(fixture.files)) {
      const abs = path.join(dir, rel);
      await fs.ensureDir(path.dirname(abs));
      if (typeof content === 'string') await fs.writeFile(abs, content);
      else await fs.writeJson(abs, content);
    }
    execFileSync('node', [cli, 'init', '--archetype', fixture.name], { cwd: dir, stdio: 'pipe' });
    for (const rel of [...fixture.expect, ...fixture.reject.map(r => `!${r}`), ...MANUAL.map(m => `!.cursor/commands/${m}.md`)]) {
      const negated = rel.startsWith('!');
      const target = negated ? rel.slice(1) : rel;
      const exists = await fs.pathExists(path.join(dir, target));
      const ok = negated ? !exists : exists;
      if (!ok) {
        failures++;
        console.error(`  ✗ ${fixture.name}: ${negated ? 'unexpected' : 'missing'} ${target}`);
      }
    }
    console.log(`  ✓ ${fixture.name}`);
  } finally {
    await fs.remove(dir);
  }
}

if (failures > 0) {
  console.error(`\nsmoke-init: ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log('\nsmoke-init: all fixtures passed');
