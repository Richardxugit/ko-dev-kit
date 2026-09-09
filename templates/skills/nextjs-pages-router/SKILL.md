---
name: nextjs-pages-router
description: Next.js Pages Router patterns — getServerSideProps, getInitialProps on _app, _document.tsx with styled-components + MUI SSR, dynamic routes, Apollo SSR singleton, in-process caching, publicRuntimeConfig, and next.config.js with withNx. Use when building or modifying pages, data fetching, or SSR setup in a Pages Router Next.js app.
---

# Next.js Pages Router Patterns

The majority of apps in this repo use the Pages Router (`pages/` directory). This skill covers the conventions, data fetching, SSR setup, and caching strategies specific to the Pages Router.

## Data Fetching

### getServerSideProps (page-level)

Use `getServerSideProps` for page-level data that must be fresh on every request. This is the PRIMARY data fetching pattern — there is NO ISR (`getStaticProps` with `revalidate`) in this repo.

```tsx
import { GetServerSideProps, InferGetServerSidePropsType } from 'next'

interface OrdersPageProps {
  orders: Order[]
  countryCode: string
}

export const getServerSideProps: GetServerSideProps<OrdersPageProps> = async (context) => {
  const { req, res, query } = context

  // Set cache headers for CDN/browser caching (replaces ISR)
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

  const orders = await fetchOrders(query.page as string)

  return {
    props: {
      orders,
      countryCode: (req.headers['x-country-code'] as string) || 'AU',
    },
  }
}

export default function OrdersPage({
  orders,
  countryCode,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <OrderList orders={orders} country={countryCode} />
}
```

Key rules:
- Always type with `GetServerSideProps<PropsType>`.
- Use `InferGetServerSidePropsType` on the component for DRY prop types.
- Set `Cache-Control` headers explicitly — this repo uses CDN caching + `stale-while-revalidate` instead of ISR.
- Access request headers, cookies, and query params from `context`.
- Return `{ notFound: true }` for 404s, `{ redirect: { destination, permanent } }` for redirects.
- Use `Promise.allSettled` (or `Promise.all`) when fetching multiple data sources in parallel.

### getInitialProps on _app.tsx (global data)

`_app.tsx` uses `getInitialProps` to fetch global data shared across all pages: header, footer, navigation, Optimizely config, Auth0 session, and country code.

```tsx
import App, { AppContext, AppInitialProps } from 'next/app'

interface CustomAppProps extends AppInitialProps {
  headerData: HeaderData
  footerData: FooterData
  navData: NavData
}

class CustomApp extends App<CustomAppProps> {
  static async getInitialProps(appContext: AppContext): Promise<CustomAppProps> {
    const appProps = await App.getInitialProps(appContext)

    // Runs on EVERY page navigation (server + client)
    const [headerData, footerData, navData] = await Promise.all([
      fetchHeaderData(appContext.ctx),
      fetchFooterData(appContext.ctx),
      fetchNavData(appContext.ctx),
    ])

    return { ...appProps, headerData, footerData, navData }
  }

  render() {
    const { Component, pageProps, headerData, footerData, navData } = this.props
    return (
      <Providers>
        <Header data={headerData} />
        <Nav data={navData} />
        <Component {...pageProps} />
        <Footer data={footerData} />
      </Providers>
    )
  }
}

export default CustomApp
```

IMPORTANT: `getInitialProps` on `_app` disables Automatic Static Optimization for ALL pages. This is intentional — every page is SSR'd. A module-level `navigationPropsCache` short-circuits the heavy fetch on client-side navigations.

### In-process caching (replaces ISR)

Instead of ISR, this repo uses a TTL-based in-process cache (`cacheInstance`) for data that changes infrequently:

```tsx
import { cacheInstance } from '@kmartau/ko-ui-common'

export const getServerSideProps: GetServerSideProps = async () => {
  const cacheKey = 'homepage-promotions'
  let promotions = cacheInstance.get(cacheKey)

  if (!promotions) {
    promotions = await fetchPromotions()
    cacheInstance.set(cacheKey, promotions, { ttl: 3600000 }) // 1 hour
  }

  return { props: { promotions } }
}
```

Rules:
- Use in-process cache for shared data (nav, categories, CMS content, OnePass banners).
- Never cache user-specific data in the shared instance.
- The cache is per-server-instance — it does NOT share across pods.
- TTLs vary: 60s for volatile data, 3600s for stable CMS content.

## _document.tsx — Styled-Components + MUI SSR

`_document.tsx` handles server-side rendering of BOTH styled-components AND MUI v4 styles:

```tsx
import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document'
import { ServerStyleSheet as StyledComponentSheets } from 'styled-components'
import { ServerStyleSheets as MuiStyleSheets } from '@material-ui/core/styles'

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const styledComponentSheets = new StyledComponentSheets()
    const muiSheets = new MuiStyleSheets()
    const originalRenderPage = ctx.renderPage

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (props) =>
            styledComponentSheets.collectStyles(muiSheets.collect(<App {...props} />)),
        })

      const initialProps = await Document.getInitialProps(ctx)
      return {
        ...initialProps,
        styles: (
          <>
            {initialProps.styles}
            {styledComponentSheets.getStyleElement()}
            {muiSheets.getStyleElement()}
          </>
        ),
      }
    } finally {
      styledComponentSheets.seal()
    }
  }

  render() {
    return (
      <Html lang="en">
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
```

Key points:
- Both `ServerStyleSheet` (styled-components) and `ServerStyleSheets` (MUI) must be collected.
- styled-components wraps MUI's collect — order matters for CSS specificity.
- Always `seal()` the styled-components sheet in a `finally` block to prevent memory leaks.

## Dual ThemeProvider Pattern

This repo uses BOTH styled-components and MUI theme providers simultaneously:

```tsx
import { ThemeProvider as StyledComponentThemeProvider } from 'styled-components'
import { ThemeProvider as MaterialThemeProvider } from '@material-ui/core/styles'
import { CustomTheme } from '@kmartau/ko-ui-theme'
import { GlobalStyles } from '@kmartau/ko-ui-theme'

function CommonProviders({ children }: { children: React.ReactNode }) {
  return (
    <StyledComponentThemeProvider theme={CustomTheme}>
      <MaterialThemeProvider theme={CustomTheme}>
        <GlobalStyles theme={CustomTheme} />
        {children}
      </MaterialThemeProvider>
    </StyledComponentThemeProvider>
  )
}
```

- The same `CustomTheme` object is passed to both providers.
- Styled-components accesses theme via `${({ theme }) => theme.breakpoints.up('md')}` / `theme.palette.*`.
- MUI components access the theme via `useTheme()` or styled-components' theme prop.

## Dynamic Routes

Use catch-all routes for CMS-driven pages:

```tsx
// pages/category/[...slug].tsx
import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
  const slug = (params?.slug as string[])?.join('/') || ''
  const category = await fetchCategoryBySlug(slug)

  if (!category) return { notFound: true }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  return { props: { category } }
}

export default function CategoryPage({ category }: { category: CategoryData }) {
  return <CategoryView data={category} />
}
```

File-based routing patterns used in this repo:
- `pages/index.tsx` — homepage
- `pages/category/[...slug].tsx` — catch-all for category pages
- `pages/product/[...slug].tsx` — product pages (or redirects)
- `pages/[...slug].tsx` — catch-all for CMS/landing pages
- `pages/api/preview.ts` — Contentful preview mode API route

## Apollo Client SSR Singleton

Apollo Client is a module-level singleton (NOT created per-request):

```tsx
import { ApolloClient, InMemoryCache, ApolloLink, HttpLink } from '@apollo/client'

const contentfulLink = new HttpLink({
  uri: process.env.CONTENTFUL_GRAPHQL_URL,
  headers: { Authorization: `Bearer ${process.env.CONTENTFUL_ACCESS_TOKEN}` },
})

const gatewayLink = new HttpLink({ uri: process.env.GRAPHQL_GATEWAY_URL })

const link = ApolloLink.split(
  (operation) => operation.getContext().clientName === 'contentful',
  contentfulLink,
  gatewayLink
)

export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache(),
  ssrMode: typeof window === 'undefined',
})
```

Usage in `getServerSideProps`:
```tsx
const { data } = await apolloClient.query({
  query: GET_PRODUCTS,
  context: { clientName: 'contentful' }, // Routes to Contentful endpoint
})
```

Rules:
- The singleton means the Apollo cache persists across requests on the same server. This is intentional for shared data.
- Set `clientName` in the operation context to route queries: `'contentful'` → Contentful endpoint, omit → GraphQL gateway.
- For user-specific queries, ensure the cache key includes user context or use `fetchPolicy: 'no-cache'`.
- Run `pnpm nx fetchtypes <app>` before modifying GraphQL queries/mutations.

## next.config.js with withNx

```js
const { withNx } = require('@nx/next')

module.exports = withNx({
  transpilePackages: [
    '@kmartau/ko-ui-button',
    '@kmartau/ko-ui-header',
    '@ko-ui-lib/common',
    // ... all consumed packages
  ],
  publicRuntimeConfig: {
    GRAPHQL_URL: process.env.GRAPHQL_URL,
    CONTENTFUL_SPACE_ID: process.env.CONTENTFUL_SPACE_ID,
  },
  serverRuntimeConfig: {
    CONTENTFUL_ACCESS_TOKEN: process.env.CONTENTFUL_ACCESS_TOKEN,
  },
  compiler: {
    styledComponents: true,
  },
  images: {
    domains: ['images.ctfassets.net', 'cdn.kmart.com.au'],
  },
})
```

Key points:
- `withNx` wraps the config to integrate with the Nx build system.
- `transpilePackages` lists every workspace package dependency (required — packages have no build step).
- `publicRuntimeConfig` exposes values to client code (accessed via `getConfig().publicRuntimeConfig`).
- `serverRuntimeConfig` keeps secrets server-only (only available in `getServerSideProps`/`getInitialProps`).
- `compiler.styledComponents: true` enables the SWC styled-components plugin.

## publicRuntimeConfig / serverRuntimeConfig

Access runtime config in components and pages:

```tsx
import getConfig from 'next/config'

const { publicRuntimeConfig, serverRuntimeConfig } = getConfig()

// In components (client + server):
const graphqlUrl = publicRuntimeConfig.GRAPHQL_URL

// In getServerSideProps only:
const secret = serverRuntimeConfig.AUTH0_SECRET
```

Rules:
- Never import `serverRuntimeConfig` in client components — it's `undefined` there.
- Prefer runtime config over build-time env vars (`process.env.NEXT_PUBLIC_*`) when values differ per environment without rebuilding.
- Mock `next/config` in tests: `vi.mock('next/config', () => ({ default: () => ({ publicRuntimeConfig: { ... } }) }))`.

## Do / Don't

| Do | Don't |
|----|-------|
| Use `getServerSideProps` for page-level data | Use `getStaticProps` or ISR (not used in this repo) |
| Use in-process `cacheInstance` for shared data | Cache user-specific data in the shared instance |
| Set `Cache-Control` headers in `getServerSideProps` | Rely on default Next.js caching |
| Keep `_app.tsx` `getInitialProps` lean | Fetch page-specific data in `_app` |
| Collect BOTH styled-components AND MUI styles in `_document` | Forget the `seal()` call in `finally` |
| Use module-level Apollo singleton | Create a new Apollo Client per request |
| Set `clientName: 'contentful'` context for CMS queries | Send CMS queries to the GraphQL gateway |
| Add new packages to `transpilePackages` | Assume packages are auto-discovered |
| Mock `next/config` and `next/router` in tests | Import router/config directly in test code |
