# Feature Profile Selection

The profile (`standard` vs `fast`) is chosen by evidence at Step 3, not by flag alone —
a user who forgets `--fast` should not pay for a full standard run on a task that was
already pinned down.

## Auto-select FAST when ALL hold

- **Scope**: ≤3 files, one layer (e.g. only UI, or only resolver logic).
- **Anchored requirements**: ticket with ACs, or a description with no open "what should
  it do" questions.
- **No design signals**: no new UI pattern, no API/schema design, no cross-cutting state,
  no convention the codebase doesn't already have.
- **Warm env**: the repo runs clean (fast's cold-repo guardrail — see the command).

## Stay STANDARD when any hold

- Any design signal above, or cross-layer scope, or shared design links that need
  real exploration (Figma mocks with open questions).

## `--fast` flag with design signals

Flag it once ("this shows design-ambiguity signals — fast skips design exploration;
continue fast anyway?") and wait. Forcing exploration-heavy work into fast pays the
savings back in rework.

## Announce, never silently switch

One line, then proceed:

> Auto-selected fast: ≤3 files, one layer, anchored ACs — say `standard` to override.

Explicit flags always win over auto-selection.
