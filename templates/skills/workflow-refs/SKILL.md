---
name: workflow-refs
description: Reference detail for /ko-* workflow commands (verify report templates, feature input fetching, review team mode, ds-component standard profile). Load a specific references/*.md file only when the command that references it tells you to — never preload the whole skill.
---

# Workflow References

This skill holds the **detail tier** of the `/ko-*` commands (progressive disclosure). Command
bodies carry routing + flow + guardrails; the files under `references/` carry the detail that only
one branch of a run needs.

**Usage rule for the agent:** read a file here ONLY when the running command explicitly points to
it (commands cite the full path, e.g. `.cursor/skills/workflow-refs/references/verify-qa-report-template.md`).
Reading files unprompted defeats the purpose — these exist to stay OUT of context until needed.

| File | Loaded during |
|---|---|
| `references/verify-archetype-tests.md` | `/ko-verify` Step 3 (test coverage, per archetype) |
| `references/verify-baseline.md` | `/ko-verify` Step 1.5 (base-branch worktree procedure, on gate failure) |
| `references/verify-a11y-checklist.md` | `/ko-verify` Step 4 (only when `wcag-2.2-aa` is unavailable) |
| `references/verify-qa-report-template.md` | `/ko-verify` Step 7 (QA report generation) |
| `references/verify-browser-tiers.md` | `/ko-verify` Step 6 (browser/live verification) |
| `references/feature-input-fetching.md` | `/ko-feature` Step 0 (MCP fetch of Jira/Figma/etc.) |
| `references/feature-conventions-checklist.md` | `/ko-feature` Step 2b (convention recon detail) |
| `references/feature-dependency-versions.md` | `/ko-feature` plan writing (dependency API check) |
| `references/review-team-mode.md` | `/ko-review --team` only |
| `references/ds-component-standard.md` | `/ko-ds-component` standard profile only |
