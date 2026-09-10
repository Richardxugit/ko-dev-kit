<!-- ko-dev-kit-template -->
# AGENTS.md

This file provides project context for AI coding agents working in this repository.

## Project Type: Frontend Nx Monorepo

A TypeScript monorepo managed by [Nx](https://nx.dev) with **pnpm** workspaces. It contains
multiple Next.js applications, legacy webpack SPAs, and shared UI packages consumed via
TS path aliases.

## Stack

- **Language:** TypeScript 5.x (`strict` mode)
- **Monorepo:** Nx (project graph, affected, computation caching, NX Cloud)
- **UI:** React 18 + Next.js 15 (Pages Router primary, App Router for /search + /shop in product-discovery-ui) + styled-components 5.x
- **Design system:** `@kmartau/kosmos-ds.react-components` (MUI v4 wrapper)
- **Data:** Apollo Client 3.x (GraphQL), Contentful (CMS), Constructor.io (search)
- **Auth/Features:** Auth0, Optimizely (feature flags), Commercetools (e-commerce)
- **Bundler:** @nx/next (Next.js apps), @nx/webpack (legacy SPAs)
- **Package manager:** pnpm (workspaces, single lockfile)
- **Testing:** Vitest 4 (new tests, `*.vitest.tsx`) + Jest 29 (legacy, `*.test.tsx`) + @testing-library/react + Pact 11 (contract)
- **Lint:** ESLint (airbnb-typescript) + Stylelint + Prettier
- **CI:** Buildkite + NX Cloud

## Repo structure

```
apps/              # deployable applications (Next.js 15 + legacy webpack SPAs)
packages/          # shared UI components, hooks, utilities (PascalCase: Button, Common, Header...)
  <PackageName>/
    src/
      index.ts             # barrel export
      Component.tsx        # implementation
      Component.styled.ts  # styled-components
      Component.stories.tsx
      Component.vitest.tsx
cdk/               # AWS CDK infrastructure (separate project)
scripts/           # operational tools (crypt.js, migrate-jest-to-vi.mjs, etc.)
tools/executors/   # custom NX executors (fetchtypes for GraphQL codegen)
nx.json            # Nx workspace config, target defaults, cache
tsconfig.base.json # ~127 path aliases + strict compiler options
vitest.workspace.ts
```
<!-- run /ko-onboard to fill in actual app names and domains -->

## Commands

```bash
# Install dependencies
pnpm install

# Serve a Next.js app in dev
pnpm nx serve <app-name>

# Build for production
pnpm nx build <app-name>

# Test / lint a single project
pnpm nx test <project-name>
pnpm nx lint <project-name>

# Run only what a change affects (CI)
pnpm nx affected -t build test lint

# GraphQL type generation (MUST run before modifying queries)
pnpm nx fetchtypes <project-name>

# Encrypted env management
node scripts/crypt.js decrypt   # decrypt .env.secret (Ansible Vault)
node scripts/crypt.js encrypt   # re-encrypt after changes

# Visualize the project graph
pnpm nx graph
```
<!-- run /ko-onboard to confirm the real app/project names used above -->

## Conventions

- **Where code lives:** new shared logic goes in `packages/`, not `apps/`. Apps stay thin.
- **Module boundaries:** Convention-only (enforcement is OFF). Apps import packages; packages never import apps; no cross-app imports.
- **Imports:** use TS path aliases from `tsconfig.base.json` (e.g. `@org/Button`), never deep relative paths. Each package exports through `src/index.ts`.
- **Styling:** `Component.styled.ts` with named exports. Import as `import * as S from './Component.styled'`. Use theme values, never hardcoded.
- **Server/Client:** Pages Router is primary (getServerSideProps + getInitialProps). App Router is used only in product-discovery-ui for `/search` and `/shop`.
- **Testing:** New tests → Vitest (`*.vitest.tsx`). Legacy → Jest (`*.test.tsx`).
- **Accessibility:** WCAG 2.2 AA — see the `wcag-2.2-aa` skill.
- **Commits:** `type [KO-XXXX]: short description` (e.g. `feat [KO-1234]: add wishlist page`, header ≤ 72 chars; ticket is a commitlint warning, not an error). Enforced by Husky + commitlint. `npx cz` for interactive commits.
- **Secrets:** Never commit decrypted `.env.secret`. Use `scripts/crypt.js` for local env management.

## Kit commands (/ko-*)

Installed by ko-dev-kit. Core loop:

| Command | Purpose |
|---------|---------|
| `/ko-feature <name>` | New feature → brainstorm → spec → plan → implement → verify |
| `/ko-spike <question>` | Timeboxed throwaway experiment → findings + go/no-go (never merges) |
| `/ko-implement [plan]` | Resume/execute a plan from `.cursor/specs/` |
| `/ko-bugfix <desc>` | Systematic debugging → root-cause fix → regression test → verify |
| `/ko-test <target>` | Generate tests appropriate to the file/stack |
| `/ko-review [--team]` | Review the diff; `--team` = multi-specialist pass with verdict |
| `/ko-fix-review <PR>` | Fix review findings (kit + human + BugBot comments) in a fresh session |
| `/ko-verify` | Build/lint/type/tests + QA report |
| `/ko-onboard` | Fill in AGENTS.md with real repo values |

On-demand (install when needed: `ko-dev-kit install command <name>`):
`ko-pr-desc`, `ko-release-verify`, `ko-knowledge-gen`, `ko-new-command`.

Archetype-specific:

| Command | Purpose |
|---------|---------|
| `/ko-lib-package <Name>` | Scaffold a shared package in `packages/` |

## Before editing

- Read `.cursor/rules/fe-nx.mdc` for the binding conventions.
- Check whether a shared package already covers what you need before adding code to an app.
- Run `pnpm nx fetchtypes <project>` before modifying GraphQL queries.
- Adding a new shared package? Use `/ko-lib-package` to scaffold it with all config files.
- Run `pnpm nx affected -t lint test` before pushing.

## Delivery

- **Product family repos & local paths:** <!-- run /ko-onboard: sibling repos + checkout paths -->
- **Deploy pipelines:** <!-- run /ko-onboard: Buildkite pipeline names + nonProd/prod step names -->
- **Feature flags:** <!-- run /ko-onboard: flag tool + key naming convention -->
- **Post-deploy sanity:** <!-- run /ko-onboard: sanity/smoke command + dashboards/monitors to watch -->
