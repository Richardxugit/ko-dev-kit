---
name: storybook
description: Author Storybook stories (CSF3) for React + MUI components — args/argTypes/controls, autodocs, key states, play() interaction tests, the a11y addon, and ThemeProvider decorators. Use whenever creating or editing a *.stories.tsx file, scaffolding stories for a component.
---

# Storybook Authoring

Stories are the dev surface, documentation, and test harness for every component in the design system. Each component gets exactly one co-located story file written in **CSF3**.

For a complete, copy-ready example (meta + states + a `play()` interaction test), read `references/story-patterns.md`.

## Component Story Format 3 (CSF3)

Stories are plain objects (`StoryObj`) with a default-exported `meta` (`Meta`). No more `Template.bind({})`.

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Submit' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'select', options: ['small', 'medium', 'large'] },
    disabled: { control: 'boolean' },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

Use `satisfies Meta<typeof Component>` plus `StoryObj<typeof meta>` so args are type-checked against the component's props.

## args, argTypes, controls

- **`args`** set the props the story renders with. Put shared defaults on `meta.args`; override per story.
- **`argTypes`** configure the Controls panel and autodocs: `control: 'select' | 'boolean' | 'color' | 'radio' | 'text'`, `options`, `description`.
- Map union props to a `select`/`radio` control with `options` — never a free-text control.
- Hide internal props from controls: `argTypes: { className: { table: { disable: true } } }`.
- Log callbacks with `action`: `argTypes: { onClick: { action: 'clicked' } }`.

## autodocs

Add `tags: ['autodocs']` to `meta` to generate a documentation page from props (TSDoc comments on the props interface become descriptions) and stories. Write a short component description as a TSDoc comment above the component or in `parameters.docs.description.component`.

## Required states

Every story file covers the component's applicable states. Compose from a base story's args to avoid duplication:

| Story | Include when |
|-------|--------------|
| `Default` | Always |
| `Loading` | Component has a loading state |
| `ErrorState` | Component handles errors — name it `ErrorState`, not `Error` (avoids shadowing the JS global) |
| `Disabled` | Component can be disabled |
| `Empty` | Component can render with no data |

```tsx
export const Loading: Story = { args: { ...Default.args, loading: true } };
export const Disabled: Story = { args: { ...Default.args, disabled: true } };
```

## Interaction tests with play()

Use `play()` for interactive components — it simulates user behavior and asserts the result. Tests run in the Storybook UI and in CI via the test runner.

```tsx
import { within, userEvent, expect } from '@storybook/test';

export const ClickToOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /menu/i }));
    await expect(canvas.getByRole('menu')).toBeVisible();
  },
};
```

- Query by **role + accessible name** (`getByRole('button', { name: /submit/i })`), not by test id or class — this doubles as an accessibility check.
- Use `await` on every `userEvent` and `expect`.
- For async UI, use `waitFor` / `findBy*`.

## a11y addon

`@storybook/addon-a11y` runs axe-core on every story. Target AA in `.storybook/preview.tsx`:

```ts
parameters: {
  a11y: {
    options: { runOnly: ['wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] },
  },
},
```

Check the **Accessibility** tab and fix all violations before considering a story done. The addon catches roughly a third of issues — for full WCAG 2.2 AA coverage also do keyboard and screen-reader checks (see the `wcag-2.2-aa` skill).

## ThemeProvider decorator

Every MUI component needs the theme. Wrap all stories globally in `.storybook/preview.tsx`:

```tsx
import type { Preview } from '@storybook/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '../src/theme';

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
};
export default preview;
```

Add a story-level decorator only for extra wrapping (fixed width, dark surface). For light/dark switching, expose a `globalTypes` toolbar and select the palette in the decorator — see `references/story-patterns.md`.

## Conventions

- **Co-locate**: `Component.stories.tsx` next to `Component.tsx`.
- **Title**: `'Category/ComponentName'` (e.g. `'Components/Button'`, `'Inputs/TextField'`).
- **Layout**: `parameters.layout` — `'padded'` for components, `'centered'` for small ones, `'fullscreen'` for dialogs/banners.
- **Realistic data**: real names, dates, and copy — never lorem ipsum.

See `references/story-patterns.md` for the full annotated example, light/dark toolbar setup, and more interaction patterns.
