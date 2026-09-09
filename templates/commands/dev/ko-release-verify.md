---
name: ko-release-verify
description: Verify a release scoped by Jira tickets — the Buildkite deploy pipeline + its last-prod→nonProd commit range is the unit of work. Identify the pipelines the tickets touch, enumerate everything that ships in that range (including hitchhiker PRs), assess prod safety, and generate a pipeline-organized runbook. Read-only and generation only — NEVER deploys or writes to Buildkite.
args: "<Jira epic/ticket keys, e.g. KOSM-1234 or KOSM-1234,KOSM-1301>"
skills-optional: [unit-of-work]
---

# Release Verify: Tickets → Pipelines → Commit Range → Runbook

Given Jira tickets, work out **which Buildkite deploy pipelines they touch**, then for each pipeline treat the commit range **last-successful-prod-build → current-nonProd-build** as the release scope — because *everything* in that range ships together, not just your tickets. Verify that range is safe to promote to prod, and write the runbook. This command **verifies and generates only**.

> ⛔ **Buildkite is READ-ONLY here. NEVER** trigger, cancel, unblock, retry, rebuild, or create/update a build or pipeline — no exceptions. Use only read tools (list/get builds, pipelines, jobs, annotations). The human runs the deploy; this command hands them the runbook.

**Why this is fast:** the pipeline's commit range gives you the true deploy scope — including PRs from other tickets riding along — from **one build-pair read + one compare call per pipeline**, instead of reverse-searching every repo for every ticket. So ticket→PR discovery only has to find *which pipelines* are involved; Buildkite defines the rest.

**Critical:** you promote the **build that contains your change**, not the latest nonProd build. Pinning the wrong build ships everything merged after you.

## Step 0: Preflight gate — probe the tools BEFORE starting

Do not begin Step 1 until each tool is **actually probed** (a listed tool is not a working tool — sessions expire, tokens rot):

| Need | Live probe |
|---|---|
| Jira (tickets, dev panel) | Fetch one input ticket key via the Atlassian MCP |
| Buildkite (**read-only**) | A trivial read via the Buildkite MCP or `bk` CLI (e.g. list pipelines / current user) |
| GitHub (PRs, compare) | `gh auth status` |
| Repo checkouts (optional) | repos in `AGENTS.md` exist locally <!-- /ko-onboard: list the org's repos + local paths --> (only needed as a `gh api …/compare` fallback) |

Print the ✅/❌ checklist. All green → proceed. Any ❌ → **STOP and ask the user**: fix it (Cursor's Atlassian/Buildkite plugins on the **Customize** page, or add the servers to `.cursor/mcp.json`; Buildkite needs a **read-scoped** `BUILDKITE_API_TOKEN`), **or** proceed with that tool's cells marked `UNVERIFIED (<tool>)`.

## Step 1: Scope from Jira

- Fetch each input ticket. If a ticket is an **epic**, expand it (JQL `parent = <KEY>` / epic link) and include every child.
- Collect per ticket: key, title, type, status.
- Confirm the final ticket list with the user (one stop).

## Step 2: Tickets → repos & pipelines (fast, code-PR focused)

The only goal here is the set of **`{repo → deploy pipeline}`** the release touches, plus each ticket's **merge-commit SHA(s)**. Do the cheapest lookup that gets there:

1. **Jira dev panel first** (Atlassian MCP) — authoritative linked PRs/branches/commits, no searching.
2. **PR links in the ticket** description/comments — the URL gives the repo.
3. **Reverse `gh search prs "<KEY>" --repo <org>/<repo>`** — *only* for a ticket with no PR from (1) or (2). Don't sweep every repo by default.

Focus on **code-change** PRs (they touch deployable app/lib/worker source and drive a pipeline). Note docs/config-only PRs but don't chase them. A ticket with no code PR → **NOT FOUND** (list prominently — needs author follow-up). Output: the pipeline set + per-ticket merge SHAs, mapped to their pipeline. <!-- /ko-onboard: name the deploy pipelines + nonProd/prod build steps per repo -->

## Step 3: Per pipeline — the prod SHA and the RELEASE BUILD (Buildkite, read-only)

For each touched pipeline, via Buildkite **read** tools:

- **`PROD_SHA`** = commit of the **last successful prod deploy build**.
- **RELEASE BUILD** = the **specific nonProd build that contains your change** — the one you will promote — **NOT blindly the latest nonProd build.** Find it by matching this release's ticket merge SHA(s) to a build's `commit`: the correct build is the **earliest green nonProd build that already includes all of your target tickets**. Its commit is **`RELEASE_SHA`** and its **build number is what the deploy step references.**
  - ⚠️ Deploying the *latest* nonProd build instead would drag in every commit merged after yours. Example: your change is build **#10862** (`265adf0`, `CON-2820`), but the latest nonProd is **#10910** — promoting #10910 ships 48 extra builds you did not intend. Promote **#10862**.
  - Also record `LATEST_NONPROD` (build # + commit) for context, and **report the gap**: "release build #10862 (`265adf0`); latest nonProd is #10910 — builds #10863–#10910 are **excluded** from this deploy."
  - If the release build is **red/blocked**, flag it — not promotable. If your tickets span several builds, pick the earliest that contains **all** of them.
  - **Confirm the chosen release build with the user (one stop)** before continuing — they may intend a different pin.

Then classify each of your tickets against `PROD_SHA` / `RELEASE_SHA`:

- merge SHA is an ancestor of `PROD_SHA` → **ALREADY IN PROD** (no action).
- merge SHA is in `PROD_SHA..RELEASE_SHA` → **PENDING → release-note candidate** (this deploy ships it).
- merge SHA is *after* `RELEASE_SHA` (merged but not in the release build) → **NOT IN THIS RELEASE** — either it's not ready, or you need a later release build; call it out, don't silently include it.

Prefer Buildkite build metadata for the SHAs; ancestry needs no local checkout — `gh api repos/<org>/<repo>/compare/<PROD_SHA>...<merge_sha>` (`behind`/`identical` ⇒ included).

## Step 4: Enumerate the deploy range — the hitchhikers

The deploy range ends at **`RELEASE_SHA`** (the build you're promoting), **not** the latest nonProd. For each pipeline that needs a prod deploy, list **every** commit/PR in the range with one call:

```
gh api repos/<org>/<repo>/compare/<PROD_SHA>...<RELEASE_SHA>   # commits + associated PRs
```

(or `git log <PROD_SHA>..<RELEASE_SHA>` if the repo is checked out). Split the result:

- **Your tickets** — PRs whose title/branch carries an input ticket key.
- **Hitchhikers** — every *other* PR that merged in before your release build and will be promoted in the **same** deploy (e.g. `OPX-12`, `WX-312` riding along with `CON-1234`).

State the counts plainly: *"Promoting `<pipeline>` build #<release build> ships N commits / M PRs — K for your tickets, (M−K) hitchhikers. (P newer builds on nonProd are excluded.)"* This is the point of the command: nothing reaches prod invisibly, and you ship exactly up to your change — no further.

## Step 5: Safety over the whole range

Risk-assess **every** PR in the range (yours + hitchhikers) — they ship as one unit. For each, read the diff for:

- **Migrations / data** — backwards-compatible? decoupled from the code deploy?
- **API / GraphQL contracts** — removed/renamed subgraph fields break the router + clients; REST shape changes; pact/contract coverage.
- **Shared libraries** — bumps that fan out to other apps. <!-- /ko-onboard: note the shared-lib rebuild convention, if any -->
- **Config / infra** — env vars, IaC (cdk/serverless) that must be applied before code.
- **Dependencies** — major upgrades / lockfile churn on critical paths.
- **Revertability** — is `git revert` + redeploy enough, or does rollback need data/flag steps?

Per PR: **LOW / MEDIUM / HIGH** + one-line reason + mitigation. A **hitchhiker you can't assess** (unknown ticket, no context) is flagged **"unreviewed hitchhiker — needs owner sign-off"** and listed as a required pre-deploy action; it doesn't auto-fail the release, but it must be surfaced. Per-pipeline verdict: **GO / GO WITH ACTIONS / NO-GO** — never GO with an unmitigated HIGH, a red nonProd build, or an `UNVERIFIED` deployment fact.

## Step 6: Feature flags

Scan the range's diffs for the repo's flag mechanism <!-- /ko-onboard: name the flag tool + key naming convention -->: flag key, new-or-existing, default state in code, and the release action (flip on after deploy? targeted rollout? retire a dead flag?). Flag-tool targeting usually isn't readable here → list as an explicit pre-release action ("confirm `<key>` targeting in <flag tool> for prod").

## Step 7: Write the runbook (organized by pipeline)

Write `docs/releases/<version-or-slug>.md` (or `.cursor/specs/release-<slug>/runbook.md` if the repo doesn't keep release docs — ask once):

1. **Header** — date, scope (tickets), overall verdict, tool coverage (what's `UNVERIFIED` and why). ⛔ read-only-Buildkite reminder.
2. **Release notes** — what actually ships to prod, grouped by pipeline: your tickets (title + PR) that are PENDING.
3. **Per pipeline** — `PROD_SHA…RELEASE_SHA`; the **release build number** to promote (and the note that newer nonProd builds are excluded); your-tickets vs hitchhikers with counts; the risk verdict; the flag plan; the **deploy step** — *"Unblock Deploy to Production on build **#<release build>**"* (the specific build, not the latest — *the human triggers it; this command never does*); post-deploy checks <!-- /ko-onboard: name the sanity run command + monitors -->; rollback (revert path, flag kill-switches, data notes).
4. **Blockers & follow-ups** — NOT DEPLOYED tickets, NOT FOUND tickets, unreviewed hitchhikers needing sign-off.

Finally, if an active unit of work covers this release (see the `unit-of-work` skill when installed): set its Phase to `operations` (or `done` once shipped) and append a release bolt-log row.

## Boundaries

- **Buildkite: read-only, always.** Never trigger/cancel/unblock/retry/rebuild a build; never create/update a pipeline; never deploy. Only list/get reads.
- No flag changes, no Jira transitions, no code edits — verification and generation only.
- Deployment truth comes from **Buildkite build commit SHAs + commit-range ancestry**, never from a ticket's Jira status.
- The deploy scope is the range up to the **release build that contains your change** (`PROD_SHA…RELEASE_SHA`), **never blindly the latest nonProd build** — and every hitchhiker in that range is enumerated.
- Every claim is evidenced (build number / SHA / PR link) or marked `UNVERIFIED` — no silent guesses.
