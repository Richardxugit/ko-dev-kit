---
name: ko-onboard
description: Explore this repo and fill in AGENTS.md with repo-specific details
---

# Onboard: Customize AGENTS.md for This Repo

You are onboarding this repository for Cursor. Your job is to explore the project, understand its structure, and rewrite `AGENTS.md` with accurate, repo-specific details, replacing the kit's placeholders.

## Step 1: Read the current AGENTS.md

Read it now — you need to know the baseline template before dispatching exploration. Placeholders come in two spellings; treat both as yours to fill: any comment matching `<!-- run /ko-onboard ... -->` **or** `<!-- /ko-onboard: ... -->` (other kit commands plant the second form inline where they need a repo-specific value).

## Step 2: Dispatch Explore agent

Launch an Explore agent (thoroughness: "very thorough") with this prompt:

> Explore this repository and report back a structured summary for writing an AGENTS.md file. I need:
>
> **Build & Scripts:**
> - Read `package.json` scripts (and `nx.json` targets if present) — list every available command (dev, build, test, lint, format, e2e, etc.)
> - Note the package manager (pnpm, yarn, npm) and version constraints. The lockfile is the source of truth (`pnpm-lock.yaml`, `yarn.lock`).
>
> **Project Structure:**
> - Map the workspace layout (apps/, packages/, libs/) and the top 3 levels of source
> - Identify the organizational pattern (Nx project boundaries, feature-based, layer-based)
>
> **Dependencies & Patterns:**
> - State management: grep for zustand, jotai, redux, apollo client cache, react-query/tanstack in src/
> - Styling: grep for styled-components, MUI (`@mui/*`), tailwind, css modules, emotion in src/
> - API layer: GraphQL (Apollo), REST clients, codegen (`@graphql-codegen`)
> - Backend: NestJS modules/resolvers/services, Apollo Federation subgraphs, Lambda handlers
> - Testing: jest, vitest, playwright, playwright-bdd, cucumber, react-testing-library configs and example test files
> - i18n: react-i18next / i18next setup and locale files
>
> **Config Files:**
> - Check for: tsconfig*.json, nx.json, project.json, vite/webpack config, .eslintrc.*, jest/vitest config, playwright.config.*, .storybook/, codegen.* , docker-compose.*, CI config (.gitlab-ci.yml, .github/workflows/)
>
> **Delivery & Operations:**
> - Feature flags: grep for flag SDKs (Optimizely, LaunchDarkly, Unleash, Split) and flag config files; note the tool and the key naming convention visible in code
> - Deploy/CI: read `.buildkite/` (pipeline files, step names) and any other CI config; list pipeline names and which steps look like nonProd/prod deploys
> - Sanity/smoke: find the script or tag conventions used for post-deploy checks (package.json scripts, test tags)
> - (e2e repos) registry aliases: list the `registry:*` / codegen scripts and the page-helper names (e.g. the pwHelper/BasePage equivalents)
> - (backend repos) shared libraries: which libs fan out to multiple apps, and any rebuild-trigger convention when they change
>
> **Other:**
> - Read README.md if it exists
> - Note any monorepo/workspace configuration and the path alias scheme (`@org/*`)
> - Note environment setup requirements (env vars, local services)
>
> Return a structured report with all findings. Include actual values, not descriptions — real script names, real folder paths, real dependency versions.

## Step 3: Check MCP setup

If `.cursor/mcp.json` exists, review its server entries and note any that the repo needs (e.g. a GraphQL/schema server). If the repo would benefit from an MCP server it doesn't yet have, mention it as a one-line recommendation — don't configure it yourself.

## Step 3b: Check a11y test tooling (frontend archetypes only)

If the repo is React and `jest-axe` (or `vitest-axe` / `@axe-core/react`) is not in devDependencies, tell the user: without it, the kit's a11y assertions in `/ko-verify` and `/ko-ds-component` can never run automatically. Recommend: `pnpm add -D jest-axe @types/jest-axe` (or the vitest equivalent). Don't install it yourself — surface it as a one-line recommendation.

## Step 3c: Ask the user for the non-derivables (one batched round)

Some Delivery facts can't be read from the repo. Ask **once**, in a single batched round, only for what the Explore report didn't settle:

- Which sibling repos make up this product family, and their local checkout paths?
- Which Buildkite pipeline(s) deploy this repo, and what are the nonProd / prod step or environment names?
- Which dashboards/monitors do you watch after a deploy?

Anything left unanswered is written into `AGENTS.md` as `UNKNOWN — fill me` — **never guessed**.

## Step 4: Rewrite AGENTS.md

Using the Explore agent's report and the user's answers, rewrite `AGENTS.md` with actual repo-specific details:
- Replace every placeholder matching either dialect (`<!-- run /ko-onboard ... -->` / `<!-- /ko-onboard: ... -->`) with real values from the report or the user's answers — or `UNKNOWN — fill me`
- Remove sections that don't apply to this repo
- Add sections for patterns the template didn't cover
- Keep it concise — `AGENTS.md` is orientation; `.cursor/rules/` holds the enforceable rules

## Step 5: Report

Summarize the key differences between the template and the customized version.

## Step 6: Offer Knowledge Base Generation

1. Check if `.cursor/knowledge-base/` already exists — if yes, skip this step
2. Ask the user: "Would you like me to generate a knowledge base for this repo? This creates detailed, topic-scoped docs in `.cursor/knowledge-base/` that help Cursor understand this codebase deeply. You can regenerate it anytime with `/ko-knowledge-gen`."
3. If the user accepts, invoke `/ko-knowledge-gen`
4. If the user declines, continue without further nudging

## Important

- Do NOT change any files other than `AGENTS.md`, unless the user opts into knowledge base generation (Step 6)
- Do NOT add speculative information — only document what the Explore agent verified
- If a section from the template doesn't apply to this repo, remove it
- If the repo has patterns not in the template, add them
