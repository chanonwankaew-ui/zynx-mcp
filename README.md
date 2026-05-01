# Zynx MCP

Production-oriented workspace for the Zynx MCP wrapper, local agent backend, Agentic Workflow Planner, and blueprint explorer tooling.

`/Users/kant/zynx-mcp` is the canonical repository for Zynx workflow/MCP work. Older workflow experiments such as `/Users/kant/zynx-flow` are reference-only unless a feature is intentionally migrated into this repo.

# Repository Status

* Status: ACTIVE
* Type: agent-system
* Group: zynx-core
* Owner: Chanont Wankaew
* Canonical Repo: zynx-mcp
* Related Repos: ZynxAGI-Project; zynx-flow
* Purpose: Master governance index and MCP workflow execution workspace
* Notes: Canonical workspace for Planner UI, MCP backend routing, workflow execution, reports, and nightly governance records

## Structure

```text
.
├── apps/
│   ├── blueprint-explorer/     # macOS Swift package and local .NET MCP sample
│   └── workflow-mapper/        # Vite React Agentic Workflow Planner
├── docs/
│   ├── examples/               # Reference code snippets and draft contracts
│   ├── governance/             # Nightly governance checklist and report template
│   ├── references/             # Operator reference notes
│   ├── reports/                # Historical reports
│   └── runbooks/               # Operational procedures
├── ops/
│   ├── governance/             # Governance runbooks and policy config
│   └── launchd/                # macOS launchd plists
├── reports/
│   ├── governance/             # Generated governance reports
│   └── workflow-runs/          # Generated workflow executor dry-run reports
├── scripts/                    # Build/run automation
├── workflows/                  # Workflow Planner / executor blueprints
└── src/                        # TypeScript MCP wrapper and local backend
```

## MCP Tools

| MCP tool | Backend route |
|---|---|
| `invoke_agent` | `POST /agents/:agentId/invoke` |
| `get_agent_health` | `GET /agents/:agentId/health` |
| `list_agents` | `GET /agents` |

## Run Locally

```bash
npm install
cp .env.example .env
npm run dev:backend
npm run dev:http
```

Default local URLs:

```text
MCP wrapper: http://localhost:3000/mcp
Agent backend: http://localhost:8787
```

## Common Commands

```bash
npm run build
npm run start:http
npm run start:backend
npm run workflow:dev
npm run workflow:run
npm run blueprint:run
npm run governance:validate
npm run governance:run
```

## Environment

```text
MCP_PORT=3000
MCP_PATH=/mcp
ZYNX_BACKEND_PORT=8787
ZYNX_API_BASE_URL=http://localhost:8787
ZYNX_SERVICE_TOKEN=
ZYNX_DEFAULT_TENANT_ID=dev
ZYNX_DEFAULT_USER_ID=chatgpt-mcp
```

## Backend Contract

The Zynx backend router should provide:

```text
POST /agents/:agentId/invoke
GET  /agents/:agentId/health
GET  /agents
```

The `invoke_agent` MCP tool forwards this payload shape:

```json
{
  "input": {},
  "sessionId": "optional-uuid",
  "streaming": false,
  "options": {
    "timeoutMs": 30000,
    "maxTokens": 2048
  }
}
```

Specialized local handlers currently exist for:

```text
task-planner
deeja
validator
reviewer
```

Other registered agents use a deterministic fallback handler until a specialized implementation is added.

## Production Notes

- Keep `.env` local and rotate any token that was ever committed or shared.
- Deploy the MCP wrapper behind HTTPS before connecting it to ChatGPT Custom MCP.
- Keep tenant and RBAC enforcement in the backend router.
- Keep write or side-effect tools behind auth and audit logs.

## Governance Automation

Nightly repository governance artifacts live in:

```text
ops/governance/governance-runbook.yaml
docs/governance/nightly-validation-checklist.md
docs/governance/nightly-report-template.md
workflows/nightly-governance-validation.json
```

Validate the governance module with:

```bash
npm run governance:validate
```

Generate the first-pass non-destructive daily report with:

```bash
npm run governance:run
```

## Workflow Executor

Planner exports in `workflows/*.json` can be dry-run through the local executor:

```bash
npm run workflow:run
```

The default workflow is `workflows/nightly-governance-validation.json`. Dry-run output verifies `agentId -> MCP tool -> backend route` mapping without invoking backend agents.

To invoke the mapped backend routes for real, start the local backend first:

```bash
npm run dev:backend
npm run workflow:run -- --execute
```

To run another exported workflow:

```bash
npm run workflow:run -- workflows/my-workflow.json
```

To execute another exported workflow:

```bash
npm run workflow:run -- workflows/my-workflow.json --execute
```

Executor output is written to:

```text
reports/workflow-runs/
```

The executor reads Planner `flow.nodes` and `flow.edges` when present. For older workflow files, it falls back to generating a sequential flow from `workflow.agents`. It then passes context sequentially and writes a human-reviewable run report. In dry-run mode it only validates routes. In execute mode it calls `POST /agents/:agentId/invoke` for each mapped agent.

Agent route mappings are defined in:

```text
src/agentRegistry.ts
```

Agent definitions in `src/agentRegistry.ts` are the source of truth for both backend routing and the Planner UI catalog. The UI should not maintain a separate agent list.

The shared workflow contract is defined in:

```text
src/workflowSchema.ts
```

Planner exports, `scripts/run-workflow.ts`, and the `validator` backend handler should all use this schema instead of maintaining separate workflow shapes.

## zynx-flow Status

`/Users/kant/zynx-flow` is archived as a reference for the earlier node/edge workflow-builder experiment. The useful concept has been absorbed here as Planner `flow.nodes` / `flow.edges` plus `scripts/run-workflow.ts`.

Reference note:

```text
docs/references/zynx-flow-reference.md
```

## Developer Mode Artifacts

The developer-mode execution plan and launch-safe positioning artifacts live in:

```text
docs/architecture/zynx-developer-mode-execution-plan.md
docs/product/zynx-positioning-pitch-deck.md
workflows/zynx-developer-mode-build.json
```

Dry-run the developer-mode workflow with:

```bash
npm run workflow:run workflows/zynx-developer-mode-build.json
```
