---
name: ko-new-command
description: Create a new custom /ko-* command from a plain-English description. No technical knowledge needed — just describe what you want the AI to do.
args: "[command name]"
---

# Create a New Command

> Describe what you want the AI to do, and this command will create a reusable `/ko-*` command for it.

No technical setup required — this works entirely within Cursor.

## Step 1: Gather Requirements

Ask the user:

1. **What should the command be called?** (e.g. "generate-release-notes", "summarise-pr", "explain-flow")
   - Will be prefixed with `ko-` automatically
   - Use kebab-case (lowercase with dashes)

2. **What should it do?** Ask them to describe in plain English:
   - "When I run this command, I want it to..."
   - "It should look at... and then produce..."

3. **What inputs does it need?** (optional)
   - Does the user provide a name, topic, file path, or nothing?
   - Example: "I'll give it a feature name and it should find related code"

4. **What should the output be?**
   - A file? (where should it be saved?)
   - A summary in chat?
   - Code changes?

5. **Any special instructions?**
   - "Always check X before doing Y"
   - "Never change files in Z folder"
   - "Ask me to confirm before making changes"

## Step 2: Write the Command

Create the file at `.cursor/commands/ko-<name>.md` with:

```markdown
---
name: ko-<name>
description: <one-line description of what it does>
args: "<inputs if any>"
skills: [<skills the command depends on>]        # optional
agents: [<agents it delegates to>]               # optional
rules: [<rules it must follow>]                  # optional
skills-optional: [<nice-to-have skills>]         # optional
---

# <Title>

<Clear step-by-step instructions for the AI, written from the user's description>
```

Dependency keys may **only reference things that actually exist** in `.cursor/skills/`, `.cursor/agents/`, `.cursor/rules/` — check before writing them; omit the keys entirely when there are no dependencies.

**Writing guidelines:**
- Write instructions as if talking to a capable assistant — clear, specific, step-by-step
- Use numbered steps for the main workflow
- Include what to check/read before acting
- Include what to output/report at the end
- If the user wants confirmation before changes, add an explicit "ask before proceeding" step
- Keep it simple — avoid jargon unless the command is for technical work

**Patterns worth copying** (use whichever fit what the command does):
- **Tool preflight** — if the command needs an external tool (an MCP, `gh`, a running server), probe it with a real call before Step 1; on failure, offer a fallback (e.g. "ask for a paste") instead of guessing.
- **Stop-and-wait gates** — before creating files or making changes, show the plan and wait for a yes.
- **Evidence or UNVERIFIED** — claims come from real command output or read files; anything unverifiable is marked `UNVERIFIED`, never guessed.
- **Reuse-first** — search for existing code/helpers/docs to reuse or extend before creating new ones.
- **Handoff** — end by naming the natural next command, if one exists.

## Step 3: Confirm

Show the user:
- The command name: `/ko-<name>`
- What it will do (in their words)
- Where it's saved: `.cursor/commands/ko-<name>.md`

Tell them: "You can now use `/ko-<name>` in any Cursor chat. To edit it later, just open `.cursor/commands/ko-<name>.md` and change the instructions."

## Examples

**User says:** "I want a command that looks at my current branch and writes release notes based on the commits"

**Creates:** `.cursor/commands/ko-changelog.md`
```markdown
---
name: ko-changelog
description: Generate release notes from commits on the current branch
---

# Release Notes

1. Resolve the base branch (`origin/main`, else `origin/master`), then run `git log <base>..HEAD --oneline` to get all commits on this branch
2. Group commits by type (features, fixes, chores)
3. Write a summary in markdown with:
   - A heading with the date
   - A "Features" section listing new functionality
   - A "Fixes" section listing bug fixes
   - A "Other" section for everything else
4. Show me the draft and wait for my confirmation before saving
5. Save to `docs/release-notes/<date>.md`
```

---

**User says:** "I want a command where I give it a Jira ticket number and it finds all related code"

**Creates:** `.cursor/commands/ko-find-ticket.md`
```markdown
---
name: ko-find-ticket
description: Find all code related to a Jira ticket
args: "<ticket-number>"
---

# Find Code for Ticket

1. Fetch the ticket via the Atlassian MCP to get its summary and keywords; if the fetch fails or the MCP isn't set up, ask me to paste the ticket text — don't guess what it's about
2. Search the codebase for references to `<ticket-number>` (in comments, commit messages, branch names)
3. Search for the keywords from the ticket summary
4. List all files that reference this ticket, grouped by:
   - Direct mentions in code comments
   - Git commits mentioning the ticket
   - Branch names containing the ticket
5. For each file, show a one-line summary of what it does
```
