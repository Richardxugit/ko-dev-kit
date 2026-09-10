---
name: ko-implement
description: Continue implementing an existing plan/spec from a previous session
---

# Implement: Continue an Existing Plan

Pick up where a previous session left off by finding and executing an unfinished plan. Works on a freshly approved plan from `/ko-feature` or a plan resumed across sessions.

## Steps

1. **Scan for plans/specs** in `.cursor/specs/`. List all `.md` files that contain unchecked items (`- [ ]`) or a non-`DONE` status. Also glob `.cursor/specs/*/stories.md` (only when the `unit-of-work` skill is installed — shipped by ko-product-kit) and list units with `in-progress` or `todo` stories — an `in-progress` story is the strongest signal of where the previous session stopped.

2. **If none found**, tell the user: "No unfinished plans found. Run /ko-feature to start a new one."

3. **If one found**, show its name and the remaining unchecked tasks. Ask the user to confirm before proceeding.

4. **If multiple found**, list them with their remaining task counts and ask the user to pick one.

5. **Read the full spec/plan** — both the design spec and the implementation plan live in the `.cursor/specs/<slug>.md` file (or a matching pair).

6. **Assess current state** — checkboxes may not have been updated by the previous session, so verify against the actual codebase:
   - For each task, check if the files it creates/modifies already exist with the expected changes
   - Run `git log --oneline -20` (if the repo has history) to see recent commits that may correspond to completed tasks
   - Grep for key symbols, functions, or types that each task introduces
   - Mark a task as already done if the code on disk matches what the task describes, regardless of checkbox state
   - Check for uncommitted changes or in-progress work from the previous session

7. **Report findings** before executing — show the user which tasks appear complete vs remaining:
   ```
   Task 1: Add types ✅ (verified: WishlistInput exists in wishlist.input.ts)
   Task 2: Add resolver ✅ (verified: WishlistResolver in wishlist.resolver.ts)
   Task 3: Add page component ❌ (not found: WishlistPage missing)
   ...
   ```
   Ask the user to confirm before proceeding.

8. **Update checkboxes** — mark verified-complete tasks as `- [x]` in the spec file before starting execution.

9. **Run the environment preflight.** Activate the `env-preflight` skill if available: verify node vs `engines`/`.nvmrc`, package manager, test runner, type check, and build all execute, and write the working recipe to `.cursor/env-recipe.md` (skip if a current recipe already exists). Report any unfixable toolchain failure to the user now, before execution starts. *(If the skill is not installed, do a quick manual check that install/build/test run.)*

10. **Ask the user how to execute the remaining tasks.** Do not pick for them. Present the two options:

   > How should I execute the remaining tasks?
   > 1. **subagent-driven** (`superpowers:subagent-driven-development`) — each task runs in its own sub-agent. Faster, keeps main context clean, best when tasks are independent. Harder to course-correct mid-flight.
   > 2. **inline** (`superpowers:executing-plans`) — tasks run in this session with review checkpoints. Slower and consumes context, but easier to interrupt and redirect.

   Wait for the user's choice before invoking either skill. Start from the first genuinely incomplete task. *(Fallback without superpowers: execute steps sequentially yourself with manual checkpoints.)*

   **If subagent-driven:** prepend the contents of `.cursor/env-recipe.md` to every sub-agent prompt — sub-agents do not share your shell state and will otherwise rediscover (or miss) the node-version/package-manager recipe on their own. Also give each sub-agent its target files, the relevant `.cursor/rules/` + skills, and clear file boundaries.

   Invoke **`superpowers:test-driven-development`** — write failing tests before implementation code for each step.

## After All Tasks Complete

When all tasks in the plan are done, do not stop. Tell the user: "All tasks complete. Running `/ko-verify` to check quality gates." Then invoke `/ko-verify` to run build, lint, and tests, then `/ko-review` on the complete diff. Update the spec status to `DONE`. If the plan belongs to a unit of work, mark the completed story `done` in `stories.md` and append a bolt-log row per the `unit-of-work` protocol (ko-product-kit repos).

The user should not have to manually invoke `/ko-verify` — it is the automatic final step of implementation.

## Important

- Do NOT re-implement already-completed tasks unless the code is missing or broken
- Do NOT trust checkboxes alone — always verify against the codebase
- If the plan references a worktree branch, check if it still exists and switch to it
- If the previous session left broken or partial code, fix it before continuing with the next task
- The spec is a **living document** — update task status and note deviations as you go
