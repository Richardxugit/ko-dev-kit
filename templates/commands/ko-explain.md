---
name: ko-explain
description: Explain a feature, flow, API, or a finished change (PR/branch/range) — a visual chat answer with mermaid diagrams and file:line citations. Target comes from args, then session context; asks only when both are absent.
args: "[what to explain — topic, PR #, branch, or range]"
---

# Explain

Give the human a fast, visual understanding of a feature, flow, API, or finished change. The answer goes IN CHAT — this is not knowledge-base generation (`ko-knowledge-gen` writes persistent docs; this command writes nothing unless asked).

## Step 0: Determine the target — args, then context, then ask

Resolve the target from the first source that yields one:

1. **Explicit args** — go to Step 1 to classify them.
2. **Session context** — the conversation already carries a subject: a change just implemented or discussed, a diff on disk (`git status` / `git diff` non-empty against the base branch), a feature being debated. Name the inferred target in ONE line ("Explaining the uncommitted diff in this workspace — interrupt to redirect") and proceed. If context suggests several equally plausible targets, treat it as no context.
3. **Neither** — ASK before spending a single token on exploration:
   - Run ONE cheap command for candidates: `git branch --sort=-committerdate --format='%(refname:short) — %(committerdate:relative)' | head -5`
   - Ask one question: "Explain what — one of these recent branches, a feature/flow/API name, a PR number, or a git range?"
   - Never open a fresh session with a repo scan on a guess.

## Step 1: Classify the target

- `#123`, a bare number, `PR 123` → **change** (a pull request)
- Resolves as a git ref (`git rev-parse --verify`), or contains `..` → **change** (branch / range / uncommitted diff)
- Anything else → **topic** (feature, flow, API, module)
- Genuinely ambiguous (a word that is both a branch and a concept) → one-line confirm, then proceed.

## Step 2a: Change mode — explain a finished unit of work

- Get the diff first: `git diff <base>...<head>` (uncommitted: `git diff <base>`). For a PR: `gh pr view <N> --json title,body,files` + `gh pr diff <N>` when `gh` is authenticated; otherwise ask for the branch name.
- Read the diff completely; then read surrounding code ONLY where the diff doesn't explain itself.
- Answer shape:
  1. **What changed and why** — 3–5 bullets, ticket/PR context first
  2. **Change map** — table: layer | files | what it does now
  3. **New flow** — mermaid sequence/flowchart, only if behavior changed
  4. **Decision points & risks** — table: condition | behavior | where (file:line)
  5. **Reading path** — the ≤3 files to open first, with file:line anchors

## Step 2b: Topic mode — explain a feature / flow / API

- Locate entry points with grep/glob (resolver, route, handler, page, exported symbol). Zero hits → say so and list the 2–3 closest symbol matches; never invent a flow.
- Trace end-to-end: entry → service layer → external calls → decision points → side effects → exit. Read the actual source; follow imports (coding-standards evidence rule).
- Answer shape:
  1. **Overview** — one paragraph: what it does, when it triggers
  2. **Flow** — mermaid sequence or flowchart. The diagram is the point; keep the prose around it thin.
  3. **External dependencies** — table: service/store | purpose | where | failure handling
  4. **Error paths & flags** — table: condition | behavior | where
  5. **Reading path** — the ≤3 files to open first, with file:line anchors

## Output contract (both modes)

- Chat answer, not a file. If the user wants it persisted, they say so — then write it to `.cursor/knowledge-base/`.
- ≤300 lines, ≤3 mermaid diagrams. Cut detail, keep the map. An explanation that needs 800 lines is a KB doc — recommend `/ko-knowledge-gen <topic>` instead (manual-tier, skip the suggestion if not installed).
- EVERY claim carries file:line. Unverifiable from source → mark `[NOT IN CODEBASE]`, never guess.
- Mermaid renders in current Cursor chat. If the user says it renders as raw text on their version, generate a self-contained HTML file (mermaid via CDN) and `open` it — only on request.
- No emojis. Factual tone.

## Budget guardrails

- Obvious or narrow target → read the files directly; dispatch nothing.
- Large or unfamiliar repo → at most ONE Explore agent ("thorough") for orientation, then read the ≤10 files that matter yourself. Never dispatch a fleet to answer a question.
- Trace wider than ~40 files → stop expanding; explain the core path and tabulate the peripheral entry points.
- If several minutes of exploration pass without the map taking shape, report what is known so far and name the gap — a partial map beats a silent sinkhole.
