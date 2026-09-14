# Fallback a11y checklist (ko-verify / ko-review)

Loaded **only when the `wcag-2.2-aa` skill is not available** — when the skill is present, its
own checklist supersedes this file. Used by `/ko-verify` Step 4 and by `/ko-review`'s frontend
specialist.

For each changed component, check:

- Labels: every input has a programmatically associated visible label
- Keyboard: all interactive elements reachable and operable via keyboard
- Focus: focus managed correctly after dialogs, route transitions, async actions
- Contrast: text and UI components meet contrast ratios (flag if theme tokens are not used)
- ARIA: correct roles, states, and live regions for dynamic content
- Semantic HTML: native elements over ARIA roles (`<button>` not `<div role="button">`)
- Target size: interactive elements at least 24x24px
- Reflow: layout works at 320px width
