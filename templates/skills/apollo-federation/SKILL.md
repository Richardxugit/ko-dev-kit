---
name: apollo-federation
description: Apollo Federation subgraph architecture — entity ownership, @key/@extends/@external directives, @ResolveReference, Apollo Router composition, Rover CLI for schema checks, and supergraph config. Use when building or modifying federated GraphQL subgraphs, adding cross-service entity references, or debugging schema composition.
---

# Apollo Federation (NestJS subgraphs)

Conventions for building Apollo Federation subgraphs in NestJS. Each service owns a portion of the graph and resolves its entities independently.

## Subgraph setup

Use the Federation driver instead of the standard Apollo driver:

```ts
// app.module.ts
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: true, // code-first, in-memory
    }),
  ],
})
export class AppModule {}
```

## Entity ownership

Each subgraph **owns** specific entity types. Ownership means:
- You define the full `@ObjectType()` with all fields you own.
- You provide `@ResolveReference()` so the router can resolve your entity from just its key.
- Other subgraphs that need your entity extend it with `@extends` and `@external`.

```ts
// In the OWNING subgraph (e.g. account-service owns User)
@ObjectType()
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID) id: string;
  @Field() email: string;
  @Field() displayName: string;
}
```

## @ResolveReference

The router calls this when another subgraph references your entity. It receives a `{ __typename, ...keyFields }` reference.

```ts
@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }): Promise<User> {
    return this.userService.findById(reference.id);
  }
}
```

### Rules:
- `@ResolveReference()` must return the full entity (or null if not found).
- It only receives the key fields declared in `@key(fields: "...")`.
- For compound keys: `@key(fields: "id sku")` → reference has both `id` and `sku`.
- This is a **hot path** — keep it fast. Cache or batch where possible.

## Extending entities from other subgraphs

When your subgraph needs to add fields to another subgraph's entity:

```ts
// In orders-service, extending User (owned by account-service)
@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  @Directive('@external')
  id: string;
}

// Then add a field resolver in your domain
@Resolver(() => User)
export class UserOrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @ResolveField(() => [Order])
  async orders(@Parent() user: User): Promise<Order[]> {
    return this.ordersService.findByUserId(user.id);
  }
}
```

### Rules:
- Mark the extending type with `@Directive('@extends')`.
- Mark key fields with `@Directive('@external')` — you don't own them.
- Only add `@ResolveField()` for fields YOUR subgraph contributes.
- Never modify or re-define fields owned by another subgraph.

## Schema composition with Apollo Router

The router composes all subgraph schemas into a supergraph. Configuration:

```yaml
# supergraph-config.yaml
federation_version: =2
subgraphs:
  gateway:
    routing_url: http://localhost:4000/graphql
    schema:
      subgraph_url: http://localhost:4000/graphql
  account:
    routing_url: http://localhost:4001/graphql
    schema:
      subgraph_url: http://localhost:4001/graphql
  orders:
    routing_url: http://localhost:4002/graphql
    schema:
      subgraph_url: http://localhost:4002/graphql
```

## Rover CLI

Use Apollo Rover for schema operations in development and CI:

```bash
# Check if your local schema composes with the supergraph
npx rover subgraph check <GRAPH_REF> --name <subgraph> --schema ./schema.gql

# Push schema to Apollo Studio
npx rover subgraph publish <GRAPH_REF> --name <subgraph> --schema ./schema.gql --routing-url <url>

# Fetch the full composed supergraph schema
npx rover supergraph compose --config supergraph-config.yaml

# Introspect a running subgraph
npx rover subgraph introspect http://localhost:4001/graphql
```

### CI integration:
- Run `rover subgraph check` on every PR to catch breaking changes before merge.
- Run `rover subgraph publish` on merge to main to update the schema registry.

## Multiple @key directives

An entity can have multiple keys for different resolution paths:

```ts
@ObjectType()
@Directive('@key(fields: "id")')
@Directive('@key(fields: "sku")')
export class Product {
  @Field(() => ID) id: string;
  @Field() sku: string;
  @Field() name: string;
}
```

## Do / Don't
- DO keep entity ownership clear — one subgraph per entity's core fields.
- DO implement `@ResolveReference()` for every entity you own.
- DO run `rover subgraph check` in CI before merging.
- DON'T return partial entities from `@ResolveReference()` — return all owned fields.
- DON'T use `@Directive('@provides')` unless you genuinely need to override the owning subgraph's data.
- DON'T create circular entity dependencies between subgraphs (A extends B and B extends A on the same field).
