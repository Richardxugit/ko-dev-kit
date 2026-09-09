---
name: multi-brand-theming
description: Compile-time multi-brand design system theming — THEME env var, ThemeWrapper pattern, __KOSMOS_brand detection, per-brand token organization, and dual-build publishing. Use when adding components that need brand-specific styling, creating new theme tokens, or debugging brand switching.
---

# Multi-Brand Theming

Pattern for a design system that serves multiple brands (e.g., Kmart and Target) from a single codebase, with brand selection at compile time.

## Architecture overview

```
src/configs/
├── kmart/
│   └── tokens/
│       ├── palette.ts        # Brand colors
│       ├── spacing.ts        # Spacing scale
│       ├── radius.ts         # Border radii
│       ├── breakpoints.ts    # Responsive breakpoints
│       ├── typography.ts     # Font families, sizes, weights
│       ├── animation.ts      # Timing functions, durations
│       └── components/       # Component-specific overrides
│           ├── button.ts
│           ├── chip.ts
│           └── switch.ts
└── target/
    └── tokens/
        ├── palette.ts        # Different brand colors
        ├── spacing.ts        # May differ or be shared
        └── ...               # Same structure, different values
```

## Compile-time brand selection

The `THEME` environment variable determines which brand bundle is built:

```bash
THEME=kmart pnpm build    # Produces Kmart bundle
THEME=target pnpm build   # Produces Target bundle
```

The build tooling (tsup/esbuild) resolves brand-specific imports at compile time:

```ts
// src/configs/index.ts
const brand = process.env.THEME || 'kmart';
export { theme } from `./${brand}/theme`;
```

Two separate bundles ship as package export subpaths:
- `@scope/design-system` → Kmart (default)
- `@scope/design-system/target` → Target

## ThemeWrapper pattern

Every component uses `ThemeWrapper` instead of manually providing `ThemeProvider`:

```tsx
// src/libs/theme-wrapper/theme-wrapper.tsx
import { ThemeProvider, useTheme } from '@mui/material/styles';
import { theme } from '../configs';

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const existingTheme = useTheme();
  
  // If a Kosmos theme is already in the tree, don't double-wrap
  if (existingTheme && (existingTheme as any).__KOSMOS_brand) {
    return <>{children}</>;
  }
  
  return (
    <ThemeProvider theme={{ ...theme, __KOSMOS_brand: true }}>
      {children}
    </ThemeProvider>
  );
}
```

### How it works:
1. Component renders → `ThemeWrapper` checks if a Kosmos theme exists in the React tree.
2. Detects via `__KOSMOS_brand` marker on the theme object.
3. If present: renders children directly (avoids double-wrap and theme reset).
4. If absent: wraps children in `ThemeProvider` with the correct brand theme.

### Rules:
- NEVER use `ThemeProvider` directly in component code — always use `ThemeWrapper`.
- NEVER remove or rename the `__KOSMOS_brand` marker — it's the detection mechanism.
- Consumer apps should provide `ThemeWrapper` once at the root; components gracefully handle either case.

## Token organization

Tokens define the brand's visual identity. Each token file exports a typed object:

```ts
// src/configs/kmart/tokens/palette.ts
export const palette = {
  primary: {
    main: '#e31837',      // Kmart red
    light: '#ff4d5e',
    dark: '#a10023',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#1a1a1a',
    light: '#484848',
    dark: '#000000',
    contrastText: '#ffffff',
  },
  // ... error, warning, info, success, background, text
} as const;
```

```ts
// src/configs/target/tokens/palette.ts
export const palette = {
  primary: {
    main: '#cc0000',      // Target red (different shade)
    light: '#ff3333',
    dark: '#990000',
    contrastText: '#ffffff',
  },
  // ... same shape, different values
} as const;
```

### Rules for tokens:
- Every brand MUST define the same token shape (same keys, same structure).
- Type the token interfaces so mismatches are caught at compile time.
- Raw hex/RGB values are BANNED outside token files — always reference via `theme.palette.*`, `theme.spacing()`, etc.
- Add new tokens to ALL brands simultaneously.

## Component-specific token overrides

For component-level brand differences beyond palette/spacing:

```ts
// src/configs/kmart/tokens/components/button.ts
export const buttonTokens = {
  borderRadius: '4px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  sizes: {
    small: { height: 32, fontSize: 12, padding: '0 12px' },
    medium: { height: 40, fontSize: 14, padding: '0 16px' },
    large: { height: 48, fontSize: 16, padding: '0 24px' },
  },
};
```

## Adding a new component with brand awareness

1. Create the component at `src/components/ui/<category>/<component>/`.
2. Use `ThemeWrapper` in the component's render.
3. Reference ALL visual values from the theme — never hardcode.
4. If the component needs brand-specific overrides beyond the standard theme:
   - Add a token file to BOTH brand configs: `src/configs/<brand>/tokens/components/<component>.ts`.
   - Import and apply in the component via `useTheme()`.
5. Test with BOTH brands: stories should render under each brand's theme.
6. Accessibility tests must pass for both brands (contrast ratios may differ).

## Stories for multi-brand

```tsx
// Button.stories.tsx
export const KmartDefault: StoryObj = {
  parameters: { theme: 'kmart' },
};

export const TargetDefault: StoryObj = {
  parameters: { theme: 'target' },
};
```

The Storybook decorator reads the `theme` parameter and wraps in the appropriate `ThemeProvider`.

## Do / Don't
- DO add new tokens to ALL brands at the same time — never just one.
- DO use `ThemeWrapper` in every component — never bare `ThemeProvider`.
- DO type token interfaces so brand mismatches fail at compile time.
- DO test components under both brands in stories and visual regression.
- DON'T hardcode hex colors, pixel spacing, or font values in components.
- DON'T check `process.env.THEME` at runtime in components — it's resolved at build time.
- DON'T remove `__KOSMOS_brand` — it prevents double-wrapping.
