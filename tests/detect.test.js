import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { detectArchetype, detectArchetypes, ARCHETYPES } from '../src/detect.js';

describe('detectArchetype', () => {
  let tmpDir;
  beforeEach(async () => { tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devkit-detect-')); });
  afterEach(async () => { await fs.remove(tmpDir); });

  it('exposes exactly the 5 dev archetypes', () => {
    expect(ARCHETYPES).toEqual(['nestjs-graphql', 'design-system', 'fe-nx', 'nextjs-app', 'react-app']);
  });

  it('detects nestjs-graphql from @nestjs/core + nest-cli.json', async () => {
    await fs.outputJson(path.join(tmpDir, 'package.json'), { dependencies: { '@nestjs/core': '^10.0.0' } });
    await fs.outputJson(path.join(tmpDir, 'nest-cli.json'), {});
    expect(await detectArchetype(tmpDir)).toBe('nestjs-graphql');
  });

  it('detects nestjs-graphql from @nestjs/core + @nestjs/graphql', async () => {
    await fs.outputJson(path.join(tmpDir, 'package.json'), {
      dependencies: { '@nestjs/core': '^10.0.0', '@nestjs/graphql': '^12.0.0' },
    });
    expect(await detectArchetype(tmpDir)).toBe('nestjs-graphql');
  });

  it('rejects nestjs-graphql on @nestjs/core alone (too weak a signal)', async () => {
    await fs.outputJson(path.join(tmpDir, 'package.json'), { dependencies: { '@nestjs/core': '^10.0.0' } });
    expect(await detectArchetype(tmpDir)).toBeNull();
  });

  it('detects design-system from mui + storybook deps + .storybook/', async () => {
    await fs.outputJson(path.join(tmpDir, 'package.json'), {
      dependencies: { '@mui/material': '^5.0.0' },
      devDependencies: { '@storybook/react': '^7.0.0' },
    });
    await fs.ensureDir(path.join(tmpDir, '.storybook'));
    expect(await detectArchetype(tmpDir)).toBe('design-system');
  });

  it('rejects design-system without a .storybook/ directory', async () => {
    await fs.outputJson(path.join(tmpDir, 'package.json'), {
      dependencies: { '@mui/material': '^5.0.0' },
      devDependencies: { '@storybook/react': '^7.0.0' },
    });
    expect(await detectArchetype(tmpDir)).toBeNull();
  });

  it('detects fe-nx from nx.json', async () => {
    await fs.outputJson(path.join(tmpDir, 'nx.json'), {});
    expect(await detectArchetype(tmpDir)).toBe('fe-nx');
  });

  it('returns null for an unrecognized repo', async () => {
    expect(await detectArchetype(tmpDir)).toBeNull();
  });

  it('detects nextjs-app from the next dependency', async () => {
    await fs.outputJson(path.join(tmpDir, 'package.json'), { dependencies: { next: '^15.0.0', react: '^19.0.0' } });
    expect(await detectArchetype(tmpDir)).toBe('nextjs-app');
  });

  it('detects nextjs-app from next.config alone', async () => {
    await fs.outputFile(path.join(tmpDir, 'next.config.mjs'), 'export default {};\n');
    expect(await detectArchetype(tmpDir)).toBe('nextjs-app');
  });

  it('detects react-app from react without next/nx', async () => {
    await fs.outputJson(path.join(tmpDir, 'package.json'), { dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' } });
    expect(await detectArchetype(tmpDir)).toBe('react-app');
  });

  it('an Nx workspace with a Next.js app is fe-nx, not nextjs-app', async () => {
    await fs.outputJson(path.join(tmpDir, 'package.json'), { dependencies: { next: '^15.0.0', react: '^19.0.0' } });
    await fs.outputJson(path.join(tmpDir, 'nx.json'), {});
    const found = await detectArchetypes(tmpDir);
    expect(found.map(f => f.archetype)).toEqual(['fe-nx']);
  });
});

describe('detectArchetypes (multi-archetype)', () => {
  let tmpDir;
  beforeEach(async () => { tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devkit-detect-multi-')); });
  afterEach(async () => { await fs.remove(tmpDir); });

  it('detects both archetypes in an FE+BE monorepo', async () => {
    await fs.outputJson(path.join(tmpDir, 'package.json'), { dependencies: { '@nestjs/core': '^10.0.0' } });
    await fs.outputJson(path.join(tmpDir, 'nest-cli.json'), {});
    await fs.outputJson(path.join(tmpDir, 'nx.json'), {});
    const found = await detectArchetypes(tmpDir);
    expect(found.map(f => f.archetype)).toEqual(['nestjs-graphql', 'fe-nx']);
  });

  it('returns evidence reasons for each match', async () => {
    await fs.outputJson(path.join(tmpDir, 'package.json'), { dependencies: { '@nestjs/core': '^10.0.0' } });
    await fs.outputJson(path.join(tmpDir, 'nest-cli.json'), {});
    const found = await detectArchetypes(tmpDir);
    expect(found[0].reasons).toContain('nest-cli.json');
    expect(found[0].reasons).toContain('@nestjs/core dependency');
  });

  it('returns an empty array for an unrecognized repo', async () => {
    expect(await detectArchetypes(tmpDir)).toEqual([]);
  });

  it('detects both sides of a React + Nest full-stack repo', async () => {
    await fs.outputJson(path.join(tmpDir, 'package.json'), {
      dependencies: { '@nestjs/core': '^10.0.0', react: '^19.0.0', 'react-dom': '^19.0.0' },
    });
    await fs.outputJson(path.join(tmpDir, 'nest-cli.json'), {});
    const found = await detectArchetypes(tmpDir);
    expect(found.map(f => f.archetype)).toEqual(['nestjs-graphql', 'react-app']);
  });
});
