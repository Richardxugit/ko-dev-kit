# Design System — Project Context

A multi-brand, reusable, accessible React component library built on **MUI v6 + Storybook 10**. Components are consumed by downstream applications (multiple brands), so the public API, theming contract, and accessibility guarantees are the product.

## Stack

- **React 18** + **TypeScript 5.x** (strict)
- **MUI v6** — component primitives, theming engine
- **Emotion** — MUI's styling engine
- **Tailwind CSS 3.4** — utility styling (alongside Emotion)
- **Storybook 10** (`@storybook/nextjs` framework) — development, documentation, interaction tests
- **tsup (esbuild)** — bundler, with `"use client"` banner for RSC compatibility
- **Vitest** + Testing Library + **vitest-axe** — testing
- **Plop** — component scaffolding (standard 6-file template)
- **semantic-release** — automated versioning via Conventional Commits
- **pnpm** — package manager
- **Node 22**

## Multi-brand architecture

This design system serves multiple brands from a single codebase:
- **`THEME` env var** (`kmart` | `target`) determines the brand at compile time.
- Brand tokens live in `src/configs/<brand>/tokens/` (palette, spacing, radius, typography, etc.).
- Two builds ship as different package subpaths (`.` for primary, `./<brand>` for secondary).
- **ThemeWrapper** detects `__KOSMOS_brand` marker to avoid double-wrapping.
- Components use `OmitKeys<MuiProps, ...>` to restrict MUI's API surface.
- MUI class prefix: `kosmos-ds-` (avoids collisions with consumer apps).

## Repo layout

```
src/
  components/
    ui/
      <category>/           # e.g., actions, forms, feedback, navigation
        <Component>/
          <Component>.tsx         # implementation (uses ThemeWrapper)
          <Component>.test.tsx    # unit tests
          <Component>.a11y.tsx    # accessibility tests (vitest-axe)
          <Component>.stories.tsx # Storybook stories (both brands)
          <Component>.mdx        # documentation
          index.ts               # barrel export
      latest.ts             # PUBLIC barrel — component is not public until here
  configs/
    kmart/
      tokens/               # Brand-specific design tokens
        palette.ts, spacing.ts, radius.ts, typography.ts, animation.ts
        components/          # Component-specific overrides
    target/
      tokens/               # Same structure, different values
  libs/
    theme-wrapper/          # ThemeWrapper component
.storybook/
  main.ts
  preview.tsx               # Global decorators, brand switching
```
<!-- run /ko-onboard to confirm actual categories and component names -->

## Key commands

```bash
# Development
pnpm storybook              # run Storybook locally
pnpm build:storybook        # build static Storybook

# Build
THEME=kmart pnpm build      # build Kmart bundle
THEME=target pnpm build     # build Target bundle

# Test
pnpm test                   # unit + a11y tests (Vitest)
pnpm lint                   # ESLint + type-check

# Scaffold new component
pnpm plop                   # generates 6-file structure

# Publish (automated via CI + semantic-release)
```

## Conventions

- **ThemeWrapper required.** Every component wraps in `ThemeWrapper`, never bare `ThemeProvider`.
- **Never hardcode values.** All colors, spacing, radii, fonts from theme tokens. Add tokens first, reference second.
- **OmitKeys pattern.** Restrict MUI API surface for consumers.
- **6-file components.** Use `pnpm plop` to scaffold. Not public until in `latest.ts`.
- **Version suffixes.** Breaking changes use `ButtonV3`, `CardV2` — never break existing APIs.
- **Strict ESLint.** complexity ≤ 8, max-statements ≤ 10, max-depth ≤ 3.
- **Both brands.** Add tokens to ALL brands simultaneously. Test under both in stories.
- **`"use client"` banner.** tsup adds it automatically for RSC compatibility.
- **Accessibility.** WCAG 2.2 AA. vitest-axe must pass. See `wcag-2.2-aa` skill.
- **Commits.** Conventional Commits: `feat(button):`, `fix(theme):`. BREAKING CHANGE footer for majors.

## Skills & rules
- Rules: `.cursor/rules/design-system.mdc`
- Skills: `mui-theming`, `multi-brand-theming`, `component-api-design`, `storybook`, `wcag-2.2-aa`
- Commands: `/ko-ds-component`

## Delivery

- **Product family repos & local paths:** <!-- run /ko-onboard: sibling repos + checkout paths -->
- **Deploy pipelines:** <!-- run /ko-onboard: Buildkite pipeline names + nonProd/prod step names -->
- **Feature flags:** <!-- run /ko-onboard: flag tool + key naming convention -->
- **Post-deploy sanity:** <!-- run /ko-onboard: sanity/smoke command + dashboards/monitors to watch -->
