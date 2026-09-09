---
name: pact-contract-testing
description: Pact consumer-driven contract testing — writing consumer tests (.pact.ts), provider verification (.provider.pact.ts), state handlers, broker integration, and CI workflows. Use when adding or verifying API contracts between frontend and backend services.
---

# Pact Contract Testing

Consumer-driven contract testing ensures API compatibility between services without end-to-end integration tests. The consumer defines the contract; the provider verifies it.

## Consumer tests (`.pact.ts`)

Consumer tests define the expected interactions with a provider API.

```ts
// orders.pact.ts
import { PactV4, MatchersV3 } from '@pact-foundation/pact';
const { like, eachLike, string } = MatchersV3;

const provider = new PactV4({
  consumer: 'ko-ui-lib',
  provider: 'orders-service',
  dir: './pacts',
});

describe('Orders API - Pact Consumer', () => {
  it('returns a list of orders for a user', async () => {
    await provider
      .addInteraction()
      .given('user has orders')
      .uponReceiving('a request for user orders')
      .withRequest('GET', '/api/orders', (builder) => {
        builder.headers({ Authorization: string('Bearer token') });
      })
      .willRespondWith(200, (builder) => {
        builder.body(eachLike({
          id: string('order-123'),
          status: string('shipped'),
          total: like(99.99),
        }));
      })
      .executeTest(async (mockServer) => {
        const client = new OrdersClient(mockServer.url);
        const orders = await client.getOrders('Bearer token');
        expect(orders).toHaveLength(1);
        expect(orders[0].status).toBe('shipped');
      });
  });
});
```

### Key rules for consumer tests:
- Use **matchers** (`like`, `eachLike`, `string`, `regex`) for flexible matching — don't hard-code exact values.
- Each interaction needs a **provider state** (`given(...)`) that the provider must set up.
- Test the **real client code** (not a mock) against the Pact mock server.
- Output goes to `./pacts/` as JSON contract files.

## Provider verification (`.provider.pact.ts`)

Provider tests verify that the service fulfills all consumer contracts.

```ts
// orders.provider.pact.ts
import { Verifier } from '@pact-foundation/pact';

describe('Orders Service - Pact Provider', () => {
  it('fulfills consumer contracts', async () => {
    const verifier = new Verifier({
      providerBaseUrl: 'http://localhost:4002',
      pactUrls: ['./pacts/ko-ui-lib-orders-service.json'],
      // Or from broker:
      // pactBrokerUrl: process.env.PACT_BROKER_URL,
      // providerVersion: process.env.GIT_SHA,
      stateHandlers: {
        'user has orders': async () => {
          // Seed test data — insert an order for the test user
          await seedOrders([{ id: 'order-123', status: 'shipped', total: 99.99 }]);
        },
        null: async () => {
          // Default state — clean state with no preconditions
          await clearTestData();
        },
      },
    });

    await verifier.verifyProvider();
  });
});
```

### Key rules for provider verification:
- **State handlers** set up the exact preconditions each consumer interaction expects.
- The provider must be running (boot the NestJS app before verification).
- Use `providerVersion` + `publishVerificationResult` for broker integration.
- State handlers must be idempotent and clean up after themselves.

## File naming conventions

| Type | Naming | Location |
|------|--------|----------|
| Consumer test | `<domain>.pact.ts` | Next to the client code or in a `pact/` directory |
| Provider verification | `<domain>.provider.pact.ts` | In the provider service's test directory |
| Generated contracts | `<consumer>-<provider>.json` | `./pacts/` (gitignored, published to broker) |

## CI workflow

1. **Consumer CI**: Run consumer tests → generate pact JSON → publish to Pact Broker with consumer version.
2. **Provider CI**: Pull contracts from broker → run provider verification → publish results with provider version.
3. **Can-I-Deploy**: Before deploying, check `pact-broker can-i-deploy --pacticipant <name> --version <sha>` to verify compatibility.

## Matchers reference

| Matcher | Purpose |
|---------|---------|
| `like(example)` | Matches type, not exact value |
| `eachLike(example)` | Array with at least one element matching type |
| `string(example)` | Any non-empty string |
| `regex(pattern, example)` | Value matching regex |
| `integer(example)` | Any integer |
| `boolean(example)` | Any boolean |

## Do / Don't
- DO test the real client/service code against the mock, not a hand-written fetch.
- DO use matchers for values that change between runs (IDs, timestamps, tokens).
- DON'T test implementation details — test the contract shape and status codes.
- DON'T share pact files via git — use a Pact Broker or CI artifacts.
- DON'T skip provider state handlers — they ensure the provider is in the right state for each interaction.
