---
name: nextjs-app-router
description: Next.js App Router patterns — server vs client components, data fetching, "use client"/"use server" boundaries, route handlers, metadata, loading/error states, and caching strategies. Use when building or modifying pages, layouts, or API routes in a Next.js 14+ app using the App Router.
---

# Next.js App Router Patterns

Conventions for building with the Next.js App Router (`app/` directory). Default to Server Components; add client interactivity only where needed.

## Server vs Client Components

**Server Components** (default — no directive needed):
- Run only on the server. Can `await` data, access databases, read env vars.
- Render to HTML on the server. Zero JavaScript shipped to the client.
- Cannot use hooks (`useState`, `useEffect`), event handlers, or browser APIs.

**Client Components** (add `"use client"` at the top):
- Run on both server (initial render) and client (hydration + interactivity).
- Can use hooks, event handlers, Context, browser APIs.
- Every import in a `"use client"` file becomes part of the client bundle.

```tsx
// app/products/page.tsx — Server Component (default)
export default async function ProductsPage() {
  const products = await fetchProducts(); // Direct data access
  return <ProductList products={products} />;
}
```

```tsx
// components/AddToCartButton.tsx — Client Component
'use client';
import { useState } from 'react';

export function AddToCartButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  // ... event handlers, hooks, etc.
}
```

### The boundary rule:
- Push `"use client"` as far down the tree as possible. Only the interactive leaf needs it.
- A Server Component can import and render a Client Component (passing server data as props).
- A Client Component CANNOT import a Server Component (it would pull server code into the client bundle).
- Pass Server Components to Client Components as `children` or via slots (composition pattern).

## Data fetching

Fetch data directly in Server Components — no `useEffect`, no client-side loading states:

```tsx
// app/orders/page.tsx
async function getOrders() {
  const res = await fetch(`${process.env.API_URL}/orders`, {
    cache: 'no-store', // dynamic data
    // or: next: { revalidate: 60 } // revalidate every 60s
  });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export default async function OrdersPage() {
  const orders = await getOrders();
  return <OrderList orders={orders} />;
}
```

### Caching strategies:
| Strategy | When to use |
|----------|------------|
| `cache: 'force-cache'` (default) | Static data that rarely changes |
| `next: { revalidate: N }` | Data that changes periodically (ISR) |
| `cache: 'no-store'` | Always-fresh data (user-specific, real-time) |

## Route file conventions

| File | Purpose |
|------|---------|
| `page.tsx` | The route's UI (required for a route to be accessible) |
| `layout.tsx` | Shared UI wrapper (persists across child navigations) |
| `loading.tsx` | Instant loading UI (Suspense boundary) |
| `error.tsx` | Error boundary (must be `"use client"`) |
| `not-found.tsx` | 404 UI |
| `route.ts` | API route handler (replaces pages/api/) |

## Loading and error states

```tsx
// app/orders/loading.tsx — shows immediately while page.tsx streams
export default function Loading() {
  return <OrdersSkeleton />;
}
```

```tsx
// app/orders/error.tsx — catches errors from page.tsx
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Server Actions

Mutate data from Client Components without API routes:

```tsx
// app/actions/cart.ts
'use server';

export async function addToCart(productId: string) {
  // Server-side logic: validate, update DB, revalidate cache
  await db.cart.add(productId);
  revalidatePath('/cart');
}
```

```tsx
// components/AddToCartButton.tsx
'use client';
import { addToCart } from '@/app/actions/cart';

export function AddToCartButton({ productId }: { productId: string }) {
  return (
    <form action={addToCart.bind(null, productId)}>
      <button type="submit">Add to Cart</button>
    </form>
  );
}
```

## Metadata

```tsx
// Static metadata
export const metadata: Metadata = {
  title: 'Orders',
  description: 'View your orders',
};

// Dynamic metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.id);
  return { title: product.name, openGraph: { images: [product.image] } };
}
```

## Route handlers (API routes)

```ts
// app/api/products/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const products = await fetchProducts();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const body = await request.json();
  const product = await createProduct(body);
  return NextResponse.json(product, { status: 201 });
}
```

## Do / Don't
- DO default to Server Components. Only add `"use client"` when you need hooks/events/browser APIs.
- DO push `"use client"` boundaries as far down the tree as possible.
- DO use `loading.tsx` for instant loading states (streaming HTML).
- DO use Server Actions for mutations (simpler than API routes for form submissions).
- DON'T import server-only modules (DB clients, env vars) in `"use client"` files.
- DON'T use `useEffect` for data fetching in Server Components — just `await` directly.
- DON'T create API routes (`route.ts`) for data that only your own app consumes — fetch directly in Server Components.
- DON'T put `"use client"` on layout or page files unless absolutely necessary (it forces the entire subtree to be client-rendered).
