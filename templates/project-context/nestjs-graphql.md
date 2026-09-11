# Project Context: NestJS + GraphQL (Apollo Federation)

A NestJS CLI monorepo exposing a federated GraphQL API through Apollo Federation, with AWS Lambda workers for async processing.

<!-- run /ko-onboard to fill in repo specifics -->

## Stack
- **Runtime:** Node.js 20 (LTS)
- **Framework:** NestJS 10 (CLI monorepo, managed by `nest-cli.json`)
- **API:** GraphQL via Apollo Federation (code-first, `autoSchemaFile`)
- **Schema approach:** Code-first — SDL auto-generated from decorators. 100% code-first, NO `.graphql` files.
- **Validation:** `class-validator` + `class-transformer` via global `ValidationPipe`
- **Config:** `registerAs('scope', usingEnv(...))` — fail-fast on missing env vars
- **Auth:** Two-tier — anonymous Commercetools token (encrypted cookie) + Auth0 JWT (JWKS)
- **Data stores:** DynamoDB (primary), Redis/Valkey (cache), Elasticsearch 7.x (geo/search), PostgreSQL (orders), Kafka (events)
- **Workers:** AWS Lambda (Serverless Framework v3, arm64, Node 20) with `wrapLambda()` pattern
- **Package manager:** yarn
- **Tests:** Jest 30 (SWC) + Pact 13 (contract)
- **CI:** Buildkite

## Monorepo structure

```
apps/              # NestJS services — each a GraphQL Federation subgraph
  gateway/         # Apollo Router/Gateway (port 4000)
  account/         # User accounts, profiles (port 4001)
  orders/          # Order management (port 4002)
  catalogue/       # Product catalogue (port 4003)
  ...              # ~12 services total
libs/              # Shared libraries (@kodekosmos/<name>)
  common/          # Shared types, utils, decorators
  lambda-utils/    # wrapLambda(), SSM resolution
  auth/            # Guards, strategies, token handling
  ...              # ~37 libraries total
workers/           # AWS Lambda functions (~188 workers)
  <worker-name>/
    handler.ts     # Lambda entry with wrapLambda()
    worker.module.ts
    worker.service.ts
    serverless.yml # Deployment config
cdk/               # AWS CDK v2 infrastructure
config/apps.json   # Service registry (name, port, start command)
scripts/           # Operational tools
nest-cli.json      # NestJS monorepo config (projects)
```
<!-- run /ko-onboard to confirm actual service names and ports -->

## Key commands
```bash
# Install
yarn

# Start all services (watch mode)
node scripts/start-dev.js

# Start a single service
yarn start:dev <app-name>

# Build a service
nest build <app-name>

# Test
yarn test                     # unit tests
APP_NAME=<name> yarn test:cov # coverage for one app/worker

# Lint
yarn lint

# Encrypted env
yarn decrypt-env              # decrypt .env.secret
yarn encrypt-env              # re-encrypt

# Apollo Federation
yarn graphql:check            # rover schema check
yarn graphql:publish          # rover schema publish
```
<!-- run /ko-onboard to confirm available scripts -->

## Test file conventions
| Type | Naming | Purpose |
|------|--------|---------|
| Unit | `.spec.ts` | Mock providers, test service logic |
| Test harness | `.th.spec.ts` | Real NestJS context, mocked externals |

## Architecture patterns
- **Federation:** Each service is a subgraph owning its entities (`@Directive('@key(...)')`). Implements `@ResolveReference()` for cross-subgraph resolution.
- **Thin resolvers:** Resolvers parse args and delegate. Business logic in services.
- **DataLoader:** Every `@ResolveField()` relation uses a per-request DataLoader.
- **Config:** `registerAs('scope', usingEnv(env => ({ ... })))` — aggregates all missing vars into one error.
- **Lambda workers:** `wrapLambda()` caches NestJS context across warm invocations. DLQ + retry configured.
- **Auth guards:** `@UseGuards(AuthGuard)` validates JWT claims, extracts user context.

## Conventions
- Follow `.cursor/rules/nestjs-graphql.mdc`.
- Skills: `nestjs-patterns`, `graphql-apollo`, `apollo-federation`, `serverless-nestjs`.
- Scaffolding: `/ko-svc-lambda <worker>`, `/ko-svc-nest-app <service>`, `/ko-svc-lib <library>`.
- **Commits:** `type(scope): KOSM-XXXX: description` (e.g. `feat(orders): KOSM-1234: add loyalty endpoint`). Enforced by Husky + commitlint.
- **Secrets:** Never commit decrypted `.env.secret`. SSM Parameter Store in production.

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
| `/ko-pr-desc` | Generate PR title and description from diff + branch name |

On-demand (install when needed: `ko-dev-kit install command <name>`):
`ko-release-verify`, `ko-knowledge-gen`, `ko-new-command`.

Archetype-specific:

| Command | Purpose |
|---------|---------|
| `/ko-svc-lambda <name>` | Scaffold a Lambda worker (`wrapLambda()`) |
| `/ko-svc-nest-app <name>` | Scaffold a NestJS app (Apollo subgraph) |
| `/ko-svc-lib <name>` | Scaffold a shared library in `libs/` |

## Delivery

- **Product family repos & local paths:** <!-- run /ko-onboard: sibling repos + checkout paths -->
- **Deploy pipelines:** <!-- run /ko-onboard: Buildkite pipeline names + nonProd/prod step names -->
- **Feature flags:** <!-- run /ko-onboard: flag tool + key naming convention -->
- **Post-deploy sanity:** <!-- run /ko-onboard: sanity/smoke command + dashboards/monitors to watch -->
- **Shared libraries:** <!-- run /ko-onboard: which libs fan out to multiple apps + rebuild-trigger convention -->
