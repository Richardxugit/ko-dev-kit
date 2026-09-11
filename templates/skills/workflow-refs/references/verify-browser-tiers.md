# ko-verify reference: browser / live verification tiers

Loaded by `/ko-verify` Step 6 (frontend archetypes only — skip for `nestjs-graphql` and `generic`).

**Preflight first:** confirm a dev server is runnable — `package.json` `scripts.dev`/`scripts.start`
(or the Nx serve target) exists and its port is free. No runnable server → record the skip (below)
and move on; don't fight the environment.

## Tier 1 — Playwright MCP (when `.cursor/mcp.json` defines the `playwright` server)

1. Start the dev server (background, capture PID); wait for it to become available
2. Drive the changed feature through the MCP: `browser_navigate` to the affected page/story, then read `browser_snapshot` (accessibility tree) — see the `dom-sight` skill when installed
3. Confirm the happy path: expected elements present in the snapshot, no error states rendered; interact via the MCP tools where the change demands it
4. Kill the dev server PID; record the snapshot evidence in the QA report under "Browser Verification"

## Tier 2 — fallback (no Playwright MCP)

1. Start the dev server (background, capture PID); wait for it to become available
2. For e2e-playwright repos: run the relevant scenario via the project's Playwright runner
3. For fe-nx / design-system: load the page or story and confirm the happy path renders without console errors; capture a screenshot to `.cursor/screenshots/<feature>-happy-path.png`
4. Kill the dev server PID; record the result in the QA report under "Browser Verification"

## Skip conditions

- Non-UI archetype (`nestjs-graphql` or `generic`) → record "Skipped — non-UI archetype"
- No runnable dev server / Playwright → record "Browser verification SKIPPED — manual testing required"

**Load-bearing rule:** in any non-trivial skip case, the final Step 8 recommendation cannot be
"Ready for code review."
