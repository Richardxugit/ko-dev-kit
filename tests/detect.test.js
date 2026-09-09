import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { detectArchetype, ARCHETYPES } from '../src/detect.js';

describe('detectArchetype', () => {
  let tmpDir;
  beforeEach(async () => { tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devkit-detect-')); });
  afterEach(async () => { await fs.remove(tmpDir); });

  it('exposes exactly the 3 dev archetypes', () => {
    expect(ARCHETYPES).toEqual(['nestjs-graphql', 'design-system', 'fe-nx']);
  });

  it('detects nestjs-graphql from @nestjs/core', async () => {
    await fs.outputJson(path.join(tmpDir, 'package.json'), { dependencies: { '@nestjs/core': '^10.0.0' } });
    expect(await detectArchetype(tmpDir)).toBe('nestjs-graphql');
  });

  it('detects design-system from @mui/material + a @storybook/* package', async () => {
    await fs.outputJson(path.join(tmpDir, 'package.json'), {
      dependencies: { '@mui/material': '^5.0.0' },
      devDependencies: { '@storybook/react': '^7.0.0' },
    });
    expect(await detectArchetype(tmpDir)).toBe('design-system');
  });

  it('detects fe-nx from nx.json', async () => {
    await fs.outputJson(path.join(tmpDir, 'nx.json'), {});
    expect(await detectArchetype(tmpDir)).toBe('fe-nx');
  });

  it('returns null for an unrecognized repo', async () => {
    expect(await detectArchetype(tmpDir)).toBeNull();
  });
});
