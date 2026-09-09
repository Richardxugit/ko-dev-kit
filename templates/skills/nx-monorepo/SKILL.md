---
name: nx-monorepo
description: Nx monorepo workflow for a TypeScript + pnpm + webpack repo — generators, the project graph, affected commands, computation caching, library taxonomy, and module-boundary tags. Use when adding/moving libraries, wiring imports across libs, fixing boundary lint errors, configuring project targets, or setting up CI for an Nx workspace.
---

# Nx Monorepo Workflow

Nx organizes a TypeScript monorepo into **apps** (deployable) and **libs** (reusable). The
project graph, affected detection, and computation caching make a large workspace fast to
build and safe to change. This kit uses **pnpm** — all commands are `pnpm nx ...`.

## Project graph

Nx builds a dependency graph from your imports. Use it to understand blast radius before a change.

```bash
pnpm nx graph                         # interactive graph in the browser
pnpm nx graph --focus=orders-feature  # just one project and its neighbors
```

The graph also powers `affected` and caching, so keep imports explicit (no dynamic
`require` of sibling libs) and dependencies declared in each project's `project.json`.

## Generators

Always scaffold with generators so `project.json`, tsconfig paths, and lint config stay consistent.

```bash
# Generate a library (pick the right preset for your framework)
pnpm nx g @nx/react:lib orders-ui --directory=libs/orders/ui --bundler=none

# Generate an app
pnpm nx g @nx/react:app storefront --bundler=webpack

# Generate a component inside an existing lib
pnpm nx g @nx/react:component OrderCard --project=orders-ui --export

# See what a generator will do without writing files
pnpm nx g @nx/react:lib orders-ui --dry-run
```

Prefer `--dry-run` first on anything that touches multiple files. Use `/ko-lib` for the
guided library workflow.

## affected

Run targets only for projects impacted by your changes — the core of fast CI.

```bash
pnpm nx affected -t build test lint              # vs the merge base
pnpm nx affected -t test --base=main --head=HEAD # explicit range
pnpm nx affected:graph                           # visualize what changed
```

In CI, compute the base from the default branch and run `affected` instead of building the
whole workspace.

## Computation caching

Nx caches target outputs keyed by inputs (source, deps, config, env). A cache hit replays
output instantly.

- Keep targets **deterministic** — no reading wall-clock, random, or network during a cached
  target, or you cache invalid results.
- Declare extra inputs/outputs in `nx.json` `targetDefaults` so the cache key is correct.
- `pnpm nx reset` clears the local cache if you suspect a stale hit.

## Tags & module boundaries

Tag every project in its `project.json`, then enforce the rules in ESLint.

```jsonc
// libs/orders/feature/project.json
{
  "name": "orders-feature",
  "tags": ["scope:orders", "type:feature"]
}
```

```jsonc
// eslint config — @nx/enforce-module-boundaries
{
  "depConstraints": [
    { "sourceTag": "type:feature",     "onlyDependOnLibsWithTags": ["type:ui", "type:data-access", "type:util"] },
    { "sourceTag": "type:ui",          "onlyDependOnLibsWithTags": ["type:ui", "type:util"] },
    { "sourceTag": "type:data-access", "onlyDependOnLibsWithTags": ["type:data-access", "type:util"] },
    { "sourceTag": "type:util",        "onlyDependOnLibsWithTags": ["type:util"] },
    { "sourceTag": "scope:orders",     "onlyDependOnLibsWithTags": ["scope:orders", "scope:shared"] }
  ]
}
```

If a boundary lint error fires, **fix the design** (change the importing lib's type, or move
the shared code into a `util`/`shared` lib) — do not add an eslint-disable.

## Library taxonomy

Four library types with strict allowed-dependency rules. See
[references/library-types.md](references/library-types.md) for the full matrix and examples.

| Type          | Contains                                  | May depend on                       |
| ------------- | ----------------------------------------- | ----------------------------------- |
| `feature`     | smart, route-level slices                 | ui, data-access, util               |
| `ui`          | presentational components (no fetching)   | ui, util                            |
| `data-access` | API clients, server-state hooks, stores   | data-access, util                   |
| `util`        | pure helpers, types, constants            | util                                |

## Importing across libraries

Import only through a library's public barrel using its TS path alias — never a deep relative path.

```ts
// tsconfig.base.json
{
  "compilerOptions": {
    "paths": {
      "@org/orders-feature": ["libs/orders/feature/src/index.ts"],
      "@org/orders-ui":      ["libs/orders/ui/src/index.ts"]
    }
  }
}
```

```ts
// Good — public API via alias
import { OrderList } from '@org/orders-feature';

// Bad — reaches into another lib's internals
import { OrderList } from '../../../orders/feature/src/lib/OrderList';
```

`@org` is a generic placeholder — use the repo's real npm scope. Whatever isn't re-exported
from `src/index.ts` is private to that library.

## Soft boundaries (convention-only repos)

Some large repos disable `@nx/enforce-module-boundaries` for pragmatic reasons (e.g., 100+ packages
with evolving ownership). In these repos, boundaries are **convention-only**:

- Apps import from packages; packages NEVER import from apps.
- No cross-app imports — shared code must live in `packages/`.
- Packages should not create circular dependencies (A imports B imports A).
- Monitor with `pnpm nx graph` to spot unintended coupling.

When boundaries are not lint-enforced, the responsibility falls on code review and the AI agent to
catch violations. Always check the import direction before introducing a new cross-package import.

## Custom executors

Some repos define custom NX executors for specialized build steps:

```bash
# Example: GraphQL type generation from schema
pnpm nx fetchtypes <project>    # Runs the custom executor to codegen TS types

# Custom executors live in tools/executors/ with their own schema.json
# They are referenced in project.json targets like any built-in executor
```

Always run required code generation executors (e.g., `fetchtypes`) before modifying code that depends
on generated types. The executor's `schema.json` defines its options.

## Large path alias management

Repos with 100+ path aliases in `tsconfig.base.json`:
- Always search existing aliases before creating a new one (`grep` the paths object).
- Use the established prefix convention (e.g., `@org/PackageName` for PascalCase packages).
- Adding a new alias requires adding the corresponding `src/index.ts` barrel.
- Never create an alias that bypasses the barrel (pointing to a deep internal path).
