# ko-feature reference: input fetching (Step 0)

Loaded by `/ko-feature` Step 0 when the user shares anchoring artifacts. **The fetch itself is the
tool probe** — it confirms the MCP is wired before you depend on it.

- **Jira/Confluence** → fetch via the Atlassian MCP; pull the summary, description, acceptance
  criteria, and any linked designs from a ticket.
- **Figma** → fetch via the Figma MCP when configured.
- **Fetch fails or the MCP isn't set up** → say which tool is missing and ask the user to paste
  the content instead (degraded intake, not a hard stop).

**Load-bearing rule:** never proceed on a guessed summary of an unfetched link.
