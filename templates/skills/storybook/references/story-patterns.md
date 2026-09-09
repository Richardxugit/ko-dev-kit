# Story Patterns

Annotated CSF3 reference for the design system. Read when writing stories for stateful, interactive, or theme-sensitive components.

## Table of contents

- [Full CSF3 example with a play() interaction test](#full-csf3-example-with-a-play-interaction-test)
- [Composing states from a base story](#composing-states-from-a-base-story)
- [Interaction test patterns](#interaction-test-patterns)
- [Light/dark toolbar](#lightdark-toolbar)
- [Per-story decorators](#per-story-decorators)
- [argTypes reference](#argtypes-reference)

---

## Full CSF3 example with a play() interaction test

A `Counter` component that exposes default, disabled, and an interaction-tested story. This is the shape every story file should follow.

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { Counter } from './Counter';

const meta = {
  title: 'Components/Counter',
  component: Counter,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A stepper that increments and decrements a numeric value.',
      },
    },
  },
  args: {
    label: 'Quantity',
    defaultValue: 0,
    min: 0,
    max: 10,
  },
  argTypes: {
    onChange: { action: 'changed' },
    disabled: { control: 'boolean' },
    min: { control: 'number' },
    max: { control: 'number' },
  },
} satisfies Meta<typeof Counter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { ...Default.args, disabled: true },
};

export const AtMax: Story = {
  args: { ...Default.args, defaultValue: 10 },
};

// Interaction test: clicking increment twice raises the value and fires onChange.
export const IncrementsOnClick: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const increment = canvas.getByRole('button', { name: /increment/i });

    await userEvent.click(increment);
    await userEvent.click(increment);

    await expect(canvas.getByRole('spinbutton')).toHaveValue(2);
    await expect(args.onChange).toHaveBeenCalledTimes(2);
  },
};
```

Notes:
- `satisfies Meta<typeof Counter>` + `StoryObj<typeof meta>` type-checks args against props.
- `onChange` is wired via `argTypes.action`, so `args.onChange` is a spy you can assert on in `play()`.
- Queries use role + accessible name, which validates the component is labeled correctly.

---

## Composing states from a base story

Reuse `Default.args` rather than repeating props:

```tsx
export const Loading: Story = { args: { ...Default.args, loading: true } };
export const ErrorState: Story = { args: { ...Default.args, error: 'Could not load' } };
export const Empty: Story = { args: { ...Default.args, items: [] } };
```

Name the error story `ErrorState`, not `Error` — `Error` shadows the JS global.

---

## Interaction test patterns

```tsx
import { within, userEvent, expect, waitFor } from '@storybook/test';

// Form submission
export const SubmitsForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.click(canvas.getByRole('button', { name: /sign up/i }));
    await expect(canvas.getByText(/check your inbox/i)).toBeVisible();
  },
};

// Keyboard operability — components must work without a mouse
export const OpensWithKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /options/i });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('menu')).toBeVisible();
  },
};

// Async UI — wait for state to settle
export const LoadsResults: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /search/i }));
    await waitFor(() => {
      expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    await expect(canvas.getByRole('list')).toBeVisible();
  },
};
```

---

## Light/dark toolbar

Expose a theme switcher and select the palette in a decorator. Put this in `.storybook/preview.tsx`:

```tsx
import type { Preview } from '@storybook/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme, darkTheme } from '../src/theme';

const preview: Preview = {
  globalTypes: {
    mode: {
      description: 'Color mode',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.mode === 'dark' ? darkTheme : lightTheme;
      return (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Story />
        </ThemeProvider>
      );
    },
  ],
};

export default preview;
```

---

## Per-story decorators

Wrap a single story when it needs extra context (fixed width, surface background, router):

```tsx
export const InNarrowContainer: Story = {
  decorators: [
    (Story) => (
      // Box pulls its values from the theme — no hardcoded px or colors.
      <Box sx={{ width: 320, p: 2, bgcolor: 'background.paper' }}>
        <Story />
      </Box>
    ),
  ],
  args: { ...Default.args },
};
```

---

## argTypes reference

```tsx
argTypes: {
  // Union prop → dropdown
  variant: {
    control: 'select',
    options: ['primary', 'secondary', 'ghost'],
    description: 'Visual style',
  },
  // Small set → radio
  size: { control: 'radio', options: ['small', 'medium', 'large'] },
  // Boolean toggle
  disabled: { control: 'boolean' },
  // Callback → action spy (assertable in play())
  onClick: { action: 'clicked' },
  // Hide internal prop from controls + autodocs
  className: { table: { disable: true } },
}
```
