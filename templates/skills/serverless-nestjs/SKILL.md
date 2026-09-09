---
name: serverless-nestjs
description: AWS Lambda workers with NestJS — the wrapLambda() app context caching pattern, Serverless Framework v3 configuration, SSM env resolution, cold start optimization, DLQ/retry config, and testing strategies. Use when creating or modifying Lambda worker functions that use NestJS DI.
---

# Serverless NestJS (Lambda Workers)

Pattern for AWS Lambda functions that leverage the NestJS dependency injection container. The key insight: cache the NestJS application context across warm invocations to avoid cold-start penalty on every request.

## The `wrapLambda()` pattern

```ts
// handler.ts
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { WorkerService } from './worker.service';

// Module-level promise — survives across warm invocations
let appPromise: Promise<INestApplicationContext> | null = null;

async function getApp(): Promise<INestApplicationContext> {
  if (!appPromise) {
    appPromise = NestFactory.createApplicationContext(WorkerModule);
  }
  return appPromise;
}

export const handler = async (event: SQSEvent, context: Context) => {
  const app = await getApp();
  const service = app.get(WorkerService);
  return service.process(event);
};
```

Or using the repo's `wrapLambda()` utility (preferred):

```ts
import { wrapLambda } from '@kodekosmos/lambda-utils';
import { WorkerModule } from './worker.module';
import { WorkerService } from './worker.service';

export const handler = wrapLambda(WorkerModule, async (app, event, context) => {
  const service = app.get(WorkerService);
  return service.process(event);
});
```

### How it works:
1. First invocation (cold start): Creates the NestJS app context, resolves SSM parameters, initializes DI container.
2. Subsequent invocations (warm): Reuses the cached app context — near-instant startup.
3. Lambda freeze/thaw: The module-level promise persists across freeze cycles.

## Worker module structure

```
workers/<worker-name>/
├── handler.ts           # Lambda entry point with wrapLambda()
├── handler.spec.ts      # Integration test
├── worker.module.ts     # NestJS module (imports libs)
├── worker.service.ts    # Business logic
├── worker.service.spec.ts  # Unit test
└── serverless.yml       # Deployment config
```

## Serverless Framework v3 config

```yaml
# serverless.yml
service: ko-<worker-name>

frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs20.x
  architecture: arm64
  region: ap-southeast-2
  stage: ${opt:stage, 'dev'}
  environment:
    NODE_ENV: ${self:provider.stage}
    # SSM references — resolved at deploy time
    DB_TABLE: ${ssm:/ko/${self:provider.stage}/dynamodb/table-name}
    REDIS_URL: ${ssm:/ko/${self:provider.stage}/redis/url}

functions:
  handler:
    handler: dist/handler.handler
    timeout: 30
    memorySize: 512
    events:
      - sqs:
          arn: ${ssm:/ko/${self:provider.stage}/sqs/<queue-name>/arn}
          batchSize: 10
          maximumBatchingWindow: 5

plugins:
  - serverless-webpack

custom:
  webpack:
    webpackConfig: webpack.config.js
    includeModules: true
    packagerOptions:
      scripts:
        - 'npx @newrelic/aws-sdk-v3-instrumentation compile'
```

## SSM Parameter Store

- ALL secrets and environment-specific config come from SSM, NEVER hardcoded.
- Path convention: `/ko/<stage>/<service>/<key>`
- The `wrapLambda()` utility resolves SSM references at cold start.
- Local development uses `.env.secret` (Ansible Vault encrypted) — decrypt with `scripts/crypt.js`.

## Event sources and handlers

| Trigger | Event type | Key considerations |
|---------|-----------|-------------------|
| SQS | `SQSEvent` | Configure batchSize, DLQ, maxReceiveCount |
| SNS | `SNSEvent` | Filter policies for targeted delivery |
| DynamoDB Stream | `DynamoDBStreamEvent` | TRIM_HORIZON vs LATEST, parallelization factor |
| EventBridge | `EventBridgeEvent` | Pattern matching rules, retry policy |
| API Gateway | `APIGatewayProxyEvent` | Cold start matters more here (user-facing) |
| S3 | `S3Event` | Batch processing, concurrency limits |
| Scheduled | `ScheduledEvent` | Rate or cron expression |

## Cold start optimization

- **arm64** architecture: faster cold starts than x86_64 for the same memory.
- **Memory**: More memory = more CPU = faster cold start. 512MB–1024MB is the sweet spot.
- **Bundle size**: Use webpack/esbuild to tree-shake. Exclude `aws-sdk` (available in Lambda runtime).
- **Lazy initialization**: Only import heavy modules (TypeORM, Elasticsearch client) when actually needed.
- **Provisioned concurrency**: For user-facing Lambdas only (expensive).

## DLQ and retry configuration

```yaml
functions:
  handler:
    handler: dist/handler.handler
    events:
      - sqs:
          arn: !GetAtt MyQueue.Arn
          batchSize: 10
          functionResponseType: ReportBatchItemFailures

resources:
  Resources:
    MyQueue:
      Type: AWS::SQS::Queue
      Properties:
        RedrivePolicy:
          deadLetterTargetArn: !GetAtt MyDLQ.Arn
          maxReceiveCount: 3
    MyDLQ:
      Type: AWS::SQS::Queue
      Properties:
        MessageRetentionPeriod: 1209600  # 14 days
```

- Always configure a DLQ with `maxReceiveCount: 3` (or appropriate for the use case).
- Use `ReportBatchItemFailures` for SQS to only retry failed messages, not the whole batch.

## Testing

### Unit test (service logic):
```ts
describe('WorkerService', () => {
  let service: WorkerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [WorkerService, { provide: DynamoDBService, useValue: mockDynamo }],
    }).compile();
    service = module.get(WorkerService);
  });

  it('processes SQS message', async () => {
    const result = await service.process(mockSQSEvent);
    expect(mockDynamo.put).toHaveBeenCalledWith(/* expected */);
  });
});
```

### Integration test (handler with NestJS context):
```ts
describe('handler', () => {
  it('bootstraps and processes event', async () => {
    const result = await handler(mockSQSEvent, mockContext);
    expect(result.batchItemFailures).toHaveLength(0);
  });
});
```

## Do / Don't
- DO cache the NestJS app context at module level (the `wrapLambda()` pattern).
- DO use SSM for all secrets and config — never hardcode.
- DO configure DLQ and retry for every queue-triggered Lambda.
- DO use `ReportBatchItemFailures` for SQS batch processing.
- DON'T create a new NestJS context per invocation — that's a full cold start every time.
- DON'T use `console.log` — use the project's structured logger for CloudWatch integration.
- DON'T exceed 15-minute timeout for any Lambda. If processing takes longer, split into Step Functions.
