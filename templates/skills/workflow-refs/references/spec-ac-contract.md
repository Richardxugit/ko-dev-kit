# Spec AC block contract

Acceptance criteria in a spec get a stable shape so downstream steps (review,
verify) can trace them mechanically instead of by impression. The contract is
the shape of ONE block — everything else in the spec is unchanged.

## The block

The spec carries exactly one `## Acceptance Criteria` section. Inside it, one
observable behavior per line, each with a stable id:

```markdown
## Acceptance Criteria

- AC-1: Guest enters a valid phone number and receives a verification code via SMS.
- AC-2: Correct code within 5 minutes unlocks checkout; a wrong code shows an inline error and keeps the field editable.
- AC-3: Three consecutive wrong codes lock verification for 10 minutes and the UI shows the remaining lock time.
```

## Rules

1. **Heading is literal** — `## Acceptance Criteria`, so the block is locatable
   without guessing.
2. **Ids are `AC-n` and stable** — once the spec is approved, ids are never
   renumbered. A dropped AC is struck through (`~~AC-3: …~~`), never deleted:
   the id sequence is the audit trail.
3. **One observable behavior per AC** — compressed into one sentence
   (GIVEN/WHEN/THEN folded into the sentence is fine; the three-part form is
   not required). If a line needs "and" twice, it is two ACs.
4. **No test code, no scenario enumeration** — those live in the plan and TDD
   execution. The AC states behavior; tests prove it.

## Why the shape matters (for the spec author)

The spec is frozen at approval. Every later step consumes the frozen block:

- **Review** traces the diff PER AC: each AC-n must map to an implementing
  hunk (`path:line`) or be reported uncovered. Prose ACs make this a vibe;
  numbered ACs make it a checklist that cannot be half-done.
- Unnumbered / legacy specs degrade gracefully: reviewers trace at prose level
  and note "spec predates the AC contract" in one line.

Keep the block tight — it is re-fed as context in every downstream step, so
size is a cost multiplier. If it needs scrolling, the feature is under-scoped.
