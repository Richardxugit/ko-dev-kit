# ko-verify reference: per-archetype test-coverage checks

Loaded by `/ko-verify` Step 3. "Appropriate tests" depends on the archetype — use the matching
table below. Discover the test runner from `package.json` `scripts.test` or the Nx target.

## nestjs-graphql

| Test Type | What to Check | How to Check |
|-----------|--------------|--------------|
| **Unit tests** | Services/business logic have `*.spec.ts` with providers mocked | Check spec files co-located with changed services |
| **Resolver/controller tests** | GraphQL resolvers / REST controllers tested | Grep for `Test.createTestingModule` and resolver spec files |
| **e2e tests** | Endpoints have Supertest e2e coverage with a booted module | Check `test/` or `*.e2e-spec.ts` for the changed feature |
| **Contract tests** | Federation/consumer contracts covered, if the repo uses contract testing | Grep for contract-test files for the changed subgraph |

Run the test target and report results. Note tests that passed on the base but now fail (regressions).

## fe-nx

| Test Type | What to Check | How to Check |
|-----------|--------------|--------------|
| **Unit tests** | Components and utilities have co-located `.test.tsx` / `.test.ts` | Check for test files alongside changed files |
| **axe a11y** | Component tests include an accessibility check | Grep for `toHaveNoViolations` or `axe(` in test files. If `jest-axe`/`vitest-axe` is installed but missing for changed components, flag as **blocking**. If not installed at all, report `N/A — not configured` + a Repo Health item; do not mark a11y as PASS. |
| **Interaction tests** | Interactive components tested with `userEvent` (keyboard + mouse) | Grep for `userEvent` and keyboard testing (`getByRole`, `Tab`, `Enter`) |
| **Integration tests** | Multi-component flows / pages covered | Check for tests rendering parent components or pages |

Run `pnpm nx affected -t test` (or the test script) and report results.

## design-system

| Test Type | What to Check | How to Check |
|-----------|--------------|--------------|
| **Component tests** | Each component has a `.test.tsx` with RTL + `userEvent` | Check co-located test files |
| **axe a11y** | Every component test includes an axe check | Grep for `toHaveNoViolations` / `axe(` |
| **Stories** | New/changed components have `.stories.tsx` covering key states | Check for co-located stories |

## e2e-playwright (if installed — ko-qa-kit repos)

| Test Type | What to Check | How to Check |
|-----------|--------------|--------------|
| **Scenario coverage** | New/changed flows have `.feature` + step defs (or specs) | Check for matching `.feature`/spec files |
| **Run result** | The relevant scenarios pass | Run the targeted Playwright/BDD command; capture trace on failure |

## Report format for test coverage

```
## Test Coverage

| Type | Status | Base branch | Details |
|------|--------|-------------|---------|
| Unit tests | PASS/FAIL/MISSING/N/A | PASS/FAIL | N tests; N failing (N pre-existing on base, N introduced) |
| A11y (axe) | PASS/FAIL/MISSING/N/A | PASS/FAIL | N components checked |
| e2e / integration | PASS/FAIL/MISSING/N/A | PASS/FAIL | N tests |
| ... | ... | ... | ... |

### Missing Coverage
- `packages/ui/src/lib/NewWidget/NewWidget.tsx` — no test file found
- `apps/account/src/wishlist/wishlist.service.ts` — no spec for `handleEdgeCase()`
```
