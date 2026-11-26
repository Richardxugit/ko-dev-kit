# Solution Design Artifact Contract

Create only artifacts relevant to the requirement under `.cursor/specs/solution-designs/<slug>/`:

```text
README.md
design.md
diagrams/
  context.mmd
  aws.mmd                 # AWS designs only
  aws.drawio              # AWS designs only, official AWS4 icons
  sequence-<flow>.mmd
parts/                    # large designs only
  <nn>-<boundary>.md
review.md                 # first review round only
tickets.md                # explicit tickets intent only
```

## Files and metadata

- `README.md` — `Status`, `Revision`, executive summary, recommended option, requirement coverage, key Reuse/Adapt/New decisions, trade-offs, reading order, part index, and Confluence publication record.
- `design.md` — complete small/medium design. For a large design, retain only global decisions, system-wide invariants, shared contracts, and links to parts.
- `parts/` — independently reviewable bounded contexts or delivery boundaries, never arbitrary page chunks.
- `review.md` — created by the first `revise` round; never created speculatively by initial design.
- `tickets.md` — created only by the explicit tickets intent.

Start with `Status: DRAFT` and `Revision: 1`. Use `IN_REVIEW` when the user sends the design for team review or publishes it for review. Set `APPROVED` only after explicit user approval. Record Confluence as `not published` until a verified page URL and page ID exist.

## Diagram contract

- `context.mmd` — a portable Mermaid `flowchart` showing actors, system boundaries, components, and external dependencies.
- `sequence-<flow>.mmd` — Mermaid `sequenceDiagram` for the key flow and any materially different failure/retry flow.
- `aws.mmd` — AWS resources, networking/trust boundaries, and data direction when AWS is relevant.
- Add Mermaid `er` or state diagrams only when they clarify a real data or lifecycle decision.
- `aws.drawio` — for AWS designs: generate with the official AWS4 icon set per `.cursor/skills/workflow-refs/references/aws-architecture-diagram.md`. Verify stencil names against its icon catalog; never guess, never hand in a fabricated draw.io file, and never claim it rendered without running a renderer.

Every diagram needs a short text summary and must agree with the prose and source evidence. Use a real renderer before calling a diagram rendered or render-verified. If no renderer succeeds, report Mermaid source generation plus static checking only.

## Split, do not bloat

Split when the design has multiple independently reviewable bounded contexts or exceeds roughly **250 lines**. `README.md` remains the executive entry point; `design.md` keeps global decisions; focused parts carry details. Each part names its requirements, boundaries, decisions, diagrams, failure modes, verification, and links back to global contracts.

Chat starts with the executive summary and part list. Use **user-paced** deep dives: present Part 1 and ask before the next part instead of dumping every part. Disk artifacts retain complete navigation even when chat is paced.

## Final artifact review

- README status/revision and all links are accurate.
- Small designs have context and key sequence diagrams; AWS designs also have an AWS view.
- Large designs preserve global decisions without duplicating every part.
- Each named file has a clear responsibility and no speculative artifact directories exist.
- No ticket, review, rendered image, draw.io, or Confluence artifact is claimed without the corresponding action or capability.
