---
name: graphql-apollo
description: GraphQL with Apollo in NestJS (code-first) — object/input types, queries/mutations/subscriptions, field resolvers, DataLoader for N+1, error handling, context/auth, Apollo Server setup, and Apollo Studio reporting. Use when building or reviewing GraphQL resolvers, schema types, or the Apollo driver setup.
---

# GraphQL with Apollo (NestJS, code-first)

Conventions for the GraphQL layer. Pair with `nestjs-patterns` for module/DI/testing details.

## Apollo Server setup
Use the Apollo driver with code-first schema generation. The SDL file is generated from decorators on boot.

```ts
// app.module.ts
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: 'schema.gql',     // code-first: generated SDL
      sortSchema: true,
      playground: false,                // use Apollo Sandbox in dev instead
      context: ({ req }) => ({ req }),  // expose request to resolvers (auth, loaders)
    }),
  ],
})
export class AppModule {}
```

## Object types and inputs
Models are `@ObjectType()`; mutation/query inputs are `@InputType()` and validated.

```ts
@ObjectType()
export class User {
  @Field(() => ID) id: string;
  @Field() email: string;
  @Field({ nullable: true }) displayName?: string;
  @Field(() => [Post]) posts: Post[];
}

@InputType()
export class CreateUserInput {
  @Field() @IsEmail() email: string;
  @Field({ nullable: true }) @IsOptional() @IsString() displayName?: string;
}
```

Always pass an explicit type thunk for arrays and non-scalar fields: `@Field(() => [Post])`.

## Queries and mutations
Resolvers are thin: parse args, call a service, return.

```ts
@Resolver(() => User)
export class UserResolver {
  constructor(private readonly users: UserService) {}

  @Query(() => User, { name: 'user' })
  getUser(@Args('id', { type: () => ID }) id: string) {
    return this.users.findOne(id);
  }

  @Mutation(() => User)
  createUser(@Args('input') input: CreateUserInput) {
    return this.users.create(input);
  }
}
```

## Field resolvers (`@ResolveField`)
Resolve derived or related fields lazily — only when the client selects them.

```ts
@ResolveField(() => [Post])
posts(@Parent() user: User, @Context() ctx: GqlContext) {
  return ctx.loaders.postsByUser.load(user.id); // batched via DataLoader
}
```

Do not eagerly fetch relations in the root query if a field resolver can load them on demand.

## DataLoader — defeat N+1
Without batching, resolving `posts` for N users issues N queries. A per-request DataLoader collapses them into one batched call keyed by parent id.

```ts
// posts.loader.ts
export function createPostsByUserLoader(postService: PostService) {
  return new DataLoader<string, Post[]>(async (userIds) => {
    const posts = await postService.findByUserIds([...userIds]); // ONE query
    const byUser = new Map<string, Post[]>();
    for (const p of posts) {
      (byUser.get(p.userId) ?? byUser.set(p.userId, []).get(p.userId)!).push(p);
    }
    return userIds.map((id) => byUser.get(id) ?? []);
  });
}
```

Build loaders **per request** (fresh cache each request) and put them on the GraphQL context:

```ts
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: 'schema.gql',
  context: ({ req }) => ({
    req,
    loaders: { postsByUser: createPostsByUserLoader(postService) },
  }),
});
```

The loader's batch function must return one result per input key, in the same order. Never call `.load()` inside a manual loop that also queries.

## Subscriptions
Use a `PubSub` (in-memory for single instance; Redis-backed for multi-instance).

```ts
@Subscription(() => User)
userCreated() {
  return this.pubSub.asyncIterator('userCreated');
}

// in the mutation, after create:
this.pubSub.publish('userCreated', { userCreated: user });
```

Enable subscriptions in the driver config (`subscriptions: { 'graphql-ws': true }`).

## Context and auth
Authenticate in a guard; read the user off the GraphQL context. Convert the execution context with `GqlExecutionContext`.

```ts
@Injectable()
export class GqlAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    return Boolean(req.user); // populated by upstream auth middleware/strategy
  }
}

// expose current user to resolvers
export const CurrentUser = createParamDecorator(
  (_data, context: ExecutionContext) =>
    GqlExecutionContext.create(context).getContext().req.user,
);
```

## Error handling
Throw typed exceptions; map them with a global GraphQL exception filter so clients get clean, predictable errors.

```ts
throw new GraphQLError('User not found', {
  extensions: { code: 'NOT_FOUND' },
});
```

- Use stable machine-readable `extensions.code` values for clients to branch on.
- In production, disable stack traces and avoid leaking internal messages. Log full detail server-side.

## Apollo Studio: schema reporting and metrics
Connect the graph to Apollo Studio for schema registry and usage metrics. Provide credentials via env (no secrets in code):

```bash
APOLLO_KEY=service:my-graph:xxxxx
APOLLO_GRAPH_REF=my-graph@current
APOLLO_SCHEMA_REPORTING=true
```

```ts
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: 'schema.gql',
  plugins: [
    // usage reporting is auto-enabled when APOLLO_KEY + APOLLO_GRAPH_REF are set
    ApolloServerPluginUsageReporting(),
    ...(process.env.APOLLO_SCHEMA_REPORTING === 'true'
      ? [ApolloServerPluginSchemaReporting()]
      : []),
  ],
});
```

This streams operation metrics (field usage, latency, error rates) and registers the schema for change/breakage detection in CI.

## Federation

For a federated supergraph, use the `ApolloFederationDriver` and mark entities with Federation directives.

### Setup
```ts
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';

GraphQLModule.forRoot<ApolloFederationDriverConfig>({
  driver: ApolloFederationDriver,
  autoSchemaFile: true,
});
```

### Entity ownership with @key
```ts
@ObjectType()
@Directive('@key(fields: "id")')
export class Product {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() price: number;
}
```

### @ResolveReference — entity resolution across subgraphs
When the router needs to resolve your entity from another subgraph's reference:

```ts
@Resolver(() => Product)
export class ProductResolver {
  constructor(private readonly productService: ProductService) {}

  @ResolveReference()
  async resolveReference(ref: { __typename: string; id: string }): Promise<Product> {
    return this.productService.findById(ref.id);
  }
}
```

### Extending entities from other subgraphs
```ts
// In orders-service, referencing Product (owned by catalogue-service)
@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class Product {
  @Field(() => ID) @Directive('@external') id: string;
}
```

### Apollo Rover CLI (CI integration)
```bash
# Check schema composes correctly (run in CI on every PR)
npx rover subgraph check <GRAPH_REF> --name <subgraph> --schema ./schema.gql

# Publish schema to registry (run on merge to main)
npx rover subgraph publish <GRAPH_REF> --name <subgraph> --schema ./schema.gql

# Compose locally for testing
npx rover supergraph compose --config supergraph-config.yaml
```

See the `apollo-federation` skill for comprehensive Federation patterns, entity ownership rules, and supergraph configuration.

## Do / Don't
- DO keep resolvers thin and push logic to services.
- DO batch every relation field through a per-request DataLoader.
- DON'T return raw entities with secret fields — expose only `@Field()`-decorated properties.
- DON'T share DataLoaders across requests (stale cache + cross-request leakage).
