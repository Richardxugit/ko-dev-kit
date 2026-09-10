// ko-dev-kit/src/detect.js
import fs from 'fs-extra';
import path from 'path';

// Priority order — also the order rules/AGENTS.md/mcp variants resolve in when
// a repo matches multiple archetypes (e.g. an FE+BE monorepo).
export const ARCHETYPES = ['nestjs-graphql', 'design-system', 'fe-nx'];

/**
 * Detect ALL archetypes a repo matches, with the evidence for each.
 * A monorepo can legitimately be several at once (NestJS API + Nx frontend).
 *
 * @returns {Promise<{ archetype: string, reasons: string[] }[]>}
 */
export async function detectArchetypes(projectDir) {
  const pkg = await readPackageJson(projectDir);
  const deps = pkg ? { ...pkg.dependencies, ...pkg.devDependencies } : {};
  const found = [];
  const nestjs = await nestjsGraphqlReasons(projectDir, deps);
  if (nestjs) found.push({ archetype: 'nestjs-graphql', reasons: nestjs });
  const ds = await designSystemReasons(projectDir, deps);
  if (ds) found.push({ archetype: 'design-system', reasons: ds });
  const fe = await feNxReasons(projectDir, deps);
  if (fe) found.push({ archetype: 'fe-nx', reasons: fe });
  return found;
}

/**
 * Single-archetype convenience wrapper (highest-priority match).
 * Prefer detectArchetypes for anything that scaffolds.
 */
export async function detectArchetype(projectDir) {
  const found = await detectArchetypes(projectDir);
  return found[0]?.archetype ?? null;
}

// @nestjs/core alone is too weak (any repo can carry it transitively) —
// require a second signal: nest-cli.json or the GraphQL integration.
async function nestjsGraphqlReasons(dir, deps) {
  if (!('@nestjs/core' in deps)) return null;
  const reasons = ['@nestjs/core dependency'];
  if (await fs.pathExists(path.join(dir, 'nest-cli.json'))) reasons.push('nest-cli.json');
  if ('@nestjs/graphql' in deps) reasons.push('@nestjs/graphql dependency');
  return reasons.length > 1 ? reasons : null;
}

async function designSystemReasons(dir, deps) {
  const storybookDep = Object.keys(deps).find(d => d.startsWith('@storybook/'));
  if (!('@mui/material' in deps) || !storybookDep) return null;
  if (!await fs.pathExists(path.join(dir, '.storybook'))) return null;
  return ['@mui/material dependency', `${storybookDep} dependency`, '.storybook/ directory'];
}

async function feNxReasons(dir, deps) {
  if (await fs.pathExists(path.join(dir, 'nx.json'))) return ['nx.json'];
  const nxDep = Object.keys(deps).find(d => d.startsWith('@nx/') || d.startsWith('@nrwl/'));
  return nxDep ? [`${nxDep} dependency`] : null;
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
