---
name: ko-knowledge-gen
description: Generate knowledge base docs — either for the full repo (no args) or a focused deep-dive on a specific flow/topic (e.g. `/ko-knowledge-gen flybuys-linking`).
args: "[topic]"
---

# Generate Knowledge Base

Two modes:
- **Full repo** (`/ko-knowledge-gen`) — generate all topic-scoped documents for the entire codebase
- **Focused topic** (`/ko-knowledge-gen <topic>`) — generate ONE deep-dive document tracing a specific flow, feature, or integration

## Mode Detection

If `<topic>` is provided → **Focused Mode** (skip to Focused Mode section below).
If no args → **Full Repo Mode** (continue with Step 1).

## Focused Mode — Single Topic Deep-Dive

When a `<topic>` is provided (e.g. `/ko-knowledge-gen flybuys-linking`, `/ko-knowledge-gen onepass-auth-flow`), generate ONE focused document that traces that specific flow end-to-end.

### Step F1: Understand the Topic

Ask the user (if not obvious from the topic name):
- What is the entry point? (API endpoint, resolver, Lambda trigger, UI action)
- What's the expected scope? (just this service, or cross-service?)

### Step F2: Trace the Flow

Starting from the entry point, trace the complete execution path:

1. **Entry** — the resolver/handler/controller/page that kicks off the flow
2. **Service layer** — the service methods called, in order
3. **External calls** — APIs, databases, queues, caches touched (with request/response shapes)
4. **Decision points** — conditionals, feature flags, error branches
5. **Side effects** — events published, emails sent, cache invalidations, audit logs
6. **Exit** — what the caller receives back (response shape, errors)

Read the actual source files. Follow imports. Don't guess.

### Step F3: Write the Document

Save to `.cursor/knowledge-base/<topic-slug>.md` with this structure:

```markdown
# <Topic Name>

## Overview
One paragraph: what this flow does and when it's triggered.

## Entry Point
- File: `<path>:<line>`
- Trigger: <what kicks this off>

## Sequence
1. <Step 1 — what happens, which file/method>
2. <Step 2>
...

## External Dependencies
| Service/Store | Purpose | File | Error handling |
|---|---|---|---|
| DynamoDB (orders table) | Read order status | `order.repository.ts:45` | Throws NotFoundException |
| Auth0 Management API | Validate token | `auth.service.ts:112` | Retries 3x, then 401 |

## Feature Flags
| Flag | Effect when ON | Effect when OFF |
|---|---|---|
| `flybuys_linking_v2` | Uses new linking API | Falls back to legacy endpoint |

## Error Paths
| Condition | What happens | Response |
|---|---|---|
| User not found | Throws NotFoundException | 404 / GraphQL NOT_FOUND |
| Token expired | Refresh attempt, then re-auth | 401 if refresh fails |

## Data Shapes
<Key request/response types, entity fields — as TypeScript interfaces or tables>

## Integration Anchors
| Symbol | Location | Hook point |
|---|---|---|
| `linkFlybuysAccount` | `flybuys.service.ts:78` | Main orchestration method |
| `FlybuysLinkedEvent` | `events/flybuys.events.ts:12` | Published after successful link |
```

### Step F4: Report

Report: document path, topic covered, entry points traced, external dependencies found.

---

## Full Repo Mode

Analyze the codebase and generate topic-scoped markdown documents in `.cursor/knowledge-base/`. These documents enable understanding of what the project does, how it connects to other components, what the impact of changes would be, and enough architectural detail to generate diagrams from.

## Step 1: Detect Archetype and Project Name

**Project name:** derive from the current repo directory name (e.g., `ko-services`, `account-app`).

**Archetype detection** — check `.cursor/rules/` first, then fall back to codebase signals:

1. If `.cursor/rules/nestjs-graphql.mdc` exists → **nestjs-graphql**
2. If `.cursor/rules/fe-nx.mdc` exists → **fe-nx**
3. If `.cursor/rules/e2e-playwright.mdc` exists → **e2e-playwright** (ko-qa-kit repos)
4. If `.cursor/rules/design-system.mdc` exists → **design-system**
5. If no rules found, detect from codebase:
   - `@nestjs/core` dependency → **nestjs-graphql**
   - `@playwright/test` + (`playwright-bdd`/`@cucumber/cucumber`) or `**/*.feature` → **e2e-playwright**
   - `@mui/material` + `@storybook/*` → **design-system**
   - `nx.json` or `@nx/*` → **fe-nx**
6. If no archetype can be determined → **generic** (use the generic document list below)

The archetype determines the default document list (see below).

## Step 2: Explore and Plan

1. Explore the codebase to understand its structure:
   - Build files (`package.json`, `nx.json`, `project.json`)
   - README and existing documentation
   - Workspace/module structure (`pnpm-workspace.yaml`, `nx.json`, `tsconfig*`)
   - Source directory layout
   - GraphQL schema/SDL, codegen config, OpenAPI specs
   - Configuration files (`.env`, Nest config modules, etc.)

2. Present the archetype-appropriate document list to the user. Let them add, remove, or rename topics. If "defaults are fine," proceed without further confirmation.

3. Ask if any code is legacy or deprecated that should be called out.

4. Create the output directory: `mkdir -p .cursor/knowledge-base/`

## Step 3: Detect Write Mode

Test whether sub-agents can write files by dispatching a small agent that writes `.kb-staging/__probe__`. If it succeeds, use **Fast Path**. If it fails, use **Fallback Path**. Either way, delete the probe file after the test.

If using Fast Path: add `.kb-staging/` to `.gitignore` if not already present (append, do not overwrite).

> **Tip:** switch to an auto-accept edit mode before running this command to enable parallel document generation via sub-agents writing directly. Default mode falls back to sequential writes, which is slower.

## Step 4a: Fast Path — Parallel Agent Write

Dispatch one agent per document. Each agent researches its topic and writes the document to `.kb-staging/<filename>`.

**Agent prompt template:**

```
You are generating a knowledge base document for the <project-name> project.

Document: <filename> — <topic>
Output path: <repo-root>/.kb-staging/<filename>

What to include: <from the document list>

Source files to read: <list of specific files/directories/patterns relevant to this document>

Content guidelines:
<include the Content Guidelines section from this command>

<include any legacy/deprecated notes from the user>

Instructions:
1. Read the listed source files thoroughly
2. Write the document to the staging path above
3. The document should be <target size from the document list>
4. Do NOT return document content to the main session — write it to the file
```

After all agents complete:
```bash
mv .kb-staging/*.md .cursor/knowledge-base/
rm -rf .kb-staging/
```

## Step 4b: Fallback Path — Research Agents + Sequential Write

When agents cannot write files, they research only and return structured findings. The main session writes each document sequentially.

**Dispatch research agents in parallel (one per document):**

```
You are researching the <project-name> project to help generate a knowledge base document.

Document: <filename> — <topic>

What to include: <from the document list>

Source files to read: <list of specific files/directories/patterns relevant to this document>

Instructions:
1. Read the listed source files thoroughly
2. Return a STRUCTURED RESEARCH SUMMARY — not the full document. Include:
   - Key findings organized by section headings
   - Exact class names, method signatures, entity fields, GraphQL types, endpoint/resolver paths
   - Code snippets for complex logic (state machines, auth flows, etc.)
   - Tables of structured data (resolvers, entities, flags) — already formatted as markdown
   - Specific numbers: counts of resolvers, entities, flags, etc.
3. Keep the summary under 400 lines — include all implementation detail. This is a knowledge base, not a summary.
4. Do NOT write any files
```

**Then write documents sequentially** — process one at a time:
1. Read the agent's research summary
2. Write the full document to `.cursor/knowledge-base/<filename>`
3. Move on to the next

## Step 5: Report

Report what was generated: list each document, its path, and approximate size. Suggest which docs are most useful for common tasks (e.g. "Read `04-auth-security.md` before touching auth guards").

## Default Document Lists by Archetype

Adapt to what the codebase actually contains. Skip topics that don't apply. Add topics that do.

### nestjs-graphql

| File | Topic | Description | What to Include | Target Size |
|------|-------|-------------|-----------------|-------------|
| `00-overview.md` | Service Overview | Read for service purpose, ecosystem context, module structure, tech stack | Purpose, ecosystem fit, Nest module structure, tech stack, multi-tenancy, deployment | 200-400 lines |
| `01-graphql-api.md` | GraphQL API | Read when modifying schema, resolvers, queries/mutations, federation | Schema/SDL by domain, resolvers, queries/mutations/subscriptions, federation keys, input/output types, error model | 300-600 lines |
| `02-core-workflow.md` | Core Domain Workflow | Read when modifying business logic, state machines, lifecycle flows | Primary lifecycle/workflow. Rename to match domain. State machines, transitions, sequence flows | 300-600 lines |
| `03-configuration.md` | Configuration | Read when changing Nest config, environment variables, validation | Config modules, env vars, validation schemas, field types | 200-500 lines |
| `04-auth-security.md` | Auth & Security | Read when modifying authentication, authorization, guards, or security | Auth mechanisms, guards/decorators, authorization model, encryption, exception filters with HTTP/GraphQL mappings | 400-600 lines |
| `05-integrations.md` | External Integrations | Read when modifying external service calls, gateways, retry/circuit breaker behavior | Each gateway/client: purpose, key methods with signatures, error handling, retry, circuit breakers | 300-600 lines |
| `06-event-system.md` | Event System | Read when modifying queues, events, producers/consumers, or Lambda workers | Queues/topics (SQS/SNS/EventBridge), event types with schema fields, producers, consumers, Lambda workers, delivery guarantees | 200-400 lines |
| `07-data-model.md` | Data Model | Read when modifying entities, repositories, caching, or data relationships | Entities (TypeORM/Prisma) with fields/types/indexing, repositories, relationships, caching with TTLs | 300-600 lines |
| `08-feature-flags.md` | Feature Flags | Read when adding, modifying, or checking feature flag behavior | Flag system, all flags with keys, evaluation model, behavioral impact per flag | 150-300 lines |
| `09-inter-service-deps.md` | Inter-Service Dependencies | Read when modifying cross-service/subgraph contracts or failure handling | Direction, mechanism, data exchanged, security, coupling, failure behavior. Include text dependency diagram | 300-500 lines |

### fe-nx

| File | Topic | Description | What to Include | Target Size |
|------|-------|-------------|-----------------|-------------|
| `00-overview.md` | App Overview | Read for app purpose, ecosystem context, workspace structure, tech stack | Purpose, ecosystem fit, apps/libs structure, tech stack, build/deploy | 200-400 lines |
| `01-app-structure.md` | Apps & Routing | Read when adding pages/routes or changing navigation | Apps, route definitions (Next.js app router), navigation, guards/auth on routes | 200-400 lines |
| `02-core-workflow.md` | Core User Workflows | Read when modifying user workflows, step-by-step flows | Primary workflows. Rename to match domain. Step-by-step flows with edge cases | 300-600 lines |
| `03-state-management.md` | State Management | Read when modifying state, data flow, or async patterns | State approach (Apollo cache / zustand / jotai / redux), data flow, side effects, async patterns | 300-500 lines |
| `04-api-integration.md` | API Integration | Read when modifying GraphQL/REST calls, client setup, or error handling | Apollo Client setup, generated hooks/codegen, queries/mutations by feature, request/response models, error handling | 300-600 lines |
| `05-component-architecture.md` | Component & Library Architecture | Read when creating components or Nx libraries, modifying boundaries | Nx project graph, `type:ui`/`type:feature`/`type:data-access` libs, tags + boundary rules, shared components, composition | 300-500 lines |
| `06-styling-a11y.md` | Styling & Accessibility | Read when modifying styling patterns, theme, or accessibility | Styling approach (styled-components/MUI/css modules), theme tokens, WCAG 2.2 AA compliance, a11y testing | 200-400 lines |
| `07-configuration.md` | Configuration | Read when changing Nx/build config, env vars, or feature flags | Nx config, build config, env vars, feature flags, deployment settings | 150-300 lines |

### design-system

| File | Topic | Description | What to Include | Target Size |
|------|-------|-------------|-----------------|-------------|
| `00-overview.md` | Library Overview | Read for library purpose, consumers, package structure, tech stack | Purpose, who consumes it, package structure, tech stack (MUI version, Storybook), build/publish model | 200-400 lines |
| `01-component-catalog.md` | Component Catalog | Read when adding/changing components or their public API | Components list, prop API patterns, composition, ref forwarding, naming conventions | 300-500 lines |
| `02-theming.md` | Theming | Read when modifying theme, tokens, or multi-brand support | MUI theme structure, design tokens, palette/typography/spacing, multi-brand theming | 200-400 lines |
| `03-storybook.md` | Storybook | Read when adding stories or changing Storybook config | CSF3 patterns, autodocs, decorators, addons, story organization | 200-400 lines |
| `04-a11y.md` | Accessibility | Read when modifying a11y patterns or audit approach | WCAG 2.2 AA patterns, keyboard/focus/ARIA conventions, axe + a11y addon usage | 200-400 lines |
| `05-build-publish.md` | Build & Publish | Read when changing build, exports, or versioning | Package build, entry points/exports map, versioning, release process | 150-300 lines |

### e2e-playwright (if installed — ko-qa-kit repos)

| File | Topic | Description | What to Include | Target Size |
|------|-------|-------------|-----------------|-------------|
| `00-overview.md` | Suite Overview | Read for what the suite covers, structure, tech stack | Purpose, what apps/flows are covered, structure, tech stack (Playwright, BDD), run model | 200-400 lines |
| `01-test-structure.md` | Test Structure | Read when adding features/specs or changing projects config | `.feature`/spec layout, `playwright.config` projects, tags, sharding | 200-400 lines |
| `02-step-registry.md` | Step Definitions | Read when adding or reusing step definitions | Step registry, custom steps, parameter types, reuse patterns | 200-400 lines |
| `03-page-objects.md` | Page Objects & Helpers | Read when adding page objects or shared helpers | POM structure, helpers (pwHelper), selectors strategy, frame handling | 200-400 lines |
| `04-fixtures-data.md` | Fixtures & Test Data | Read when modifying fixtures, auth setup, or test data | Fixtures, auth/storage state, test data builders, mocking/network | 200-400 lines |
| `05-ci-reporting.md` | CI & Reporting | Read when changing CI, reporters, or trace/retry behavior | CI pipeline, reporters, traces/screenshots, retries, flake handling | 150-300 lines |

### generic

Use when no archetype matches. Adapt heavily to the actual codebase.

| File | Topic | Description | What to Include | Target Size |
|------|-------|-------------|-----------------|-------------|
| `00-overview.md` | Project Overview | Read for project purpose, ecosystem context, module structure, tech stack | Purpose, ecosystem fit, module/package structure, tech stack, build/deploy | 200-400 lines |
| `01-architecture.md` | Architecture | Read when modifying entry points, module boundaries, or data flow | Entry points, module boundaries, data flow, key abstractions, design patterns | 300-500 lines |
| `02-core-workflow.md` | Core Workflow | Read when modifying primary workflows or lifecycle flows | Primary workflow/lifecycle. Rename to match domain. Step-by-step flows with edge cases | 300-600 lines |
| `03-api-surface.md` | API / CLI Surface | Read when modifying public APIs, CLI commands, or exported interfaces | Public APIs, CLI commands, exported interfaces | 200-500 lines |
| `04-configuration.md` | Configuration | Read when changing config files, environment variables, or feature flags | Config files, env vars, feature flags, deployment settings | 150-300 lines |
| `05-dependencies.md` | Dependencies & Integrations | Read when modifying external integrations or inter-module dependencies | External services, libraries with non-trivial usage, inter-module dependencies | 200-400 lines |
| `06-data-model.md` | Data Model | Read when modifying database entities, file formats, or state structures | Database entities, file formats, state structures | 200-500 lines |
| `07-testing.md` | Testing | Read when modifying test infrastructure, coverage, or test strategy | Test strategy, infrastructure, how to run tests, coverage approach | 150-300 lines |

## Content Guidelines

- Each document must be self-contained and independently queryable by humans and AI
- Derive all content from actual source code — do not invent or assume
- No emojis. Factual tone.
- Mark deprecated or legacy code explicitly

### Depth Expectations

These are knowledge base documents for deep understanding and impact analysis — not a high-level overview. Include implementation-level detail:

- **Class/type names and method signatures** — the exact interface, implementation class, and key method signatures
- **Entity/GraphQL fields with types** — full field tables with name, type, and annotations
- **Step-by-step flows with edge cases** — lifecycle transitions as numbered steps covering happy path AND error/edge cases
- **Exception/error hierarchies** — error class, parent, HTTP/GraphQL mapping, trigger condition
- **Guard/permission expressions** — the actual guard/decorator usage, not just "requires auth"
- **Constants and validation limits** — exact values (max lengths, TTLs, retry counts)

Use tables for structured data. Use code blocks for flow diagrams (text-based).

If a detail cannot be determined from source code, mark it `[NOT IN CODEBASE]` rather than omitting it.

## Committing

After generation, ask the user if they want to commit the knowledge base (only if in a git worktree, per `coding-standards.mdc`). If yes, commit all files in `.cursor/knowledge-base/` together.

## Context Management

If a document's source files exceed 20 files, provide agents with specific file paths rather than directories. If still too large, split into focused sub-agents per section, then merge.
