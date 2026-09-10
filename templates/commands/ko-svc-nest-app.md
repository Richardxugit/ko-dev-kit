---
name: ko-svc-nest-app
description: Scaffold a new Apollo Federation subgraph as a NestJS application with entity resolution, port config, and CI pipeline
args: "<ServiceName>"
skills: [apollo-federation, nestjs-patterns]
rules: [nestjs-graphql]
---

# Scaffold Federation Service

> Scaffold a new Apollo Federation subgraph as a NestJS application with entity resolution, port config, and CI pipeline.

**Usage:** `/ko-svc-nest-app <ServiceName>`

Read the `apollo-federation` and `nestjs-patterns` skills first. Follow `.cursor/rules/nestjs-graphql.mdc` and the conventions in `AGENTS.md`.

1. Confirm the domain `<ServiceName>` will own (e.g. `loyalty`, `recommendations`). Identify:
   - Which entities this service is the authoritative source for.
   - Which entities from other subgraphs it needs to extend/reference.
   - What data store(s) it needs (DynamoDB, Redis, PostgreSQL, etc.).
1b. **Ownership check (stop and wait).** Search `nest-cli.json` projects and `apps/*/src` for a subgraph that already owns this domain or its entities. Federation ownership is exclusive — if another subgraph is the authoritative source for these entities, **STOP** and report it: the work belongs there (**[ADAPT]**), not in a new service. Only proceed as **[NEW]** when no existing subgraph owns the domain, and say so explicitly before scaffolding.
2. Scaffold the app directory at `apps/<service-name>/`:
   - `src/main.ts` — NestJS bootstrap with Apollo Federation driver, setting the port from config.
   - `src/app.module.ts` — imports `GraphQLModule.forRoot(ApolloFederationDriver, { autoSchemaFile: true })`, `ConfigModule`, and feature modules.
   - `src/<entity>/` — at least one feature module following the standard structure:
     - `<entity>.module.ts`, `<entity>.resolver.ts`, `<entity>.service.ts`
     - `entities/<entity>.entity.ts` — `@ObjectType()` with `@Directive('@key(fields: "id")')` for Federation.
     - `dto/` — input types with `class-validator` decorators.
   - `src/<entity>/<entity>.resolver.ts` must implement `@ResolveReference()`:
     ```typescript
     @ResolveReference()
     async resolveReference(reference: { __typename: string; id: string }) {
       return this.service.findById(reference.id);
     }
     ```
   - `tsconfig.app.json` extending root `tsconfig.json`.
   - `test/app.e2e-spec.ts` — basic e2e test verifying the subgraph boots and responds to a query.
3. Register the service in `config/apps.json`:
   ```json
   { "name": "<service-name>", "port": <next-available-port>, "start": "nest start <service-name> --watch" }
   ```
4. Add the project to `nest-cli.json` under `projects`:
   ```json
   "<service-name>": {
     "type": "application",
     "root": "apps/<service-name>",
     "entryFile": "main",
     "sourceRoot": "apps/<service-name>/src"
   }
   ```
5. Configure the service in the gateway's supergraph/router config so it's included in schema composition.
6. Add a Buildkite pipeline file at `.buildkite/pipelines/app/<service-name>.yml` following the pattern of existing service pipelines.
7. If extending entities from other subgraphs, add stub types:
   ```typescript
   @ObjectType()
   @Directive('@extends')
   @Directive('@key(fields: "id")')
   export class Product {
     @Field() @Directive('@external') id: string;
   }
   ```
8. Run `nest build <service-name>` to verify it compiles. Run `yarn test` for the new service tests.
9. Run `npx rover subgraph check` to validate the schema composes correctly with the supergraph.
