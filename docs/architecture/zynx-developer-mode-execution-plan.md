# Zynx Developer Mode Execution Plan

Date: 2026-04-30
Status: In Progress
Scope: `/Users/kant/zynx-mcp`

This document converts the Zynx ecosystem conversation into an execution plan for the current production-oriented `zynx-mcp` workspace. It is intentionally stricter than the concept thread: only implemented repo capabilities are marked `Done`; product, SaaS, marketplace, and autonomous-agent ideas remain `Planned` until code exists.

## Current Source Of Truth

- Production workspace: `/Users/kant/zynx-mcp`
- Agent registry and backend route map: `src/agentRegistry.ts`
- Local backend router: `src/backend.ts`
- MCP wrapper: `src/mcpServer.ts`, `src/http.ts`, `src/stdio.ts`
- Workflow executor: `scripts/run-workflow.ts`
- Planner-exported workflows: `workflows/*.json`
- Run reports: `reports/workflow-runs/*.json`

Do not create a separate `zynx-core` prototype unless the goal is explicitly experimental. The current repo already contains the right control surface for the next implementation slice.

## Reality Check

| Capability | Current state | Evidence | Next action |
|---|---|---|---|
| MCP wrapper | Done | `invoke_agent`, `get_agent_health`, `list_agents` in `src/mcpServer.ts` | Preserve tool names. |
| Agent registry | Done | `AGENT_REGISTRY` in `src/agentRegistry.ts` | Keep IDs aligned with workflow JSON. |
| Backend route map | Done | `POST /agents/:agentId/invoke` in `src/backend.ts` | Replace stub execution with agent-specific handlers. |
| Workflow dry-run executor | Done | `scripts/run-workflow.ts` writes run reports | Use for every workflow artifact before execute mode. |
| Agentic Workflow Planner UI | In Progress | `apps/workflow-mapper/` | Keep export shape compatible with executor. |
| Deeja persona | Done for local deterministic handling | `src/agentHandlers.ts` formats user-facing Deeja response cards behind `/agents/deeja/invoke` | Add provider-backed emotion/persona behavior later. |
| Planner agent behavior | Done for local deterministic handling | `src/agentHandlers.ts` generates registry-backed workflow plans behind `/agents/task-planner/invoke` | Share typed workflow schema with Planner UI. |
| Guardian / Verifier | In Progress | `validator` and `reviewer` now have explicit local handlers, but not full Guardian/Verifier provider-backed semantics | Add explicit safety and verification contracts. |
| Marketplace | Planned | Agent registry exists, but no install, validation, billing, or remote agent lifecycle | Treat registry as internal catalog first. |
| SaaS billing/user auth | Planned | Header-based tenant/user context only | Do not claim SaaS until auth, DB, and billing are implemented. |
| Autonomous agents/background queue/tools | Planned | Scheduler and tool-like agents are registered only | Add queue/runtime only after backend handlers exist. |

## Target Layer Map

```text
Zynx Ecosystem
-> Zynx MCP production workspace
-> Agent Registry and Backend Router
-> Agentic Workflow Planner exports
-> workflow_run / run report artifacts
-> Agent-specific handlers
-> Memory, safety, verification, monitoring
-> Product UI, SaaS, marketplace, billing
```

The current repo is strongest in the middle layers: registry, routes, workflow JSON, and reports. The next engineering work should fill real agent behavior before adding SaaS or marketplace surfaces.

## Phase 1: Make Agent Behavior Real

Status: In Progress

Goal: Replace the generic backend stub with small, explicit handlers for the highest-value agents.

Implementation slices:

1. Done: Add a backend dispatcher module that maps `agentId` to handler functions.
2. Done: Implement `task-planner` as a deterministic planner that returns workflow steps using known registry agents.
3. Done: Implement `deeja` as the user-facing persona formatter that receives orchestration output and returns actionable cards or concise Thai/English responses.
4. Done: Implement `validator` as a workflow schema and route-map validator.
5. Done: Implement `reviewer` as a non-destructive QA gate over run reports.

Suggested files:

- `src/agentHandlers.ts`
- `src/workflowSchema.ts`
- tests or example fixtures under `docs/examples/` until a test framework is added

Verification:

```bash
npm run build
npm run workflow:run workflows/zynx-developer-mode-build.json
```

## Phase 2: Add Durable Workflow Contracts

Status: Planned

Goal: Make `workflow_run.json` and executor reports a stable contract across Planner, CodeD, Verifier, and Monitor.

Implementation slices:

1. Define a typed workflow schema shared by UI export and executor.
2. Add validation before report generation.
3. Add explicit `contextPassing`, `executedBy`, and `decisionLog` fields.
4. Add failure classifications: `BlockedByAuth`, `BlockedByProvider`, `BlockedByRoute`, `FailedValidation`, `FailedExecution`.

Verification:

```bash
npm run build
npm run workflow:run
npm run governance:validate
```

## Phase 3: Add Real Runtime Services

Status: Planned

Goal: Move from dry-run and stub routes to controlled execution without overclaiming provider success.

Implementation slices:

1. Add provider adapters behind environment-gated config.
2. Add memory adapter with local JSON first, then a vector store later.
3. Add queue/job state only after handlers are deterministic and auditable.
4. Add `Monitor` report output before any scheduled side-effect execution.

Security:

- Never print `.env` values.
- Keep provider auth failures separate from code/build success.
- Keep destructive tools behind explicit allowlists and audit logs.

## Phase 4: Product And Launch

Status: Planned

Goal: Turn the execution stack into a product only after the core workflow loop is real.

Order:

1. Internal operator dashboard over run reports.
2. Deeja user chat surface over backend routes.
3. User/auth boundary.
4. Usage tracking.
5. Billing.
6. Marketplace validation and install flow.

Do not lead with SaaS or Stripe before real agent execution exists; billing a stub would create the wrong product signal.

## Developer-Mode Rule

When turning Zynx concepts into repo work, use this decision rule:

```text
If the concept cannot be mapped to a current file, route, workflow artifact, or run report, write it as Planned.
If it can be dry-run through scripts/run-workflow.ts, write it as In Progress.
If it has code plus verification output, write it as Done.
```
