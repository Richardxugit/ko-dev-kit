# ko-ds-component reference: discovery profile (`--discovery`)

Loaded by `/ko-ds-component` only in the discovery profile.

## Step 3: Brainstorm & Challenge

Invoke `superpowers:brainstorming` (or inline fallback). The agent actively probes and improves
the design:

1. **Reuse check** — is this already partially covered? Can it extend/compose an existing primitive?
2. **Challenge the API** — is this flexible enough for ALL potential consumers? What if another app uses it differently?
3. **Reusable vs app-specific** — if extracted from product code, strip business logic. The DS component is the generic shell.
4. **Variant coverage** — states the design doesn't show but consumers will need? (empty, truncated, responsive, RTL?)
5. **Composition** — compound (`Card.Header`, `Card.Body`)? Slots/render props? Headless hook + styled wrapper (`useXxx` + `<Xxx />`)?
6. **Edge cases** — long text, many items, zero items, animation preferences, screen reader announcements?
7. **Performance** — lazy loading needed? Memo justified? Heavy rendering?
8. **Naming** — does the name reveal intent? Follow compound naming (`RadioGroup`, not `RadioList`)?

*Fallback (no superpowers):* ask these as a batched prompt.

## Step 3b: Write Spec

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
