# Accessible React Patterns

Copy-paste-ready, framework-React patterns for common widgets. Each is self-contained.
Prefer a native element where one exists before adopting an ARIA pattern.

---

## Accessible modal dialog

Prefer the native `<dialog>` — it gives focus management, an Escape-to-close, and a backdrop
for free.

```tsx
import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = 'modal-title';

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal(); // focus moves in, Esc closes, backdrop on
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={onClose}>
      <h2 id={titleId}>{title}</h2>
      {children}
      <button type="button" onClick={onClose}>
        Close
      </button>
    </dialog>
  );
}
```

- `showModal()` traps focus and enables Escape automatically — don't hand-roll a focus trap
  unless you can't use `<dialog>`.
- Return focus to the trigger on close (browsers do this for `<dialog>`); if you build a
  custom modal, store `document.activeElement` before opening and restore it after.

---

## Form field with error

Associate the label, the error, and the invalid state programmatically.

```tsx
import { useId } from 'react';

interface EmailFieldProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function EmailField({ value, error, onChange }: EmailFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id}>Email</label>
      <input
        id={id}
        type="email"
        value={value}
        autoComplete="email"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

- Always a visible `<label htmlFor>`; placeholder text is not a label.
- `aria-describedby` points to the error so screen readers announce it on focus.
- `role="alert"` makes a newly rendered error announce immediately.

---

## Tabs (ARIA tabs pattern)

No native element exists, so implement the ARIA pattern including arrow-key navigation.

```tsx
import { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  panel: React.ReactNode;
}

export function Tabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(0);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') setActive((i) => (i + 1) % tabs.length);
    if (e.key === 'ArrowLeft') setActive((i) => (i - 1 + tabs.length) % tabs.length);
  };

  return (
    <>
      <div role="tablist" aria-label="Sections" onKeyDown={onKeyDown}>
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            type="button"
            aria-selected={i === active}
            aria-controls={`panel-${tab.id}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={i !== active}
          tabIndex={0}
        >
          {tab.panel}
        </div>
      ))}
    </>
  );
}
```

- Roving `tabIndex`: only the active tab is in the Tab order; arrows move between tabs.
- `aria-selected`, `aria-controls`, and `aria-labelledby` wire tabs to their panels.

---

## Menu button (disclosure menu)

A button that toggles a list of actions. Manage `aria-expanded`, Escape, and outside-click.

```tsx
import { useEffect, useRef, useState } from 'react';

export function MenuButton({ items }: { items: { label: string; onSelect: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div ref={ref} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Actions
      </button>
      {open && (
        <ul role="menu">
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- `aria-haspopup="menu"` + `aria-expanded` tell assistive tech the button opens a menu.
- Escape closes and (ideally) returns focus to the trigger button.
- For a full menu pattern, add arrow-key navigation between `menuitem`s with roving `tabIndex`.

---

## Live region (status announcements)

Render the region up front; update its text content to announce. Don't mount the region at
the same time as the message — screen readers may miss it.

```tsx
export function SaveStatus({ message }: { message: string }) {
  return (
    <p role="status" aria-live="polite">
      {message}
    </p>
  );
}
```

- `role="status"` / `aria-live="polite"` waits for a pause; `role="alert"` interrupts — use
  `alert` only for errors.
