---
name: ts-react-patterns
description: React + TypeScript component conventions — function components, typed props, hooks rules, container/presentational split, state colocation, memoization, error boundaries, and testing with React Testing Library + userEvent. Use whenever creating or modifying React components, hooks, or their tests.
---

# React + TypeScript Patterns

## Function components & typed props

Use function components with an explicit, exported props interface. Don't use `React.FC`
(it muddies `children` typing and generics).

```tsx
export interface UserCardProps {
  name: string;
  email: string;
  /** Defaults to false. */
  isAdmin?: boolean;
  onSelect?: (email: string) => void;
}

export function UserCard({ name, email, isAdmin = false, onSelect }: UserCardProps) {
  return (
    <button type="button" onClick={() => onSelect?.(email)}>
      {name} {isAdmin && <span aria-label="admin">★</span>}
    </button>
  );
}
```

- Default optional props in the parameter destructure, not `defaultProps`.
- Type event handlers from the DOM (`React.ChangeEvent<HTMLInputElement>`), not `any`.
- Prefer `ReadonlyArray<T>` / `readonly` props to signal components don't mutate inputs.

## Rules of hooks

- Call hooks unconditionally at the top level — never inside conditions, loops, or callbacks.
- Custom hooks start with `use` and have one responsibility (`useUserData`, `useDebounce`).
- List every reactive value a hook reads in its dependency array; don't lie to the linter.
- Return stable references from custom hooks (`useMemo`/`useCallback`) when consumers put the
  value in their own dependency arrays.

```tsx
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}
```

## Container / presentational split

Keep data and rendering separate so UI is reusable and testable.

```tsx
// Container — owns data, no markup of its own beyond wiring
function UserCardContainer({ id }: { id: string }) {
  const { data, isLoading } = useUser(id);
  if (isLoading || !data) return <Skeleton />;
  return <UserCard name={data.name} email={data.email} />;
}

// Presentational — pure, prop-driven (see UserCard above)
```

Presentational components belong in `ui` libs; containers/orchestration belong in `feature`
libs (see the `nx-monorepo` skill).

## State colocation

Keep state as close to where it's used as possible; lift it only when a shared ancestor
truly needs it.

- **Do:** keep a toggle/input value in the component that renders it.
- **Don't:** hoist local UI state into a global store "just in case".
- Derive, don't duplicate: compute from props/state during render instead of mirroring into
  another `useState` + `useEffect`.

## Memoization — only when measured

`memo`/`useMemo`/`useCallback` are not free. Reach for them when you have an actual cost:

- A child is wrapped in `React.memo` and you pass it a callback/object prop.
- A computation in render is genuinely expensive.

```tsx
const sorted = useMemo(() => [...items].sort(byName), [items]); // worth it for large lists
const handleSelect = useCallback((id: string) => onSelect(id), [onSelect]);
```

Don't blanket-wrap every function and value — premature memoization adds noise and can hurt.

## Error boundaries

Catch render errors so one broken subtree doesn't blank the app. Boundaries are class
components (or `react-error-boundary`); place them around feature regions.

```tsx
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary fallback={<p role="alert">Something went wrong.</p>}>
  <OrdersPage />
</ErrorBoundary>;
```

Error boundaries catch render/lifecycle errors, not event handlers or async code — handle
those with try/catch and surface them through state.

## Testing — React Testing Library + userEvent

Test behavior the way a user experiences it. Query by role/label, never by class or test id
when a semantic query exists.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('calls onSelect with the email when clicked', async () => {
  const user = userEvent.setup();
  const onSelect = jest.fn();
  render(<UserCard name="Ada" email="ada@example.com" onSelect={onSelect} />);

  await user.click(screen.getByRole('button', { name: /ada/i }));

  expect(onSelect).toHaveBeenCalledWith('ada@example.com');
});
```

- Prefer `getByRole` / `getByLabelText` / `findByRole`; use `getByTestId` only as a last resort.
- Use `userEvent` (with `setup()`) over `fireEvent` — it models real interaction sequences.
- Use `findBy*` / `await waitFor` for async UI; avoid arbitrary timeouts.
- Add an axe check to component tests — see the `wcag-2.2-aa` skill.
