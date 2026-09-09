---
name: nestjs-patterns
description: NestJS architecture conventions — modules, providers & DI, custom providers, guards/interceptors/pipes/filters, lifecycle, config, validation, and testing. Use when building or reviewing NestJS modules, services, providers, or request-pipeline components.
---

# NestJS Patterns

Practical conventions for structuring a NestJS application. Pair with the `graphql-apollo` skill when working on the GraphQL layer.

## Modules
Organize by feature. A module declares what it provides and what it exports.

```ts
@Module({
  imports: [ConfigModule],
  providers: [UserService, UserResolver, UserLoader],
  exports: [UserService], // only what other modules legitimately need
})
export class UserModule {}
```

- Keep `AppModule` thin: global modules + feature module imports.
- A provider is private to its module unless `exports`ed.
- Use `imports` to consume another module's exported providers — never reach across module boundaries directly.

## Providers and DI
Inject via the constructor. Never `new` a service.

```ts
@Injectable()
export class UserService {
  constructor(
    private readonly repo: UserRepository,
    private readonly config: ConfigService,
  ) {}
}
```

- Mark injected params `private readonly`.
- Default scope is singleton. Use `@Injectable({ scope: Scope.REQUEST })` only when you truly need per-request state (e.g. some DataLoaders) — it has a performance cost.

## Custom providers
Use when you need a token, a factory, or a swappable implementation.

```ts
// value provider
{ provide: 'MAILER', useValue: mailerStub }

// factory provider (async deps resolved via inject)
{
  provide: 'PG_POOL',
  useFactory: (config: ConfigService) => new Pool({ connectionString: config.get('DATABASE_URL') }),
  inject: [ConfigService],
}

// class provider (interface token + concrete impl)
{ provide: PAYMENT_GATEWAY, useClass: StripeGateway }
```

Inject token-based providers with `@Inject('MAILER')`.

## Request pipeline: guards, interceptors, pipes, filters
Execution order per request: **guards → interceptors (pre) → pipes → handler → interceptors (post) → exception filters**.

- **Guards** — authn/authz. Return boolean / throw. `@UseGuards(AuthGuard)`.
- **Interceptors** — wrap handler execution: logging, transforming responses, caching, timeouts. Implement `intercept(ctx, next)` and operate on the `next.handle()` stream.
- **Pipes** — validate/transform inputs. Use the built-in `ValidationPipe` for DTOs; write custom pipes for parsing.
- **Exception filters** — map thrown errors to responses. `@Catch(DomainError)` + `catch(err, host)`.

Apply at method, controller/resolver, or global scope (`app.useGlobalPipes(...)`). For GraphQL, build the execution context with `GqlExecutionContext.create(ctx)`.

## Lifecycle hooks
Implement when you need setup/teardown:

- `OnModuleInit` / `OnApplicationBootstrap` — warm caches, open connections after DI is ready.
- `OnModuleDestroy` / `BeforeApplicationShutdown` — close pools, flush buffers. Call `app.enableShutdownHooks()` to receive OS signals.

```ts
@Injectable()
export class PgService implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.pool.connect(); }
  async onModuleDestroy() { await this.pool.end(); }
}
```

## Configuration (`@nestjs/config`)
```ts
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object({
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().required(),
  }),
});
```
Read values through `ConfigService.get(...)`. No secrets in source; fail fast on missing required vars.

## Validation pipe
Enable globally in `main.ts`:

```ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,        // strip unknown properties
  forbidNonWhitelisted: true,
  transform: true,        // coerce plain payloads into DTO instances
}));
```
Decorate DTO fields with `class-validator`. The pipe rejects invalid payloads before they reach a handler.

## Do / Don't
- DO keep business logic in services; keep resolvers/controllers thin.
- DO inject `ConfigService` instead of reading `process.env` directly.
- DON'T create circular module dependencies; if unavoidable, use `forwardRef()` deliberately and document why.
- DON'T put DB access in resolvers/controllers.

## Testing
Unit-test services with mocked providers; e2e-test the HTTP/GraphQL surface with Supertest. See [references/testing.md](references/testing.md) for full examples.
