---
name: ko-test
description: Generate tests appropriate to context (Jest/Vitest + RTL, NestJS + Supertest, or Playwright) — reuse-first against the repo's existing test infrastructure
args: "[file path or component name]"
skills-optional: [ts-react-patterns, nestjs-patterns]
---

# Test Generation

Generate tests for the specified file or component, using the appropriate framework based on context.

Invoke **`superpowers:test-driven-development`** when available — it enforces red-green-refactor: write a failing test first, implement just enough to pass, then refactor. The command also works standalone via the steps below.

## Step 0: Detect the stack and REUSE existing test infrastructure

Before writing anything:

1. **Detect the archetype** from `.cursor/rules/` (which archetype `.mdc` is installed) and the repo's test config (jest vs vitest, playwright-bdd) — never assume the framework; match what the repo runs.
2. **Search the existing test infrastructure** — the repo almost certainly already has:
   - a custom `render` wrapper (theme/provider-aware, e.g. a shared test-utils package) — **use it, never raw `render`, when one exists**
   - factories/fixtures/builders for domain objects
   - custom matchers, mock servers (MSW/WireMock), shared mocks
   - 2-3 sibling test files for the same kind of unit — read them as the style anchor
3. **Propose the plan** as `behavior → [REUSE <helper>] / [NEW]` lines. When the plan creates new helpers or more than one file, **stop and wait** for confirmation; a single test file reusing existing helpers can proceed directly.

## Framework patterns

- `.tsx` / `.ts` in a React/Nx project → **Jest or Vitest + React Testing Library** (match the repo).
- `.ts` in a NestJS project → **Jest unit test** for services (mocked providers); **Supertest** for resolvers/controllers (HTTP/GraphQL e2e).
- User specifies "e2e", or a `.feature` file → hand off to **`/ko-e2e-test`** when installed (it is reuse-first against the step registry); otherwise Playwright per the repo's conventions.

### React (Jest/Vitest + React Testing Library)

```tsx
import { render, screen } from './test-utils'; // ← the repo's wrapper when one exists
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe'; // or vitest-axe

expect.extend(toHaveNoViolations);

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<ComponentName />);
    await user.click(screen.getByRole('button', { name: 'Action' }));
    expect(screen.getByText('Result')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ComponentName />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

### NestJS (Jest unit + Supertest e2e)

```ts
describe('FeatureService', () => {
  let service: FeatureService;
  const repo = { findOne: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        FeatureService,
        { provide: getRepositoryToken(FeatureEntity), useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(FeatureService);
  });

  it('returns the feature', async () => {
    repo.findOne.mockResolvedValue({ id: '1' });
    await expect(service.getFeature('1')).resolves.toEqual({ id: '1' });
  });
});
```

For resolvers/controllers, prefer a Supertest e2e test that boots a `TestingModule`, executes a GraphQL query/mutation (or HTTP request), and asserts on the response shape.

## Instructions

1. Read the source file to understand its behavior — inputs, outputs, branches, error paths.
2. Identify the key behaviors to test (happy path, error cases, edge cases). Test behavior, not implementation.
3. Write tests per the Step 0 plan, matching the repo's existing file naming and co-location convention and the sibling tests' style.
4. Include an accessibility check (axe) for React components; query **by role/label**, not test id.
5. Keep tests deterministic — no real network, no shared state, no time/order dependence. Use realistic data.
6. Run the tests to verify they pass (and fail when the behavior is broken) — report the real command output, never assumed results.
7. Hand off: suggest `/ko-verify` to run the full gate suite over the change.

Follow `.cursor/rules/` and load the matching stack skill if one applies.
