# Command Attribution and Exploration Pilot Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add privacy-safe command-led session metrics and pilot a fast, read-only `repo-explorer` for `/ko-feature` conventions recon without weakening quality gates.

**Architecture:** Extend the existing ledger hook and report additively; old ledgers and existing JSON fields remain valid. Keep the explorer as a universal agent dependency of `ko-feature`, with the existing inline fallback. Implement telemetry, reporting, and explorer distribution as independent TDD tasks, then run integration review and real CLI/hook probes.

**Tech Stack:** Node 20, CommonJS hooks, ESM reporter, Markdown Cursor resources, Vitest, pnpm.

---

### Task 1: Record prompt attribution and response identifiers

**Objective:** Persist only command metadata while always allowing prompt submission and preserving existing hook behavior.

**Files:**
- Modify: `tests/hooks.test.js`
- Modify: `templates/hooks/session-ledger.cjs`
- Modify: `templates/settings/hooks.json`

**Steps:**
1. Add failing real-hook tests for leading whitespace + `/ko-feature`, non-command prompts, command-like text later in a prompt, attachments/arguments privacy, optional `generation_id`, malformed prompt shapes, unparseable JSON, and ledger-write failure. Assert `beforeSubmitPrompt` returns `{continue:true}` and existing events still return `{}`.
2. Extend the turn test to require additive `generationId` and `modelId` when supplied, plus absence when omitted.
3. Assert `hooks.json` wires `session-ledger.cjs` to `beforeSubmitPrompt`.
4. Run `pnpm vitest run tests/hooks.test.js`; confirm the new assertions fail for missing behavior.
5. Implement minimal hook extraction: anchored `/^\\s*\\/(ko-[a-z0-9-]+)/i`, no argument/attachment persistence, additive response IDs, and `{continue:true}` only for valid `beforeSubmitPrompt` events. Keep all failures silent and exit 0.
6. Re-run the targeted suite; confirm all hook tests pass.

### Task 2: Report command-led sessions and time-window attribution

**Objective:** Add segment and per-command metrics without removing existing report fields or inventing dollar costs.

**Files:**
- Modify: `tests/session-metrics.test.js`
- Modify: `templates/skills/session-metrics/scripts/report.mjs`
- Modify: `templates/skills/session-metrics/SKILL.md`

**Steps:**
1. Add failing fixtures for old ledgers, pre-command activity, free-form follow-ups, repeated commands, nested workflow activity, stops, multiple commands, malformed lines, and text/JSON parity.
2. Add an aggregate cutoff fixture whose command prompt predates the window but whose in-window turns must remain attributed; out-of-window tokens must be excluded.
3. Assert command groups expose segment count, turns, input/output tokens, tool calls, and peak-context p50/p75/p90; assert no estimated-dollar field/text appears.
4. Run `pnpm vitest run tests/session-metrics.test.js`; confirm failures are missing command-led behavior.
5. Implement segmentation over the full event stream, then clip segment events to the aggregate window. `stop` is inert; non-command prompts retain the active command; pre-first-command and legacy activity use `unattributed`.
6. Add `segments` to single-session output and `commands` to aggregate output while preserving existing session/calibration fields.
7. Document command-led semantics, privacy, follow-up/nested/stop behavior, and the lack of exact per-command billing.
8. Re-run the targeted suite; confirm all metrics tests pass.

### Task 3: Add bounded repo exploration and distribution coverage

**Objective:** Route feature recon through a fast read-only agent and prove installation/export completeness.

**Files:**
- Create: `templates/agents/repo-explorer.md`
- Modify: `templates/commands/ko-feature.md`
- Modify: `tests/consistency.test.js`
- Modify: `tests/export.test.js`
- Modify: `scripts/smoke-init.mjs`

**Steps:**
1. Add failing consistency assertions for `model: fast`, `readonly: true`, ≤250-word/one-page output, `file:line`, `not evidenced`, bounded peers, focused reads, reusable implementations, no raw dumps/code/tours, and no repeated broad main-thread recon.
2. Assert `ko-feature` declares `agents: [repo-explorer]`, retains its inline fallback, and leaves existing TDD/verify/review contracts untouched.
3. Add export assertions that full and single-command `ko-feature` bundles contain the explorer; add universal smoke installation and `beforeSubmitPrompt` wiring assertions.
4. Run the targeted consistency/export tests and `pnpm smoke`; confirm missing-agent/wiring failures.
5. Add the minimal agent template and update Step 2b without adding a parallel registry or handoff artifact. Keep the command ≤9,000 chars.
6. Re-run targeted tests, smoke, `pnpm dup-check`, and `node scripts/context-budget.mjs --enforce`; confirm all pass.

### Task 4: Integrate, review, and verify the pilot

**Objective:** Prove the combined diff meets every acceptance criterion and works through real distribution paths.

**Files:**
- Modify only for regression-tested review findings.

**Steps:**
1. Run spec-compliance review against AC-1 through AC-9, then code-quality/privacy review; fix and re-review every critical or important finding.
2. Run `pnpm test`, `pnpm smoke`, `pnpm dup-check`, context-budget enforcement, and `git diff --check`.
3. Scaffold a clean consumer and re-init it; verify universal explorer installation and additive hook merging without damaging user entries.
4. Export `ko-feature` as a real CLI plugin and compare its command/agent assets with installed output.
5. Run real hook → ledger → text/JSON report probes, including prompt privacy, follow-ups, cutoff attribution, malformed input, and write failure.
6. Verify changed files contain no CJK, credentials, prompt arguments, attachment paths, or quality-gate edits. Commit logical telemetry, explorer, and test changes with short messages.
7. Report AC-10 separately: a real Cursor pilot still requires Cursor execution and actual model evidence; do not claim savings or live model enforcement from container tests.
