<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `yarn nx build`, `yarn nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

<!-- CLAUDE_ALIGNMENT_GATE_GLOBAL_POLICY_V1 -->

# Global Clarify-Before-Change Policy

For every software task that may modify a project, you MUST activate and follow the
`alignment-gate` skill before making any project-state change.

This applies to implementation, fixes, refactors, configuration, dependencies, generated code,
file operations, commands with write effects, Git changes, and visual/UI modifications.

Required sequence:

1. Inspect relevant code and project instructions using read-only actions.
2. Identify material ambiguity, risks, affected areas, and contradictions.
3. Ask targeted questions until the task is implementation-ready.
4. Produce an Understanding Contract.
5. Calculate alignment confidence using the skill's confidence model.
6. Reach at least 95% confidence without fabricating the score.
7. Obtain explicit user approval of the contract.
8. Only then modify project state.
9. Stop and re-align if a material new uncertainty appears.

Do not interpret urgency, silence, partial answers, or enthusiasm as approval.
Do not ask questions already answered by the conversation or code.
Prefer correctness and alignment over speed.
