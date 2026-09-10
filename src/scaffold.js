// ko-dev-kit/src/scaffold.js
import path from 'path';
import * as engine from './scaffold-core/index.js';

// Every dev-kit archetype (fe-nx, nestjs-graphql, design-system) is exactly
// what used to be GENERIC_ARCHETYPES — so a resource unlisted here is
// installed for all 3, matching the old "generic dev-workflow" behavior
// without needing to enumerate it.
export const ARCHETYPE_RESOURCES = {
  rules: {
    'fe-nx': ['fe-nx'],
    'nestjs-graphql': ['nestjs-graphql'],
    'design-system': ['design-system'],
  },
  agents: {
    'frontend-developer': ['fe-nx'],
    'backend-developer': ['nestjs-graphql'],
    'design-system-engineer': ['design-system'],
  },
  commands: {
    'ko-ds-component': ['design-system'],
    'ko-lib-package': ['fe-nx'],
    'ko-svc-lambda': ['nestjs-graphql'],
    'ko-svc-nest-app': ['nestjs-graphql'],
    'ko-svc-lib': ['nestjs-graphql'],
    // Excluded from design-system too (overkill for component-focused workflow):
    'ko-feature': ['fe-nx', 'nestjs-graphql'],
    'ko-implement': ['fe-nx', 'nestjs-graphql'],
    'ko-knowledge-gen': ['fe-nx', 'nestjs-graphql'],
  },
  skills: {
    'nx-monorepo': ['fe-nx'],
    'ts-react-patterns': ['fe-nx'],
    'nextjs-app-router': ['fe-nx'],
    'nextjs-pages-router': ['fe-nx'],
    'pact-contract-testing': ['fe-nx', 'nestjs-graphql'],
    'wcag-2.2-aa': ['fe-nx', 'design-system'],
    'nestjs-patterns': ['nestjs-graphql'],
    'graphql-apollo': ['nestjs-graphql'],
    'apollo-federation': ['nestjs-graphql'],
    'serverless-nestjs': ['nestjs-graphql'],
    'unit-of-work': ['fe-nx', 'nestjs-graphql'],
    'storybook': ['design-system'],
    'mui-theming': ['design-system'],
    'component-api-design': ['design-system'],
    'multi-brand-theming': ['design-system'],
  },
};

export const MANIFEST_REL_PATH = path.join('.cursor', '.ko-dev-kit-manifest.json');

export const getCommandEntries = (templateDir) => engine.getCommandEntries(templateDir);

export const scaffoldProject = (projectDir, archetype, templateDir, options) =>
  engine.scaffoldProject(projectDir, archetype, templateDir, ARCHETYPE_RESOURCES, options);

export const pruneProject = (projectDir, archetype, templateDir) =>
  engine.pruneProject(projectDir, archetype, templateDir, ARCHETYPE_RESOURCES);

export const { installResource, listAvailableResources, getMcpSuggestions } = engine;

export const uninstallResource = (projectDir, type, name, templateDir) =>
  engine.uninstallResource(projectDir, type, name, templateDir, MANIFEST_REL_PATH);
