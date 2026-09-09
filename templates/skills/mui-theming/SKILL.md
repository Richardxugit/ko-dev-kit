---
name: mui-theming
description: MUI theming for a design system — createTheme (palette/typography/spacing/shape), ThemeProvider, the sx prop, styled() API, component variants and styleOverrides, design tokens, light/dark modes, and useTheme. Use when defining or editing the theme, styling components, adding variants, or replacing hardcoded colors/spacing with theme tokens.
---

# MUI Theming

The theme is the single source of truth for every design value. Components read from it; they never inline colors, spacing, radii, or font sizes. This makes the whole library themeable and overridable from one place.

## Tokens first

Define raw design tokens, then feed them into the theme. Tokens are the vocabulary; the theme maps them onto MUI's structure.

```ts
// src/theme/tokens.ts
export const tokens = {
  color: {
    brand500: '#2f6feb',
    brand700: '#1f4fc4',
    neutral0: '#ffffff',
    neutral900: '#16181d',
    danger500: '#d23b3b',
  },
  radius: { sm: 4, md: 8, lg: 16 },
  // MUI's spacing factor is 8px by default; keep the scale consistent.
  spacingUnit: 8,
} as const;
```

## createTheme

`createTheme` assembles palette, typography, spacing, and `shape`. Reference tokens — never literal values scattered in components.

```ts
// src/theme/index.ts
import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: tokens.color.brand500, dark: tokens.color.brand700 },
    error: { main: tokens.color.danger500 },
    background: { default: tokens.color.neutral0, paper: tokens.color.neutral0 },
  },
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  spacing: tokens.spacingUnit, // sx={{ p: 2 }} → 16px
  shape: { borderRadius: tokens.radius.md },
});
```

## ThemeProvider

Wrap the app (and Storybook) once. `CssBaseline` applies the theme's baseline reset.

```tsx
import { ThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme } from './theme';

export function App({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
```

## The sx prop

`sx` is the fastest way to apply theme-aware, one-off styling. Use theme keys and the spacing scale — not raw pixels or hex.

```tsx
// Good — every value resolves through the theme
<Box sx={{ p: 2, mt: 1, bgcolor: 'background.paper', color: 'text.primary', borderRadius: 1 }} />

// Bad — hardcoded, unthemeable
<Box sx={{ padding: '16px', backgroundColor: '#fff', color: '#16181d', borderRadius: '8px' }} />
```

`borderRadius: 1` multiplies `theme.shape.borderRadius`; `p`/`m`/`gap` multiply `theme.spacing`. Color strings like `'primary.main'` and `'text.secondary'` resolve from the palette.

## styled() API

Use `styled()` for reusable, complex component styles. The callback receives `theme` — pull every value from it.

```tsx
import { styled } from '@mui/material/styles';

const Surface = styled('section')(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: theme.shadows[1],
}));
```

Prefer `sx` for instance-level tweaks; reach for `styled()` when the styling is reused or driven by props.

## Component variants and styleOverrides

Style and extend MUI (and your own) components centrally under `theme.components`. This is how variants stay consistent — define them once, not per instance.

```ts
const theme = createTheme({
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          paddingInline: theme.spacing(2),
        }),
      },
      variants: [
        {
          props: { variant: 'ghost' },
          style: ({ theme }) => ({
            backgroundColor: 'transparent',
            color: theme.palette.primary.main,
            '&:hover': { backgroundColor: theme.palette.action.hover },
          }),
        },
      ],
    },
  },
});
```

To register a custom `variant` value for TypeScript, augment the component's props:

```ts
declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    ghost: true;
  }
}
```

Use `variants` + `styleOverrides` instead of repeating one-off `sx` overrides across the app.

## Light/dark modes

Share tokens; only swap the palette. Build both themes from the same source.

```ts
const makeTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: { main: tokens.color.brand500 },
      background: {
        default: mode === 'light' ? tokens.color.neutral0 : tokens.color.neutral900,
        paper: mode === 'light' ? tokens.color.neutral0 : tokens.color.neutral900,
      },
    },
    spacing: tokens.spacingUnit,
    shape: { borderRadius: tokens.radius.md },
  });

export const lightTheme = makeTheme('light');
export const darkTheme = makeTheme('dark');
```

Use semantic palette slots (`text.primary`, `background.paper`, `action.hover`) so components adapt to mode automatically. Avoid checking `mode` inside components.

## useTheme

Read theme values in component logic (e.g. for `useMediaQuery`, computed styles, or passing values to non-MUI children).

```tsx
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

function Layout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  return <Box sx={{ gap: isDesktop ? 3 : 1 }} />;
}
```

## Do / don't

- **Do** add a token, then reference it. **Don't** inline a hex or px value.
- **Do** use the spacing scale (`p: 2`) and `shape.borderRadius`. **Don't** write `'16px'` or `'8px'`.
- **Do** put variants and overrides in `theme.components`. **Don't** scatter `sx` overrides to fake a variant.
- **Do** use semantic palette slots. **Don't** branch on `palette.mode` inside components.
