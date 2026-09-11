# ko-feature reference: conventions checklist (Step 2b)

Loaded by `/ko-feature` Step 2b. For each cross-cutting concern the feature will touch, check 2-3
existing modules/components in the same area:

- **User-facing text** — Is there an i18n/localization pattern? (e.g., `react-i18next`, `t()`)
  Grep for how sibling components render user-visible strings.
- **Styling** — What styling approach do peer components use? (e.g., styled-components, MUI
  `sx`/theme, CSS modules, emotion)
- **State management** — What state pattern do nearby modules follow? (e.g., Apollo cache,
  zustand, jotai, Redux, local state)
- **Error handling** — How do siblings handle and display errors? (NestJS exception filters,
  GraphQL error formatting, React error boundaries)
- **Data layer** — What data-fetching pattern is established? (e.g., generated Apollo hooks,
  services, resolvers)

**How to check — locate, then read by range:** find the symbol or pattern with LSP
(`documentSymbol`/`goToDefinition`) or Grep first, then read only the surrounding lines (~50
lines). Never read a file over ~400 lines whole during recon — anything that size is already a
god-file by the size rule in `coding-standards.mdc`; hitting one is the signal to read by range,
not the excuse to load it all.

Document the conventions you discover — they MUST be carried into brainstorming: the design
follows existing patterns, it does not introduce new ones.
