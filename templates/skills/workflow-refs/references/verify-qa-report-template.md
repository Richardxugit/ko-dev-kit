# ko-verify reference: QA report template

Loaded by `/ko-verify` Step 7. Produce a QA handoff report that tells a human tester exactly what
needs manual attention. Save to `.cursor/specs/qa-reports/YYYY-MM-DD-<feature-name>.md` using this
template:

```markdown
# QA Report: <Feature Name>

**Date:** YYYY-MM-DD
**Archetype:** <detected archetype>
**Spec:** <link to spec file if exists>
**Branch:** <current branch name>

## Summary
<1-2 sentences: what was built, what's the risk area>

## How to Test
<Setup steps: commands to run, URL to navigate to, test account info if needed>

## Implementation Completeness
| Planned | Status |
|---------|--------|
| <deliverable from plan> | DONE / MISSING |

## Capability Matrix
| Gate | Configured? | Notes |
|------|-------------|-------|
| Lint | YES / N/A | |
| Type check | YES / N/A | |
| Build | YES / N/A | |
| axe | YES / N/A | |
| Storybook | YES / N/A | |

## Lint / Type / Build
| Check | Result | Base branch |
|-------|--------|-------------|
| Lint | PASS/FAIL/N/A | PASS/FAIL |
| Type check | PASS/FAIL/N/A | PASS/FAIL |
| Build | PASS/FAIL/N/A | PASS/FAIL |

Failure counts list introduced vs pre-existing.

## Automated Test Results
| Category | Result | Count |
|----------|--------|-------|
| Unit tests | PASS/FAIL | N passing, N failing |
| A11y (axe) | PASS/FAIL/MISSING | N components, N violations |
| e2e / integration | PASS/FAIL | N passing, N failing |
| Storybook stories | PRESENT/MISSING/N/A | N stories for N components |

## A11y Findings
### Issues Found (fix before merge)
- **[severity] [WCAG criterion]** — description, file:line
### Verified (no issues)
- Keyboard navigation / Focus management / Color contrast: <what was checked>

## Browser Verification
**Result:** PASS | FAIL | SKIPPED
**Artifacts:** screenshot / trace path
**What was exercised:** page, interactions, final state
**Skipped reason (if any):** <reason> — manual QA required

## Manual QA Checklist
### Functional
- [ ] <specific user flow to test end-to-end, with steps>
- [ ] <edge case / error handling>
### Accessibility (Manual)
- [ ] Keyboard navigation: Tab through <flow>, verify focus order
- [ ] Screen reader: navigate <component/page>, verify announcements
- [ ] Zoom: layout at 200%
- [ ] Reflow: no horizontal scroll at 320px
### Browser / Device
- [ ] Chrome (primary)  - [ ] Safari (if applicable)  - [ ] Mobile viewport (if responsive)

## Repo Health (not caused by this feature)
- **PRE-EXISTING:** <gate> — <N failures, also present on base at <sha>>
- **NOT CONFIGURED:** <gate> — <suggested setup>

## Not Covered
<anything explicitly out of scope or deferred>
```
