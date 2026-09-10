---
name: ko-lib-package
description: Create a new shared package in packages/ with all required config files. Use when creating a new shared component library or utility package in an fe-nx repo.
args: "<PackageName>"
skills: [nx-monorepo]
rules: [fe-nx]
---

# Create Package

> Create a new shared package under `packages/` with the correct file structure and configuration.

**Usage:** `/ko-lib-package <PackageName>`

Create a new package named `<PackageName>` (PascalCase) in `packages/`. There is no NX generator for packages in this repo — they are created manually following a consistent template.

Read the `nx-monorepo` skill first and consult `.cursor/rules/fe-nx.mdc` and `AGENTS.md`.

## 1. Confirm the name and purpose

Ask the user:
- What is the package's purpose? (UI component library, utility/helper, data-access hook, shared type definitions)
- What path alias prefix should it use?
  - `@kmartau/ko-ui-<lowercase>` — for UI component packages (e.g. `@kmartau/ko-ui-button`)
  - `@ko-ui-lib/<name>` — for infrastructure/utility packages (e.g. `@ko-ui-lib/datalayer`)

If the user gives a name that is not PascalCase, convert it (e.g. `button-group` → `ButtonGroup`).

## 2. Check it doesn't already exist

```bash
ls packages/ | grep -i <name>
grep -i "<name>" tsconfig.base.json
```

If something similar exists, confirm with the user before proceeding.

## 3. Create the package directory structure

Create `packages/<PackageName>/` with these files:

```
packages/<PackageName>/
  project.json
  tsconfig.json
  tsconfig.lib.json
  tsconfig.spec.json
  vitest.config.ts
  .eslintrc.json
  src/
    index.ts
    setupVitest.ts
```

**`project.json`:**
```json
{
  "name": "<PackageName>",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/<PackageName>/src",
  "projectType": "library",
  "tags": [],
  "targets": {
    "lint": {
      "executor": "@nx/eslint:lint",
      "outputs": ["{options.outputFile}"]
    },
    "test": {
      "executor": "@nx/vitest:test",
      "outputs": ["{workspaceRoot}/coverage/packages/<PackageName>"],
      "options": {
        "configFile": "packages/<PackageName>/vitest.config.ts"
      }
    }
  }
}
```

Note: NO `build` target. Packages are consumed via TS path aliases + `transpilePackages` in consuming apps' `next.config.js`.

**`vitest.config.ts`:**
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'node:path'

export default defineConfig({
  cacheDir: path.resolve(__dirname, '../../.vitest-cache', path.basename(__dirname)),
  plugins: [react(), tsconfigPaths({ loose: true })],
  resolve: {
    alias: [
      {
        find: /\.module\.(css|sass|scss)$/,
        replacement: path.resolve(__dirname, '../../apps/home-ui/__mocks__/styleMock.js'),
      },
      {
        find: /\.(css|sass|scss)$/,
        replacement: path.resolve(__dirname, '../../apps/home-ui/__mocks__/styleMock.js'),
      },
      {
        find: /\.(jpg|jpeg|png|gif|webp|avif|svg)$/,
        replacement: path.resolve(__dirname, '../../apps/home-ui/__mocks__/fileMock.js'),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    globals: true,
    setupFiles: ['./src/setupVitest.ts'],
    include: ['src/**/*.vitest.{ts,tsx}'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
    pool: 'vmThreads',
    onConsoleLog: () => false,
    testTimeout: 30_000,
    reporters: process.env.CI ? ['default', 'buildkite-test-collector/vitest/reporter'] : ['default'],
  },
})
```

**`src/setupVitest.ts`:**
```ts
import { vi } from 'vitest'
import '@testing-library/jest-dom'
import 'cross-fetch/polyfill'
import nodeCrypto from 'node:crypto'

;(globalThis as any).jest = vi
await import('jest-canvas-mock')

window.scrollTo = vi.fn()

Object.defineProperty(window, 'crypto', { writable: true, value: nodeCrypto })

if (!window.crypto.subtle) {
  // @ts-expect-error
  window.crypto.subtle = {}
}
```

**`src/index.ts`:**
```ts
// Public API — re-export components and types here
export {}
```

**`tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc"
  },
  "files": [],
  "include": [],
  "references": [
    { "path": "./tsconfig.lib.json" },
    { "path": "./tsconfig.spec.json" }
  ]
}
```

**`tsconfig.lib.json`:**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["src/**/*.vitest.ts", "src/**/*.vitest.tsx", "src/**/*.stories.tsx"]
}
```

**`tsconfig.spec.json`:**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["vitest/globals", "node", "@testing-library/jest-dom"]
  },
  "include": ["src/**/*.vitest.ts", "src/**/*.vitest.tsx", "src/**/*.ts", "src/**/*.tsx"]
}
```

**`.eslintrc.json`:**
```json
{
  "extends": ["../../.eslintrc.json"],
  "ignorePatterns": ["!**/*"],
  "overrides": [
    {
      "files": ["*.ts", "*.tsx"],
      "rules": {}
    }
  ]
}
```

## 4. Register the path alias

Add an entry to `tsconfig.base.json` `compilerOptions.paths`:

- For UI packages: `"@kmartau/ko-ui-<lowercase>": ["packages/<PackageName>/src/index.ts"]`
- For infra/utility: `"@ko-ui-lib/<name>": ["packages/<PackageName>/src/index.ts"]`

Check existing aliases first to confirm the naming pattern matches:
```bash
grep '@kmartau/ko-ui-' tsconfig.base.json | head -5
grep '@ko-ui-lib/' tsconfig.base.json | head -5
```

## 5. Remind about transpilePackages

Any Next.js app that imports this package must add the path alias to its `transpilePackages` array in `next.config.js`. This is NOT automatic. Tell the user which apps need updating when they start importing the new package.

## 6. Verify

```bash
pnpm nx lint <PackageName>
pnpm nx test <PackageName>
```

Both should pass (lint with no errors, test with 0 tests found — which is fine for a new empty package with `passWithNoTests: true`).

## 7. Report

Summarize:
- Package name and path (`packages/<PackageName>/`)
- Path alias registered (e.g. `@kmartau/ko-ui-<lowercase>`)
- Config files created (list them)
- Reminder: add to `transpilePackages` in consuming apps' `next.config.js`
- Next step: add the first component to the package following the repo's component conventions (`/ko-feature` for anything non-trivial)
