---
name: ko-svc-lib
description: Scaffold a new shared NestJS library in libs/ with module, service, and barrel export. Use when creating reusable logic shared across apps and workers.
args: "<LibName>"
skills: [nestjs-patterns]
rules: [nestjs-graphql]
---

# Scaffold Shared Library

> Create a new shared NestJS library under `libs/` importable as `@kodekosmos/<name>`.

**Usage:** `/ko-svc-lib <LibName>`

## 1. Confirm the name and purpose

Ask the user:
- What is the library's purpose? (shared utility, external client wrapper, domain logic, middleware/guard)
- Should it be `@Global()` (available everywhere without importing) or scoped (must be imported per-module)?

Convert the name to kebab-case (e.g. `OrderValidation` → `order-validation`).

## 1b. Reuse-first (stop and wait)

Search before creating: `ls libs/`, read the barrels (`libs/*/src/index.ts`), and grep for `@kodekosmos/` imports covering this purpose. Present a verdict — **[REUSE]** an existing lib already covers it (stop; point at it), **[ADAPT]** extend an existing lib (propose which and where), or **[NEW]** nothing fits. Wait for confirmation before scaffolding.

## 2. Generate the library

Use the NestJS CLI to scaffold:

```bash
nest generate library <lib-name>
```

This creates at `libs/<lib-name>/`:
```
libs/<lib-name>/
  src/
    <lib-name>.module.ts      # NestJS module
    <lib-name>.service.ts     # Main service
    index.ts                  # barrel export
  tsconfig.lib.json
```

## 3. Configure the module

**Standard module:**
```ts
import { Module } from '@nestjs/common'
import { LibNameService } from './<lib-name>.service'

@Module({
  providers: [LibNameService],
  exports: [LibNameService],
})
export class LibNameModule {}
```

**Global module** (for cross-cutting concerns like logging, feature flags):
```ts
import { Global, Module } from '@nestjs/common'
import { LibNameService } from './<lib-name>.service'

@Global()
@Module({
  providers: [LibNameService],
  exports: [LibNameService],
})
export class LibNameModule {}
```

## 4. Configure the service

```ts
import { Injectable } from '@nestjs/common'
import { KoLoggerService } from '@kodekosmos/logger'

@Injectable()
export class LibNameService {
  constructor(private readonly logger: KoLoggerService) {}
}
```

- Inject dependencies through the constructor (`private readonly`).
- Use `KoLoggerService` for logging — never `console.log`.
- If the lib wraps an external API, add config via `registerAs('libName', usingEnv(env => ({ ... })))`.

## 5. Update barrel export

Ensure `libs/<lib-name>/src/index.ts` exports the module and service:
```ts
export { LibNameModule } from './<lib-name>.module'
export { LibNameService } from './<lib-name>.service'
```

## 6. Verify path alias

Check `tsconfig.json` → `paths` has an alias for the new lib:
```json
"@kodekosmos/<lib-name>": ["libs/<lib-name>/src"]
```

Also confirm `nest-cli.json` has the library registered under `projects`.

## 7. Add tests

Create `libs/<lib-name>/src/<lib-name>.service.spec.ts`:
```ts
import { Test, TestingModule } from '@nestjs/testing'
import { LibNameService } from './<lib-name>.service'

describe('LibNameService', () => {
  let service: LibNameService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibNameService,
        { provide: KoLoggerService, useValue: { log: jest.fn(), error: jest.fn() } },
      ],
    }).compile()

    service = module.get<LibNameService>(LibNameService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
```

## 8. Verify

```bash
yarn test libs/<lib-name>
yarn lint
```

## 9. Report

Summarize:
- Library name and path (`libs/<lib-name>/`)
- Import alias (`@kodekosmos/<lib-name>`)
- Whether it's `@Global()` or scoped
- Files created
- Verification results
