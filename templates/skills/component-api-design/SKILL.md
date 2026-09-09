---
name: component-api-design
description: Designing clean, well-typed React component APIs for a reusable library — prop naming, composition over configuration, forwardRef, polymorphic as/component prop, controlled vs uncontrolled, slot/render props, sensible defaults, accessibility baked in, and avoiding boolean explosion. Use when defining or reviewing a component's props/public interface.
---

# Component API Design

A component's props are its contract. In a shared library that contract is the product — get it wrong and every consumer pays. Design for clarity, predictability, and extensibility.

## Prop naming

- **Booleans** read as states: `disabled`, `loading`, `selected`, `open` — not `isDisabled`, `enableLoading`.
- **Handlers** are `onX` for events, fired with the new value: `onChange`, `onOpenChange`, `onSelect`.
- **Render content** uses `children`; named regions use slot props (`startIcon`, `header`).
- Match the platform: `value`/`defaultValue`, `name`, `id`, `placeholder` — don't reinvent HTML names.

## Composition over configuration

Prefer composable children and slots over a wide config object. Composition scales; configuration accumulates props forever.

```tsx
// Good — composable
<Card>
  <Card.Header title="Report" action={<IconButton aria-label="More" />} />
  <Card.Body>{content}</Card.Body>
</Card>

// Bad — configuration sprawl
<Card
  title="Report"
  headerAction={<IconButton />}
  showHeader
  bodyContent={content}
  bodyPadding="large"
/>
```

## Avoid boolean explosion — prefer a variant union

Multiple booleans create impossible/ambiguous combinations and don't scale. Use a string-union prop.

```tsx
// Bad — what does primary + danger mean?
interface ButtonProps {
  primary?: boolean;
  secondary?: boolean;
  danger?: boolean;
  ghost?: boolean;
}

// Good — exactly one, type-safe, extensible
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
}
```

Reserve booleans for genuinely independent states (`disabled`, `loading`).

## forwardRef

Every interactive/focusable component forwards a ref to its underlying DOM node so parents can focus, measure, or scroll to it. Type the ref.

```tsx
import { forwardRef } from 'react';

interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = 'primary', ...rest }, ref) {
    return <button ref={ref} data-variant={variant} {...rest} />;
  },
);
```

Extending `ComponentPropsWithoutRef<'button'>` lets consumers pass `type`, `aria-*`, `data-*`, `onClick`, etc. for free.

## Polymorphic as / component prop

Let consumers change the rendered element while keeping styles and behavior. MUI uses `component`; a generic library often uses `as`.

```tsx
type PolymorphicProps<E extends React.ElementType> = {
  as?: E;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<E>, 'as' | 'children'>;

function Text<E extends React.ElementType = 'span'>({ as, ...rest }: PolymorphicProps<E>) {
  const Component = as ?? 'span';
  return <Component {...rest} />;
}

// <Text as="h1">Title</Text>  → renders an <h1>, props typed for h1
// <Text as={Link} to="/x">Go</Text>
```

This keeps a `Button` semantically a button while letting it render as an anchor when it navigates.

## Controlled vs uncontrolled

Support both. `value` + `onChange` is controlled; `defaultValue` is uncontrolled. Pick the mode from whether `value` is provided and stay in it.

```tsx
import { useState, useCallback } from 'react';

interface ToggleProps {
  checked?: boolean;          // controlled
  defaultChecked?: boolean;   // uncontrolled
  onChange?: (checked: boolean) => void;
}

function useControlled({ checked, defaultChecked = false, onChange }: ToggleProps) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState(defaultChecked);
  const value = isControlled ? checked : internal;

  const setValue = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [value, setValue] as const;
}
```

Don't flip modes mid-life: a component controlled on first render must stay controlled.

## Slot and render props

For customizing pieces without forking the component, accept a slot (a node) or a render prop (a function) — render props win when the consumer needs internal state.

```tsx
interface SelectProps<T> {
  options: T[];
  // Slot: replace the empty UI
  emptyState?: React.ReactNode;
  // Render prop: customize each option with access to its state
  renderOption?: (option: T, state: { selected: boolean }) => React.ReactNode;
}
```

Keep slots optional with sensible default rendering.

## Sensible defaults

The common case should need no configuration. Default `variant`, `size`, and `type` so `<Button>Save</Button>` just works. Defaults live in the signature (`variant = 'primary'`) or, for MUI components, in the theme's `defaultProps`.

## Accessibility baked in

The component must be accessible by default — not only when the consumer remembers ARIA.

- Render correct semantics (`<button>`, not `<div onClick>`); require an accessible name (`children` text or an `aria-label`/`aria-labelledby` prop).
- Forward `aria-*` and `id` (covered by extending the element's props).
- For icon-only controls, make the label required in the type so it can't be forgotten:

```tsx
interface IconButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  icon: React.ReactNode;
  'aria-label': string; // required — icon-only buttons must be labeled
}
```

- Manage focus and keyboard for composite widgets (menus, dialogs). See the `wcag-2.2-aa` skill.

## Good vs bad — at a glance

| Concern | Bad | Good |
|---------|-----|------|
| Variants | `primary` + `danger` + `ghost` booleans | `variant: 'primary' \| 'danger' \| 'ghost'` |
| Naming | `isOpen`, `enableClose` | `open`, `onClose` |
| Extensibility | fixed prop list | extends `ComponentPropsWithoutRef<'button'>` |
| Element | `<div onClick>` | semantic element + `as`/`component` |
| State | controlled-only or uncontrolled-only | supports both |
| a11y | optional, consumer's job | required name, semantics by default |
