# Zynx MCP Codex Instructions

Project root: `/Users/kant/zynx-mcp`

## Project Context

This repo is the production-oriented Zynx MCP workspace.

Main surfaces:
- `src/`: TypeScript MCP wrapper and local Zynx agent backend
- `apps/workflow-mapper/`: Vite React workflow mapper
- `apps/blueprint-explorer/`: macOS Swift blueprint explorer
- `docs/`: runbooks, reports, references, and examples
- `ops/launchd/`: macOS launchd configs
- `scripts/`: operational scripts

Do not reorganize files outside `/Users/kant/zynx-mcp` unless explicitly requested.

Do not touch `/Users/kant/zynx-monorepo/ZynxAGI-Project` unless explicitly requested; it has an existing dirty worktree and deleted files.

## Core Commands

Root MCP server:

```bash
npm run build
npm audit --audit-level=moderate
npm run dev:backend
npm run dev:http
npm run dev:stdio
```

Workflow mapper:

```bash
npm run workflow:run
npm run workflow:run -- --execute
npm --prefix apps/workflow-mapper run build
npm --prefix apps/workflow-mapper audit --audit-level=moderate
npm --prefix apps/workflow-mapper run dev
```

Blueprint explorer:

```bash
scripts/build-blueprint-explorer.sh run
scripts/build-blueprint-explorer.sh --verify
```

Governance automation:

```bash
npm run governance:validate
npm run governance:run
```

## Required Verification

After editing `src/`, run:

```bash
npm run build
npm audit --audit-level=moderate
```

After editing `apps/workflow-mapper/`, run:

```bash
npm --prefix apps/workflow-mapper run build
npm --prefix apps/workflow-mapper audit --audit-level=moderate
```

After editing workflow execution logic or `workflows/*.json`, run:

```bash
npm run workflow:run
```

If backend routing changed, also start the backend and execute the mapped workflow:

```bash
npm run dev:backend
npm run workflow:run -- --execute
```

After changing dependencies, inspect both lockfiles and run the relevant build.

After editing `ops/governance/`, `docs/governance/`, or `workflows/nightly-governance-validation.json`, run:

```bash
npm run governance:validate
```

## Security Rules

Never print or commit `.env` values.

Use `.env.example` for documentation.

Keep these out of git:
- `.env`
- `node_modules/`
- `dist/`
- `.build/`
- `.DS_Store`
- local SDK bundles
- generated `.app` bundles

If a live-looking token, API key, or credential appears in source/docs, flag it and replace it with a placeholder.

## Coding Rules

Prefer small, production-safe changes.

Preserve existing MCP tool names unless explicitly asked to rename them:
- `invoke_agent`
- `get_agent_health`
- `list_agents`

Keep Planner agent IDs aligned with `src/agentRegistry.ts`; executor route mapping depends on that registry.

Keep Deeja/Zynx terminology intact, including Thai product language.

Use `rg` for search.

Do not make broad refactors unless needed for the requested task.

Do not commit changes unless the user explicitly asks.

## Production Expectations

Favor:
- clear folder boundaries
- explicit environment config
- buildable apps
- executable workflow artifacts with dry-run reports before side effects
- security audit passing
- README/runbook updates when behavior changes
- minimal generated files in source control
