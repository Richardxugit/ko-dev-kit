---
name: ko-help
description: Show all available /ko-* commands and workflows
---

# /ko-* Command Help

Display the following to the user. **Only show the archetype groups whose commands actually exist in `.cursor/commands/`** (filtered to the detected archetype).

## Workflow Starters

These set up project context and (when superpowers is installed) hand off to the full workflow:

| Command | Description |
|---------|-------------|
| `/ko-feature <name>` | New feature → brainstorm → spec → ⏸ review → plan → implement → verify (claims a unit of work when one matches) |
| `/ko-bugfix <desc>` | Fix a bug → systematic debugging → fix → regression test → verify |
| `/ko-implement [plan]` | Resume/execute a plan from `.cursor/specs/` with checkpoints (picks up in-progress unit stories) |
| `/ko-release-verify <tickets>` | Jira tickets → related PRs → Buildkite deploy state (nonProd/prod) → risk + flags → release runbook (never deploys) |

## Action Shortcuts

These perform a specific action directly:

| Command | Description |
|---------|-------------|
| `/ko-onboard` | Explore the repo and fill in `AGENTS.md` with real values |
| `/ko-test <target>` | Generate tests appropriate to the file/stack |
| `/ko-review` | Fast single-agent review of the current diff via the `code-reviewer` agent |
| `/ko-review-team [PR…]` | Heavy multi-agent PR review — a team of specialists (compliance, regression, frontend+a11y, backend, tests) in one round, FE/BE routed differently, consolidated verdict |
| `/ko-verify` | Run build/lint/type/tests and generate a QA report |
| `/ko-knowledge-gen` | Generate knowledge base (full repo or focused topic) |
| `/ko-pr-desc` | Generate PR title and description from diff + branch name |
| `/ko-new-command <plain-english>` | Mint a custom `/ko-*` command from a description (manually installed — only listed when present) |
| `/ko-help` | This help message |

## Archetype Commands

### Frontend Nx monorepo (`fe-nx`)
| Command | Description |
|---------|-------------|
| `/ko-lib-package <Name>` | Scaffold a new shared package in `packages/` with all config files |

### NestJS + GraphQL (`nestjs-graphql`)
| Command | Description |
|---------|-------------|
| `/ko-svc-lambda <name>` | Scaffold a Lambda worker with `wrapLambda()` pattern |
| `/ko-svc-nest-app <name>` | Scaffold a new NestJS app (Apollo Federation subgraph) |
| `/ko-svc-lib <name>` | Scaffold a new shared library in `libs/` |

### Playwright BDD (`e2e-playwright`)
| Command | Description |
|---------|-------------|
| `/ko-e2e-test <flow>` | Generate a test reuse-first: registry match → propose [REUSE]/[ADAPT]/[NEW] → generate → verify → hand off failures |
| `/ko-e2e-heal <test>` | Triage failing/flaky test (test defect vs product regression), delegate repair to `e2e-debugger`, re-verify to stability |

### Design system (`design-system`)
| Command | Description |
|---------|-------------|
| `/ko-ds-component <Name>` | Scaffold MUI v6 component (6-file structure). Standard or discovery profile |

### Product / BA (`product` addon — `init --with-product` or the ko-product plugin)
| Command | Description |
|---------|-------------|
| `/ko-feat-discovery <input>` | Repo-aware brainstorm of any feature input (Jira/Confluence/docs/idea) into a discovery analysis (pipeline stage 1) |
| `/ko-slice <epic>` | Size the discovered feature and slice it into story skeletons — one story when small, SPIDR when not (stage 2) |
| `/ko-groom [selector\|instructions]` | Elaborate skeletons into full stories (type-aware: story/spike/refactoring/solution-design) with a DoR verdict (stage 3) |

### Design (`design` addon — `init --with-design` or the ko-design plugin)
| Command | Description |
|---------|-------------|
| `/ko-design-verify <app URL> <Figma URL>` | Visual-QA a running UI against a Figma frame — DOM computed-style diff → severity-ranked HTML fidelity report |

## Dependencies

Workflow starters work best with the **superpowers** skills (install via the [superpowers repo](https://github.com/obra/superpowers)). They are optional — every command works standalone via inline fallbacks. When installed, the kit invokes them automatically.

## External Integrations

- **superpowers** — `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`.
- **caveman** — `/caveman` compresses responses ~65% to save tokens. Off with "normal mode".

## Agents

When tasks are delegated during plan execution, these specialist agents are available (in `.cursor/agents/`):
- **frontend-developer** — Nx React component/app work
- **backend-developer** — NestJS + GraphQL service work
- **qa-automation-engineer** — Playwright BDD end-to-end testing
- **e2e-debugger** — diagnose + self-heal failing/flaky e2e tests
- **design-system-engineer** — MUI + Storybook component library
- **code-reviewer** — diff review across all archetypes
- **review-specialist** — one dimension of a `/ko-review-team` PR review (compliance / regression / frontend+a11y / backend / tests)

Also: skills in `.cursor/skills/` load automatically when relevant (or invoke with `/<skill-name>`), and rules in `.cursor/rules/` apply per their globs (`coding-standards.mdc` is always on).
