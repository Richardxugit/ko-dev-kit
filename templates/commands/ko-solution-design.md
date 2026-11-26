---
name: ko-solution-design
description: Design an evidence-grounded full-stack solution with reusable repository patterns, visual architecture, bounded review, and explicit follow-up artifacts
args: "<requirement> | revise <slug> [feedback] | tickets <slug> | confluence <slug>"
agents: [repo-explorer]
---

# Solution Design

Act as a full-stack system architect. Optimize for the simplest design that satisfies the user's requirements and the repository's real conventions — not novelty, maximal reuse, or a predetermined cloud stack.

## Route the intent

- `revise <slug> [feedback]`, `tickets <slug>`, or `confluence <slug>`: read `.cursor/skills/workflow-refs/references/solution-design-followups.md` and execute only that intent. Natural-language equivalents follow the same boundaries.
- Anything else is an initial design. Read both `.cursor/skills/workflow-refs/references/solution-design-workflow.md` and `.cursor/skills/workflow-refs/references/solution-design-output.md` before exploring.

## Initial design

1. **Resolve the requirement.** Use explicit args, then usable session context. Announce an inferred target in one line. Only when both are absent, ask for the requirement before repository exploration. Fetch every supplied ticket, page, ADR, API spec, or design link; never substitute a guessed summary.
2. **Load project context.** Read `AGENTS.md`, matching `.cursor/rules/`, and only relevant stack skills/docs. Follow the workflow reference for requirements, bounded `repo-explorer` recon, Reuse/Adapt/New analysis, and option selection. Use the inline recon fallback if subagents are unavailable.
3. **Design and self-review.** Produce the artifacts and diagrams required by the output reference. For AWS designs, generate `aws.drawio` per `.cursor/skills/workflow-refs/references/aws-architecture-diagram.md`. Ground existing-system claims in `file:line` evidence. Keep assumptions, unverified external facts, and open decisions explicit.
4. **Return the executive summary.** Show status, recommended design, key reuse decisions, important trade-offs, artifact paths, and any large-design part index. For large designs, let the user pace deep dives.

The initial status is **DRAFT only**. Do not generate `tickets.md`. Do not publish to Confluence. Never write production code, deploy infrastructure, create Jira issues, or mutate AWS. This command never automatically chains into `/ko-feature` or `/ko-implement`; the user decides what happens next.

Stop after reporting the requested intent. Do not upsell later actions.
