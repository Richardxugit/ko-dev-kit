# ko-ds-component reference: implementation files (Step 5)

Loaded by `/ko-ds-component` Step 5. Per-file requirements:

**`<component-name>.tsx`:**
- Wrap in `<ThemeWrapper>`
- `OmitKeys<MuiProps, ...>` to restrict MUI surface
- `forwardRef<HTMLElement, Props>` typed explicitly
- Extend element props for `aria-*`, `data-*`, `id`
- ESLint limits: complexity ≤ 8, max-statements ≤ 10, max-depth ≤ 3
- Radix UI available for complex headless interactions; `lucide-react` for icons

**`<component-name>.test.tsx`:**
- `@testing-library/react` + `userEvent`, query by role/label
- `withEmotion()` wrapper, `cleanUpEmotionStyles()` in `afterEach`
- Vitest globals (no imports for `describe`, `test`, `expect`, `vi`)
- Test all variants, interactions, edge cases
- Focus on behaviour and accessibility

**`<component-name>.a11y.tsx`:**
```tsx
import { axe, toHaveNoViolations } from 'vitest-axe'
import { render } from '@testing-library/react'
import { withEmotion } from '@/utils/test-helper/emotion-query'
import { ComponentName } from './component-name'

expect.extend(toHaveNoViolations)

describe('ComponentName a11y', () => {
  test('default has no violations', async () => {
    const { container } = render(withEmotion(<ComponentName />))
    expect(await axe(container)).toHaveNoViolations()
  })

  test('disabled has no violations', async () => {
    const { container } = render(withEmotion(<ComponentName disabled />))
    expect(await axe(container)).toHaveNoViolations()
  })
})
```

**`<component-name>.stories.tsx`:**
- CSF3: `satisfies Meta<typeof ComponentName>`, `StoryObj<typeof meta>`
- `tags: ['autodocs']`
- Cover: Default, each variant, each size, Loading, Error, Disabled, Empty
- Both brands via global theme toolbar
- `play()` interaction test for interactive components
- Realistic data, copy-paste examples for recommended usage
- Name error stories `ErrorState`

**`<component-name>.mdx`:**
- Intent, constraints, when NOT to use the component
- Copy-paste examples (recommended usage, not edge cases)
- Accessibility notes (keyboard, screen reader)
- Theming example (both brands)

**`index.ts`:**
```ts
export { ComponentName } from './component-name'
export type { ComponentNameProps } from './component-name'
```
