<!-- ko-dev-kit-template -->
# AGENTS.md

This file provides project context for AI coding agents working in this repository.

## Project Type: Standalone React App

A single-page React application (Vite/CRA-style). Not part of an Nx workspace; no Next.js.

## Stack

- **Language:** TypeScript 5.x (`strict` mode)
- **UI:** React 18+
- **Build:** <!-- run /ko-onboard: Vite / CRA / other + version -->
- **State:** <!-- run /ko-onboard: useState/context only, zustand, redux, ... -->
- **Data:** <!-- run /ko-onboard: fetch wrapper, axios, react-query, Apollo, ... -->
- **Styling:** <!-- run /ko-onboard: CSS modules / styled-components / Tailwind / emotion -->
- **Testing:** <!-- run /ko-onboard: Vitest or Jest + @testing-library/react -->
- **Lint:** ESLint + Prettier

## Repo structure

```
src/
  components/    # reusable UI
  pages/         # route-level screens (or routes/)
  hooks/         # shared hooks
  lib/           # utilities, api clients
```
<!-- run /ko-onboard to replace with the real layout -->

## Commands

```bash
# run /ko-onboard: fill in the real scripts from package.json
pnpm dev        # start dev server
pnpm build      # production build
pnpm test       # unit tests
pnpm lint       # lint
```

## Conventions

- Read `.cursor/rules/react-app.mdc` for the binding conventions (component shape, hooks discipline, data layer reuse).
- Match the existing data-fetching and styling approaches — never introduce a second one.

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

- **Deploy:** <!-- run /ko-onboard: how this app ships (CI pipeline, hosting) -->
- **Feature flags:** <!-- run /ko-onboard: flag tool + key naming, or "none" -->
