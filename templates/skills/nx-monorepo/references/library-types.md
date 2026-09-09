# Library Types & Allowed Dependencies

Every Nx library is exactly one type. The type determines what it may import. Enforcing this
keeps the dependency graph acyclic and the architecture legible: data flows up from `util`,
through `data-access` and `ui`, into `feature`, and finally into thin `apps`.

## The four types

### `type:feature`
Smart, route- or use-case-level building blocks. They orchestrate: fetch data via
`data-access`, render it with `ui` components, own page-level state and navigation.

- **Contains:** route components, page containers, feature-level routing, orchestration hooks.
- **May depend on:** `feature` (sparingly), `ui`, `data-access`, `util`.
- **Must not:** be imported by `ui` or `util` libs; contain reusable presentational primitives
  (move those to a `ui` lib).

```ts
// libs/orders/feature/src/lib/OrdersPage.tsx
import { useOrders } from '@org/orders-data-access'; // data-access ✓
import { OrderList } from '@org/orders-ui';          // ui ✓
import { formatMoney } from '@org/shared-util';      // util ✓

export function OrdersPage() {
  const { data } = useOrders();
  return <OrderList orders={data} format={formatMoney} />;
}
```

### `type:ui`
Presentational components only. Given props, render markup — no data fetching, no global
state, no routing.

- **Contains:** dumb/presentational components, styling, component-local state.
- **May depend on:** `ui`, `util`.
- **Must not:** import `data-access` or `feature`; call APIs; read global stores.

```ts
// libs/orders/ui/src/lib/OrderList.tsx
import { clsx } from '@org/shared-util'; // util ✓

export interface OrderListProps {
  orders: ReadonlyArray<{ id: string; total: number }>;
  format: (n: number) => string;
}

export function OrderList({ orders, format }: OrderListProps) {
  return (
    <ul>
      {orders.map((o) => (
        <li key={o.id}>{format(o.total)}</li>
      ))}
    </ul>
  );
}
```

### `type:data-access`
The boundary to the outside world and server state.

- **Contains:** API clients, query/mutation hooks, server-state caches, stores, DTO mapping.
- **May depend on:** `data-access`, `util`.
- **Must not:** import `ui` or `feature`; render JSX.

```ts
// libs/orders/data-access/src/lib/useOrders.ts
import { httpGet } from '@org/shared-util'; // util ✓

export function useOrders() {
  // query hook returning server state — no JSX, no UI imports
  return useQuery({ queryKey: ['orders'], queryFn: () => httpGet('/orders') });
}
```

### `type:util`
The leaf layer: pure, dependency-light helpers.

- **Contains:** pure functions, shared types/interfaces, constants, formatters.
- **May depend on:** `util` only.
- **Must not:** import any other type; have side effects; render JSX or fetch.

```ts
// libs/shared/util/src/lib/format-money.ts
export const formatMoney = (cents: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
```

## Allowed-dependency matrix

| Source ↓ \ Target → | feature | ui  | data-access | util |
| ------------------- | :-----: | :-: | :---------: | :--: |
| **feature**         |   ✓*    |  ✓  |      ✓      |  ✓   |
| **ui**              |    ✗    |  ✓  |      ✗      |  ✓   |
| **data-access**     |    ✗    |  ✗  |      ✓      |  ✓   |
| **util**            |    ✗    |  ✗  |      ✗      |  ✓   |

\* feature → feature is allowed but should be rare; prefer composing shared pieces from `ui`/`util`.

## Scope tags

Layer the `type:*` rules with `scope:*` tags to fence domains. A `scope:orders` lib may
depend on `scope:orders` and `scope:shared`, but not on `scope:billing` internals — share
across domains only through `scope:shared` libs.

```jsonc
{ "tags": ["scope:orders", "type:feature"] }
```

Encode both constraint families in `@nx/enforce-module-boundaries` `depConstraints` (one
block per `type:*`, one per `scope:*`). When a rule fires, change the library's type or
relocate the code — never disable the rule.
