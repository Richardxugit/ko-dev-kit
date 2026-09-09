---
name: ko-svc-lambda
description: Scaffold an AWS Lambda worker with the wrapLambda() NestJS app-context caching pattern, Serverless config, and test harness
args: "<WorkerName>"
skills: [serverless-nestjs]
rules: [nestjs-graphql]
---

# Scaffold Lambda Worker

> Scaffold an AWS Lambda worker function with the `wrapLambda()` NestJS app context caching pattern, Serverless config, and test harness.

**Usage:** `/ko-svc-lambda <WorkerName>`

Read the `serverless-nestjs` skill first. Follow `.cursor/rules/nestjs-graphql.mdc` and the conventions in `AGENTS.md`.

1. Confirm the purpose of `<WorkerName>` and its trigger (SQS, SNS, DynamoDB stream, API Gateway, EventBridge, S3, scheduled). Determine which NestJS libs it needs.
2. **Reuse-first (stop and wait).** Search before creating: `ls workers/` and grep existing handlers for this trigger type and domain. Present a verdict — **[REUSE]** an existing worker handles this (stop; point at it), **[ADAPT]** extend an existing worker (propose where), or **[NEW]** nothing fits. Wait for the user to confirm before scaffolding.
3. Create the worker directory at `workers/<worker-name>/`:
   - `handler.ts` — the Lambda entry point using the `wrapLambda()` pattern:
     ```typescript
     import { wrapLambda } from '@kodekosmos/lambda-utils';
     import { WorkerModule } from './worker.module';
     import { WorkerService } from './worker.service';

     export const handler = wrapLambda(WorkerModule, async (app, event, context) => {
       const service = app.get(WorkerService);
       return service.process(event);
     });
     ```
   - `worker.module.ts` — NestJS module importing required libs (`ConfigModule`, domain libs).
   - `worker.service.ts` — `@Injectable()` service with the processing logic.
   - `serverless.yml` — Serverless Framework v3 config (runtime: nodejs20.x, architecture: arm64, handler path, trigger event source, IAM permissions, environment variables via SSM).
4. Create test files:
   - `handler.spec.ts` — unit test mocking the NestJS context and event payload.
   - `worker.service.spec.ts` — service unit test with mocked dependencies.
5. Wire SSM Parameter Store references in `serverless.yml` `environment:` section for any secrets. Never hardcode values.
6. Add IAM permissions in `serverless.yml` scoped to minimum required (specific DynamoDB table ARN, specific SQS queue ARN, etc.).
7. If the worker consumes from a queue/stream, configure `batchSize`, `maximumRetryAttempts`, and DLQ settings.
8. Run `yarn lint` and verify tests pass with `yarn test -- --testPathPattern=workers/<worker-name>`.
9. Document the worker's purpose and trigger in a JSDoc comment at the top of `handler.ts`.
