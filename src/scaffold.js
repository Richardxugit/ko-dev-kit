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
    'nextjs-app': ['nextjs-app'],
    'react-app': ['react-app'],
  },
  agents: {
    'frontend-developer': ['fe-nx', 'nextjs-app', 'react-app'],
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
    'ko-feature': ['fe-nx', 'nestjs-graphql', 'nextjs-app', 'react-app'],
    'ko-spike': ['fe-nx', 'nestjs-graphql', 'nextjs-app', 'react-app'],
    'ko-implement': ['fe-nx', 'nestjs-graphql', 'nextjs-app', 'react-app'],
  },
  skills: {
    'nx-monorepo': ['fe-nx'],
    'ts-react-patterns': ['fe-nx', 'nextjs-app', 'react-app'],
    'nextjs-app-router': ['fe-nx', 'nextjs-app'],
    'nextjs-pages-router': ['fe-nx', 'nextjs-app'],
    'wcag-2.2-aa': ['fe-nx', 'design-system', 'nextjs-app', 'react-app'],
    'nestjs-patterns': ['nestjs-graphql'],
    'graphql-apollo': ['nestjs-graphql'],
    'apollo-federation': ['nestjs-graphql'],
    'serverless-nestjs': ['nestjs-graphql'],
    'storybook': ['design-system'],
    'mui-theming': ['design-system'],
    'component-api-design': ['design-system'],
    'multi-brand-theming': ['design-system'],
  },
};

export const MANIFEST_REL_PATH = path.join('.cursor', '.ko-dev-kit-manifest.json');

// SDLC periphery — never auto-installed by init; `ko-dev-kit install command <name>`
// adds them on demand. Keep the core loop lean.
export const MANUAL_INSTALL_COMMANDS = ['ko-new-command', 'ko-knowledge-gen', 'ko-pr-desc', 'ko-release-verify'];

export const getCommandEntries = (templateDir) => engine.getCommandEntries(templateDir);

export const scaffoldProject = (projectDir, archetype, templateDir, options) =>
  engine.scaffoldProject(projectDir, archetype, templateDir, ARCHETYPE_RESOURCES, { ...options, manualInstall: MANUAL_INSTALL_COMMANDS });

export const pruneProject = (projectDir, archetype, templateDir) =>
  engine.pruneProject(projectDir, archetype, templateDir, ARCHETYPE_RESOURCES);

export const { installResource, listAvailableResources, getMcpSuggestions } = engine;

export const uninstallResource = (projectDir, type, name, templateDir) =>
  engine.uninstallResource(projectDir, type, name, templateDir, MANIFEST_REL_PATH);
