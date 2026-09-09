---
name: ko-pr-desc
description: Generate a PR title and description from the branch name and current diff
---

# Generate PR Description

Generate a pull request title and body ready to paste into GitHub.

**Usage:** `/ko-pr-desc`

## Step 0: Preflight (silent, no stop)

One quick probe, no friction — this command is user-triggered and must stay fast:

- `gh auth status` — if green, `gh` may be used **read-only** to enrich the steps below (resolve the default branch, fetch the remote PR template, check `gh pr view` for an existing PR to update instead of duplicating). Never `gh pr create`/`edit`/comment — this command is output-only.
- If `gh` is absent or unauthenticated: proceed immediately with local git only; resolve the base branch by probing `origin/main` then `origin/master`.

## Step 1: Derive the PR Title

Read the current branch name:

```bash
git rev-parse --abbrev-ref HEAD
```

Extract the title using this pattern:

| Branch pattern | PR title |
|---|---|
| `feat/CON-1234` | `feat: CON-1234` |
| `fix/OXP-5678-short-desc` | `fix: OXP-5678` |
| `chore/KO-42-update-deps` | `chore: KO-42` |
| `refactor/no-ticket-slug` | `refactor: no-ticket-slug` |

Rule: split on `/`, take the prefix as the type; extract the ticket pattern (`[A-Z]+-[0-9]+`) from the remainder if present, otherwise use the full slug. Keep the title under 72 characters.

## Step 2: Load the PR Template

Search for a PR template in this order:

1. `.github/pull_request_template.md`
2. `.github/PULL_REQUEST_TEMPLATE.md`
3. `.github/PULL_REQUEST_TEMPLATE/*.md` (use the first file found)
4. `docs/pull_request_template.md`

If a template is found, use it as the body skeleton — fill in every `<<...>>` placeholder with generated content based on the diff.

If **no template is found**, use this default:

```markdown
# Change

In non-technical terms please explain your changes

### What changed

### What can break


# Description

<<Include a summary of changes in this PR. Provide any relevant context for the reviewer>>

## What does this PR address

Jira - <<insert Jira Link>>
```

## Step 3: Gather Diff Context

With `<base>` = the branch resolved in Step 0:

```bash
git diff <base>...HEAD --stat
git log <base>...HEAD --oneline
```

Use the changed files and commit messages to understand what this PR does.

**QA report chaining:** glob `.cursor/specs/qa-reports/*.md` and pick the newest report matching this branch/feature (branch name in the header, or feature-name overlap). When one exists, its Summary, introduced-failure list, and risk areas are the primary source for "What can break" and reviewer context — richer than rederiving from the raw diff. No report → fall back to the diff alone.

## Step 4: Fill the Template

Using the diff context, fill every section:

- **Non-technical explanation** — one or two plain-English sentences describing the user-visible or system-level change. No code jargon.
- **What changed** — bullet points of the key technical changes (files, modules, behaviours).
- **What can break** — honest assessment of risk areas, side-effects, or things a reviewer should probe. If nothing is risky, write "None identified."
- **Description** — a concise summary of the change and any reviewer context (why this approach, any trade-offs).
- **Jira link** — extract a ticket from the branch name if present (e.g. `https://jira.example.com/browse/CON-1234`); otherwise leave the placeholder.

Leave any section that cannot be filled from the diff as its placeholder text — do not invent content.

## Step 5: Output

Print the result in two clearly labelled blocks so the user can copy each independently:

```
**PR Title**
<generated title>

**PR Body**
<filled template>
```

Never create or edit the PR, post comments, or open a browser — output only. (`gh` reads permitted per Step 0.)
