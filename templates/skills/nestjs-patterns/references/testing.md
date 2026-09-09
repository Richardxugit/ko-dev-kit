# NestJS Testing

Two layers: fast **unit tests** for services (mocked providers) and **e2e tests** that exercise the real app over HTTP/GraphQL with Supertest.

Run with yarn: `yarn test` (unit) and `yarn test:e2e`. (pnpm repos: `pnpm test`, `pnpm test:e2e`.)

## Unit test — service with mocked providers

Build a testing module and replace real collaborators with mocks. No DB, no network.

```ts
// user.service.spec.ts
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

describe('UserService', () => {
  let service: UserService;
  const repo = {
    findById: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: repo },
      ],
    }).compile();

    service = moduleRef.get(UserService);
    jest.clearAllMocks();
  });

  it('returns a user by id', async () => {
    repo.findById.mockResolvedValue({ id: '1', email: 'a@example.com' });

    const user = await service.findOne('1');

    expect(user.email).toBe('a@example.com');
    expect(repo.findById).toHaveBeenCalledWith('1');
  });

  it('throws when the user is missing', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

Mock collaborators with a plain object of `jest.fn()`s, or use `jest.mocked()` / `createMock()` from `@golevelup/ts-jest` for fully typed auto-mocks.

## e2e test — GraphQL over Supertest

Bootstrap the full Nest app (with the same global pipes/filters as production) and post real GraphQL operations to `/graphql`.

```ts
// test/user.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('User (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('queries a user by id', async () => {
    const query = `
      query GetUser($id: ID!) {
        user(id: $id) { id email }
      }
    `;

    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query, variables: { id: '1' } })
      .expect(200);

    expect(res.body.data.user).toMatchObject({ id: '1' });
    expect(res.body.errors).toBeUndefined();
  });

  it('rejects an invalid mutation input', async () => {
    const mutation = `
      mutation { createUser(input: { email: "not-an-email" }) { id } }
    `;

    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: mutation })
      .expect(200);

    expect(res.body.errors?.[0].message).toMatch(/email/i);
  });
});
```

Notes:
- GraphQL returns HTTP 200 even for operation errors; assert on `res.body.errors` and `res.body.data`, not the status code.
- To override a provider in e2e (e.g. swap a real DB for a test double), chain `.overrideProvider(Token).useValue(stub)` before `.compile()`.
- Keep e2e tests hermetic: use a test database or in-memory implementation, and reset state between runs.
