# Solution Design Command Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Ship a universal `/ko-solution-design` command for evidence-grounded architecture, fresh-session review, explicit local tickets, and explicit Confluence publication.

**Architecture:** A lean Markdown command routes four positional intents into three progressively loaded workflow references. Existing `repo-explorer` supplies bounded repository evidence; optional AWS and Atlassian capabilities enhance the workflow without becoming core dependencies.

**Tech Stack:** Markdown Cursor commands, YAML frontmatter, Node.js 20, Vitest, pnpm, Atlassian MCP v2.

**Execution note:** Tasks 1–4 mutate the same contract and template surfaces sequentially, so the controller executes them inline with TDD. Independent command-output dry-runs and reviews are delegated after implementation.

---

### Task 1: Write the complete static contract and watch RED

**Objective:** Pin resource registration, four-intent behavior, output/follow-up safety, distribution, documentation, and Atlassian v2 before production edits.

**Files:**
- Modify: `tests/consistency.test.js`
- Modify: `tests/export.test.js`
- Modify: `tests/scaffold.test.js`
- Modify: `scripts/smoke-init.mjs`

**Steps:**
1. Add conditional reads for the intentionally missing command and three references. Test frontmatter, universal tier, no flags, initial DRAFT-only behavior, Reuse/Adapt/New evidence, Mermaid/AWS fallback, large-design splitting, fresh-session revision, explicit local tickets, explicit confirmed Confluence writes, failure recovery, and secret/path boundaries.
2. Add real `exportCommand('ko-solution-design', …, {plugin:true})` coverage asserting the command, `agents/repo-explorer.md`, `skills/workflow-refs/`, and all three references export without missing dependencies; assert exported MCP uses v2.
3. Add scaffold assertions that new Atlassian config uses `https://mcp.atlassian.com/v2/mcp` and re-scaffold preserves an existing user MCP file.
4. Add smoke `ALWAYS` expectations for the command and three references.
5. Add a README contract for the new universal command and follow-up boundaries.
6. Run `pnpm vitest run tests/consistency.test.js tests/export.test.js tests/scaffold.test.js` and `pnpm smoke`.
7. Expected RED: assertion failures identify missing command/references/docs and the old v1 endpoint; no collection errors. Missing-resource tests must fail as assertions, not `ENOENT`.

### Task 2: Implement initial design and artifact workflows

**Objective:** Ship the command and initial-design/output references to GREEN for all non-follow-up contracts.

**Files:**
- Create: `templates/commands/ko-solution-design.md`
- Create: `templates/skills/workflow-refs/references/solution-design-workflow.md`
- Create: `templates/skills/workflow-refs/references/solution-design-output.md`
- Modify: `templates/skills/workflow-refs/SKILL.md`

**Steps:**
1. Add frontmatter with `agents: [repo-explorer]` and the exact four positional intents; no flags.
2. Route initial design through input resolution, requirement framing, bounded repo evidence, Reuse/Adapt/New analysis, simplest-option recommendation, detailed design, and self-review.
3. Define the artifact tree, status/revision metadata, diagram contracts, AWS optional fallback, and bounded large-design splitting.
4. Forbid implementation, deployment, Jira creation, automatic tickets, automatic Confluence, and automatic lifecycle chaining.
5. Cite all references by full `.cursor/skills/workflow-refs/references/...` paths and keep the command ≤9,000 characters.
6. Run targeted consistency tests; expected PASS for initial-design/output cases, with only follow-up/distribution cases still RED if isolation makes that practical.

### Task 3: Implement fresh-session review and explicit follow-ups

**Objective:** Ship low-token revision, local-only tickets, and guarded Confluence publication.

**Files:**
- Create: `templates/skills/workflow-refs/references/solution-design-followups.md`

**Steps:**
1. Specify minimal fresh-session reads, preserved review rounds, affected-artifact-only edits, revision increments, and stale-ticket handling.
2. Specify vertical-slice tickets with `AC-n`, source design revision, evidence, verification, and no Jira side effects or invented metadata.
3. Specify official Atlassian MCP destination resolution, live format/space guidance, exact preview confirmation, create/update, fresh `snapshotToken`, verified publication metadata, and remote-edit conflict handling.
4. Specify generated-file-only attachments, honest renderer fallback, partial-publication recovery, secret exclusion, and no arbitrary local file upload.
5. Run `pnpm vitest run tests/consistency.test.js`; expected all consistency cases PASS.

### Task 4: Finish distribution, documentation, and Atlassian v2

**Objective:** Make installation, export, smoke, and documentation match the new universal resource.

**Files:**
- Modify: `src/scaffold-core/engine.js`
- Modify: `README.md`
- Modify: `scripts/smoke-init.mjs` if any expectation was not added during RED
- Modify: `tests/export.test.js` only to correct a defective test, never to bypass a real production gap

**Steps:**
1. Replace only the Atlassian endpoint with `https://mcp.atlassian.com/v2/mcp`; preserve user-owned MCP behavior.
2. Document `/ko-solution-design` in the universal resource and command tables, including initial-only DRAFT and explicit follow-ups.
3. Ensure no `ARCHETYPE_RESOURCES` entry was added: unlisted means universal.
4. Run `pnpm vitest run tests/consistency.test.js tests/export.test.js tests/scaffold.test.js` and `pnpm smoke`; expected PASS.

### Task 5: Verify the implementation and real command output

**Objective:** Prove static distribution and exercise the actual prompt contract in realistic scenarios before shipping.

**Files:**
- Modify only defects discovered by verification, with new RED contract coverage first
- Create dry-run artifacts outside the kit working tree

**Steps:**
1. Run `pnpm test`, `pnpm smoke`, `pnpm dup-check`, and `node scripts/context-budget.mjs --enforce`.
2. Exercise real headless init and single-command/plugin export; inspect emitted files and MCP JSON.
3. Execute the command spec as the agent for: non-AWS design, AWS full-stack design, and large design followed by explicit tickets. Exercise fresh-session revision and no-write/missing-tool Confluence behavior.
4. Review actual artifacts for evidence, simplicity, diagrams, splitting, source revisions, and absence of implicit side effects. Convert each discovered instruction gap into a RED contract test before fixing it.
5. Run the changed-file CJK scan, `git diff --check`, and final diff review.

### Task 6: Commit, push, and open the PR

**Objective:** Deliver the verified implementation in logical English commits.

**Files:**
- Modify: `.cursor/specs/2026-11-25-ko-solution-design-design.md` status to `Confirmed — implemented 2026-11-25`
- Modify: `.cursor/specs/2026-11-25-ko-solution-design-plan.md` check off completed verification

**Steps:**
1. Commit implementation and its contract tests together: `feat: add solution design command`.
2. Commit any dry-run correction separately with its regression test: `fix: tighten solution design output`.
3. Re-run the full verification loop on the exact final HEAD.
4. Push `feat/solution-design` with an explicit authenticated URL and no upstream token persistence.
5. Create a PR to `main` with Summary, real Verification counts, and Limits for unexecuted plugin-specific integrations.
6. Verify the PR exists and inspect its Actions/check runs; report the URL and honest final status.

## Verification results

- Static contract TDD: initial RED had 10 targeted failures plus 28 missing smoke resources; final suite has 320 passing tests and all seven smoke fixtures pass.
- Distribution: real headless init/re-init, single-command export, and custom plugin export passed. All three references and `repo-explorer` are bundled; full plugin MCP uses Atlassian v2; existing user MCP content remains unchanged.
- Quality gates: `pnpm dup-check` reports no unaccepted overlaps across 42 resources; `ko-solution-design` is 2,441/9,000 characters; diff check and changed-file CJK scan pass.
- Dry-runs used three isolated real `ko-ui-lib` worktrees: non-AWS, AWS full-stack, and large design with explicit tickets. Initial runs proved that an unbounded recon could exhaust the run budget, so a RED→GREEN contract fix added the 10-file hard stop and named-decision-only follow-up reads.
- Independent final reviewers APPROVED all revision-2 artifacts. Non-AWS resolved five findings, AWS resolved the partial-revoke dead-URL and HMAC rotation findings plus evidence wording, and the large design resolved seven diagram/contract findings while producing seven vertical-slice tickets.
- Fresh-session revision produced revision 2 and `review.md`, updated only affected artifacts, and marked large tickets STALE without rewriting their source-revision-1 bodies. An unrelated sequence diagram remained byte-identical.
- The missing-tool Confluence dry-run stopped with NOT PUBLISHED, made no remote call, simulated no payload or URL, and changed no files (verified by pre/post tree hash).
- Limits: Mermaid was statically checked, not render-verified. AWS official draw.io generation and live Atlassian create/update/attachment operations were not executed because those integrations were unavailable in the dry-run environment. No Jira, Confluence, AWS, or production mutation was performed.
