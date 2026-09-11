<!-- ko-dev-kit-template -->
# AGENTS.md

This file provides project context for AI coding agents working in this repository.

## Project Type: Standalone Next.js App

A Next.js application, not part of an Nx workspace.

## Stack

- **Language:** TypeScript 5.x (`strict` mode)
- **Framework:** Next.js <!-- run /ko-onboard: version --> — **Router:** <!-- run /ko-onboard: App Router (`app/`) or Pages Router (`pages/`) -->
- **Data:** <!-- run /ko-onboard: REST/GraphQL client, SSR strategy -->
- **Styling:** <!-- run /ko-onboard: CSS modules / Tailwind / styled-components -->
- **Testing:** <!-- run /ko-onboard: Vitest or Jest + @testing-library/react; e2e runner if any -->
- **Lint:** ESLint (next/core-web-vitals) + Prettier

## Repo structure

```
app/ or pages/   # routes (whichever router this repo uses — not both)
components/      # shared UI
lib/             # server-safe utilities, data access
public/          # static assets
```
<!-- run /ko-onboard to replace with the real layout -->

## Commands

```bash
# run /ko-onboard: fill in the real scripts from package.json
pnpm dev        # start dev server
pnpm build      # production build
pnpm start      # serve the production build
pnpm test       # unit tests
pnpm lint       # lint
```

## Conventions

- Read `.cursor/rules/nextjs-app.mdc` for the binding conventions (router discipline, rendering modes, server/client boundaries).
- Never mix App Router and Pages Router patterns; match what the repo already uses.

## Kit commands (/ko-*)

Installed by ko-dev-kit. Core loop:

| Command | Purpose |
|---------|---------|
| `/ko-feature <name>` | New feature → brainstorm → spec → plan → implement → verify |
| `/ko-spike <question>` | Timeboxed throwaway experiment → findings + go/no-go (never merges) |
| `/ko-implement [plan]` | Resume/execute a plan from `.cursor/specs/` |
| `/ko-bugfix <desc>` | Systematic debugging → root-cause fix → regression test → verify |
| `/ko-test <target>` | Generate tests appropriate to the file/stack |
| `/ko-review [--team]` | Review the diff; `--team` = multi-specialist pass with verdict |
| `/ko-fix-review <PR>` | Fix review findings (kit + human + BugBot comments) in a fresh session |
| `/ko-verify` | Build/lint/type/tests + QA report |
| `/ko-onboard` | Fill in AGENTS.md with real repo values |
| `/ko-pr-desc` | Generate PR title and description from diff + branch name |

On-demand (install when needed: `ko-dev-kit install command <name>`):
`ko-release-verify`, `ko-knowledge-gen`, `ko-new-command`.

## Delivery

- **Deploy:** <!-- run /ko-onboard: Vercel / self-hosted / CI pipeline -->
- **Feature flags:** <!-- run /ko-onboard: flag tool + key naming, or "none" -->
