---
name: ko-ds-component
description: Create a new design-system component from a design spec, Jira ticket, or description. Two profiles — standard (confirm and build) or discovery (brainstorm flexibility/reusability first). Works for designers and developers alike.
args: "<ComponentName> [--discovery]"
skills: [mui-theming, component-api-design, multi-brand-theming, wcag-2.2-aa]
rules: [design-system]
---

# Design System Component Workflow

Create a new React component in the kosmos-ds design system. Accepts a Figma link, Jira ticket, screenshot, or text description as input — Jira tickets are fetched via the Atlassian MCP and Figma via its MCP when configured; a failed fetch means ask for a paste/screenshot, never a guessed summary.

## Prerequisites

Works best with **superpowers** skills (`brainstorming`, `test-driven-development`, `verification-before-completion`). Falls back to inline equivalents when not installed.

## Profiles

| | standard (default) | discovery (`--discovery`) |
|---|---|---|
| **Input** | Same — Figma, ticket, description | Same |
| **Agent posture** | Confirms understanding, then builds faithfully | Challenges, probes, explores edge cases to make it more reusable |
| **Output before building** | Plain-language confirmation: "I'll build X with variants Y, Z" | Full spec saved to `.cursor/specs/` — API, variants, composition, edge cases |
| **When to use** | Design is clear and complete, just build it | Want the agent to improve the design — flexibility, reusability, composition patterns |

## Step 0: Gather Inputs

Ask the user for their design source:

- **Figma / design link** — mockup, component spec, token references
- **Jira ticket** — acceptance criteria, screenshots
- **Text description** — what it looks like, what it does
- **Existing component** to version/extend (e.g. "ButtonV3 to replace Button")

If they share a link or image, read/analyze it to extract: variants, states, spacing, colours (as token names), typography, interactions.

## Step 0b: Clean-Slate Check

```bash
git status --porcelain
```

Flag untracked files related to this component. Check `.cursor/specs/` for existing specs. If found: resume, delete, or ignore.

## Step 1: Load Context

1. Read `.cursor/rules/design-system.mdc` and `AGENTS.md`.
2. Read `.github/copilot-instructions.md` **if present** — when it exists it is the team's coding standards contract and every component MUST meet its rules. If absent, `AGENTS.md` + `.cursor/rules/design-system.mdc` are the standards contract.
3. Read the `mui-theming`, `component-api-design`, `multi-brand-theming`, and `wcag-2.2-aa` skills.
4. Audit `src/components/ui/` for similar components — can this extend or compose an existing one?
5. Check 2-3 peer components in the same category for patterns (prop shape, ThemeWrapper usage, test structure, story structure).

## Step 2: Process Design Inputs

From the Figma/ticket/description, extract:
- **Name** — PascalCase component name
- **Category** — which folder: `inputs/`, `data-display/`, `layout/`, `navigation/`, `surfaces/`, `feedback/`, `widgets/`
- **Variants** — visual variations (primary/secondary, filled/outlined, small/medium/large)
- **States** — default, hover, focus, active, disabled, loading, error, empty
- **Interactions** — click, toggle, open/close, navigate, submit
- **Multi-brand** — any brand-specific differences beyond tokens?

---

## Standard Profile

### Step 3: Confirm and Proceed

Summarize back to the user in plain language:

> "I'll build **ComponentName** in `<category>/` with:
> - Variants: primary, secondary, ghost
> - Sizes: small, medium, large
> - States: default, disabled, loading
> - Interactions: click handler, keyboard (Enter/Space)
> - Accessibility: button role, aria-label, focus-visible
> - Both brands supported via tokens
>
> Sound right?"

Get confirmation, then proceed to Step 4.

---

## Discovery Profile (`--discovery`)

### Step 3: Brainstorm & Challenge

Invoke `superpowers:brainstorming` (or inline fallback). The agent actively probes and improves the design:

1. **Reuse check** — is this already partially covered? Can it extend/compose an existing primitive?
2. **Challenge the API** — is this flexible enough for ALL potential consumers? What if another app uses it differently?
3. **Reusable vs app-specific** — if extracted from product code, strip business logic. The DS component is the generic shell.
4. **Variant coverage** — states the design doesn't show but consumers will need? (empty, truncated, responsive, RTL?)
5. **Composition** — compound (`Card.Header`, `Card.Body`)? Slots/render props? Headless hook + styled wrapper (`useXxx` + `<Xxx />`)?
6. **Edge cases** — long text, many items, zero items, animation preferences, screen reader announcements?
7. **Performance** — lazy loading needed? Memo justified? Heavy rendering?
8. **Naming** — does the name reveal intent? Follow compound naming (`RadioGroup`, not `RadioList`)?

*Fallback (no superpowers):* ask these as a batched prompt.

### Step 3b: Write Spec

Save to `.cursor/specs/YYYY-MM-DD-<component-name>-design.md`:
- Component name, category, source reference
- Prop API (typed interface) — what's the public contract
- Variants, sizes, states
- Composition pattern chosen
- Multi-brand token requirements
- Accessibility contract (roles, keyboard, focus)
- Stories to cover
- Migration notes (if replacing/versioning an existing component)

Get user approval, then proceed to Step 4.

---

## Step 4: Scaffold

```bash
pnpm plop
# Enter: <category>/<component-name>
```

Creates at `src/components/ui/<category>/<component-name>/`:
```
<component-name>.tsx           # implementation
<component-name>.test.tsx      # unit tests
<component-name>.a11y.tsx      # accessibility tests (vitest-axe)
<component-name>.stories.tsx   # Storybook stories (CSF3)
<component-name>.mdx           # docs page
index.ts                       # barrel export
```

## Step 5: Implement (TDD)

**TDD is the default.** Write failing tests first, implement to pass. State once ("Using TDD") and proceed.

### Coding standards (from the standards contract)

Every component MUST follow:
- **Composition over inheritance** — small primitives composed into patterns
- **One responsibility** — single reason to change
- **Headless + styled** — `useXxx` hook + `<Xxx />` wrapper where complex
- **Typed union variants** — `variant: "filled" | "outlined"`, `size: "sm" | "md" | "lg"`. No boolean flags.
- **Events by intent** — `onOpenChange` not `onClick`
- **Design tokens only** — never raw hex/RGB. Import from `src/configs/<brand>/tokens/`
- **forwardRef** on every interactive component, forward `className`, `style`, `ref`
- **Controlled + uncontrolled** — support both, document both
- **Mobile first** — small viewports up, use breakpoint tokens
- **Performance built in** — memo only when profiled, lazy load heavy content

### Implementation files

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

## Step 6: Brand Tokens (if needed)

1. Add to `src/configs/kmart/tokens/` 
2. Add the **same token** to `src/configs/target/tokens/`
3. Both brands must have the token — never add to just one

## Step 7: Export to Public API

1. `src/components/ui/index.ts` — internal availability
2. `src/components/ui/latest.ts` — **released** (consumer-facing public API)

⚠️ Not public until in `latest.ts`. Don't add there until the API is stable and reviewed.

## Step 8: Verify

```bash
pnpm test                    # unit + a11y tests pass
pnpm lint                    # ESLint (complexity, imports, a11y, no raw hex)
pnpm types:check             # TypeScript compiles cleanly
pnpm storybook               # stories render under both brands
```

### Quality checklist (from the standards contract)
- [ ] No raw hex/RGB outside `src/configs/**`
- [ ] Zero `any` at public boundaries
- [ ] Lint clean, type safe
- [ ] Unit test exists and tests behaviour
- [ ] a11y test passes vitest-axe
- [ ] Stories cover: default, variants, sizes, disabled, accessibility notes, theming
- [ ] MDX docs explain intent and when NOT to use
- [ ] Both brands render correctly

Report: files created, category, brand tokens added (if any), barrel files updated, and verification results.

## Workflow Transitions

The full chain runs automatically:

```
[standard: confirm → scaffold → TDD → verify]
[discovery: brainstorm → spec → approve → scaffold → TDD → verify]
```

## Superpowers & Caveman

When available:
- **`superpowers:brainstorming`** — discovery profile (Step 3)
- **`superpowers:test-driven-development`** — implementation (Step 5)
- **`superpowers:verification-before-completion`** — quality gates (Step 8)
- **`caveman`** — token-efficient responses when activated
