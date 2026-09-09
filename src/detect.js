// ko-dev-kit/src/detect.js
import fs from 'fs-extra';
import path from 'path';

export const ARCHETYPES = ['nestjs-graphql', 'design-system', 'fe-nx'];

export async function detectArchetype(projectDir) {
  const pkg = await readPackageJson(projectDir);
  const deps = pkg ? { ...pkg.dependencies, ...pkg.devDependencies } : {};
  if (isNestjsGraphql(deps)) return 'nestjs-graphql';
  if (isDesignSystem(deps)) return 'design-system';
  if (await isFeNx(projectDir, deps)) return 'fe-nx';
  return null;
}

function isNestjsGraphql(deps) {
  return '@nestjs/core' in deps;
}

function isDesignSystem(deps) {
  const hasMui = '@mui/material' in deps;
  const hasStorybook = Object.keys(deps).some(d => d.startsWith('@storybook/'));
  return hasMui && hasStorybook;
}

async function isFeNx(dir, deps) {
  if (await fs.pathExists(path.join(dir, 'nx.json'))) return true;
  return Object.keys(deps).some(d => d.startsWith('@nx/') || d.startsWith('@nrwl/'));
}

async function readPackageJson(dir) {
  const pkgPath = path.join(dir, 'package.json');
  if (!await fs.pathExists(pkgPath)) return null;
  try {
    return await fs.readJson(pkgPath);
  } catch {
    return null;
  }
}
