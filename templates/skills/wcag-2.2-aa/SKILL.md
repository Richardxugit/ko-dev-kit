---
name: wcag-2.2-aa
description: WCAG 2.2 Level AA accessibility for React UI — semantic HTML, ARIA only when needed, keyboard operability, visible focus, color/non-text contrast, target size, focus-not-obscured, reduced motion, accessible names, live regions, and an axe-core check in every component test. Use whenever creating, modifying, or reviewing any React component or `.tsx` UI.
---

# WCAG 2.2 Level AA for React

Accessibility is built in from the first line, not bolted on. This skill is React-generic and
shared across archetypes — keep guidance framework-React, not project-specific. For
copy-paste component patterns see [references/a11y-patterns.md](references/a11y-patterns.md).

## Order of operations

1. **Semantic HTML first.** A native element gives you role, keyboard behavior, focus, and
   states for free. Reach for `<button>`, `<a href>`, `<label>`, `<nav>`, `<dialog>`,
   `<table>`/`<th>` before anything custom.
2. **ARIA only when HTML can't express it.** "No ARIA is better than bad ARIA." A
   `<div role="button">` you then have to re-implement keyboard handling for should just be a
   `<button>`. Use ARIA to fill gaps (`aria-expanded`, `aria-controls`, `role="tablist"`),
   not to relabel native elements.
3. **Verify behavior, don't assume it.** Keyboard, focus, contrast, and announcements come
   from runtime, not JSX. Confirm in a rendered page or an axe test before claiming pass.

## Operability

- **Keyboard (2.1.1, 2.1.2):** everything operable with mouse must work with keyboard. No
  traps — you can Tab into and back out of every widget. Native controls handle this; custom
  ones need explicit `onKeyDown` for Enter/Space/Arrow/Escape.
- **Focus order (2.4.3):** DOM order matches visual order. Avoid positive `tabIndex`.
- **Visible focus (2.4.7):** every interactive element has a clear `:focus-visible` indicator.
  Never `outline: none` without a replacement.
- **Focus not obscured (2.4.11 — new in 2.2):** a focused element must not be fully hidden
  behind sticky headers/footers or overlays. Add `scroll-margin` or offset sticky regions.
- **Target size (2.5.8 — new in 2.2):** interactive targets are at least **24×24 px** (or
  have ≥24px spacing). Icon-only buttons are the usual offenders.
- **Dragging (2.5.7 — new in 2.2):** any drag action has a single-pointer alternative
  (e.g. reorder buttons alongside drag-and-drop).

## Perceivable

- **Contrast (1.4.3):** **4.5:1** for normal text, **3:1** for large text (≥18.66px, or ≥14px bold).
- **Non-text contrast (1.4.11):** **3:1** for UI component boundaries, icons, and focus indicators.
- **Not by color alone (1.4.1):** pair color with text, icon, or pattern (e.g. error state
  shows an icon and message, not just red).
- **Images (1.1.1):** meaningful `alt`; decorative images get `alt=""`.

## Understandable & Robust

- **Accessible names (4.1.2):** every control has a name — visible `<label>`, `aria-label`,
  or `aria-labelledby`. Icon-only buttons need an `aria-label`.
- **Errors (3.3.1):** describe errors in text and associate them with the field
  (`aria-describedby`, `aria-invalid`) — not color alone.
- **Live regions (4.1.3):** announce async/status changes with `role="status"` /
  `aria-live="polite"` (or `role="alert"` for errors). The region must exist in the DOM
  before its content updates.
- **Language (3.1.1):** `<html lang="en">` at the document root.

## Motion

Respect `prefers-reduced-motion`; offer a no/low-motion path for non-essential animation.

```tsx
const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
return <Panel animate={!reduceMotion} />;
```

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

## Axe check in every component test

Add an automated accessibility assertion to each component test with `jest-axe` (or
`vitest-axe`). It catches missing names, bad ARIA, and contrast regressions cheaply.

```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('has no axe violations', async () => {
  const { container } = render(<UserCard name="Ada" email="ada@example.com" />);
  expect(await axe(container)).toHaveNoViolations();
});
```

Axe is a floor, not a ceiling — it catches ~30-40% of issues. Still verify keyboard flow and
screen-reader names manually for anything interactive.

## Quick checklist (AA)

- [ ] Native element used where one exists; ARIA only fills real gaps
- [ ] Fully keyboard operable, no traps, logical focus order
- [ ] Visible `:focus-visible` indicator; focus not obscured by sticky UI
- [ ] Interactive targets ≥ 24×24px
- [ ] Text contrast 4.5:1 (3:1 large); non-text/UI contrast 3:1
- [ ] State not conveyed by color alone
- [ ] Every control has an accessible name; every input a programmatic label
- [ ] Errors described in text and associated with their field
- [ ] Async/status changes announced via a live region
- [ ] `prefers-reduced-motion` honored
- [ ] axe check passes in the component test
