# Zynx Positioning And Pitch Deck

Date: 2026-04-30
Status: Draft
Audience: early users, technical collaborators, and investors

## Positioning

Primary:

> Zynx turns goals into completed AI workflows.

User-facing:

> Give Zynx a goal. Zynx plans the work, routes it to agents, and returns a reviewable result.

Technical:

> Zynx is an MCP-native agent workflow platform with registry-based routing, workflow artifacts, and auditable run reports.

Investor-facing:

> Zynx is building the operating layer for AI workers, starting with agent workflow planning and execution.

Avoid in early public positioning:

- "AGI is complete"
- "AI replaces every employee"
- "fully autonomous company"
- "marketplace and billing are live" until implemented

Use instead:

- agent workflow execution
- auditable AI work
- goal-to-workflow automation
- MCP-native agent orchestration
- human-reviewable run reports

## One-Liner

Zynx helps builders and operators turn goals into executable AI workflows, with agents, routing, and reports built around MCP.

## Slide 1: Cover

Title:

Zynx

Subtitle:

Goal-to-workflow automation for AI agents

Speaker script:

"Zynx is an MCP-native platform for turning a user goal into an agent workflow that can be planned, routed, executed, and reviewed."

## Slide 2: Problem

Most AI tools answer questions, but the user still has to do the work:

- Break the goal into steps
- Choose tools and agents
- Track execution
- Verify output quality
- Repeat the same setup later

Speaker script:

"The gap is not intelligence alone. The gap is execution structure. People need AI work that can be planned, routed, repeated, and audited."

## Slide 3: Solution

Zynx turns a goal into an agent workflow:

```text
Goal
-> Planner workflow
-> Agent registry routing
-> Backend execution
-> Run report
-> Human review
```

Speaker script:

"Zynx starts with workflow execution, not generic chat. Every run has mapped agents, routes, state, and a report."

## Slide 4: Product Today

Current production workspace:

- MCP wrapper tools: `invoke_agent`, `get_agent_health`, `list_agents`
- Local agent backend: `/agents/:agentId/invoke`
- Agent registry: 36 published agents
- Workflow executor: dry-run and execute modes
- Run reports: JSON artifacts under `reports/workflow-runs/`
- Agentic Workflow Planner app in progress

Speaker script:

"The current product foundation is already repo-backed: MCP tools, a backend router, registry, workflow exports, and reports. The next step is replacing generic stubs with real agent handlers."

## Slide 5: Why Now

- MCP is becoming a practical interface for tool and agent connectivity.
- LLMs are strong enough to plan and execute bounded tasks.
- Teams need auditability before they trust autonomous workflows.
- Agent ecosystems need registries, validation, and runtime contracts.

Speaker script:

"The timing is right because the model layer exists, but the operating layer for reliable AI work is still early."

## Slide 6: Architecture

```text
Deeja UI / Operator
-> MCP Wrapper
-> Agent Backend Router
-> Agent Registry
-> Workflow Executor
-> Reports / Governance
```

Future layers:

- Deeja persona handler
- Planner agent behavior
- Guardian safety gate
- Verifier QA gate
- Monitor and Learning agent
- Marketplace validation

Speaker script:

"Zynx separates persona, orchestration, execution, verification, and reporting. That separation matters because it keeps the system inspectable."

## Slide 7: Initial Customer

Beachhead users:

- startup founders
- indie hackers
- technical operators
- automation-heavy internal teams

They need:

- repeatable AI workflows
- fewer manual handoffs
- evidence of what ran
- a path from prototype to automation

Speaker script:

"The first users are people who already try to automate work with AI, but need structure and repeatability."

## Slide 8: Business Model

Planned, not yet implemented:

- Free tier for local workflow planning
- Pro tier for hosted execution and reports
- Team tier for shared agent workspaces and governance
- Marketplace take rate after external agent validation exists

Speaker script:

"The monetization path is straightforward, but the engineering priority is trust first: real execution, validation, reports, then billing."

## Slide 9: Roadmap

Phase 1:

- real handlers for Deeja, Planner, Validator, Reviewer
- typed workflow schema
- stronger dry-run reports

Phase 2:

- provider adapters
- memory adapter
- execution bridge hardening
- monitor output

Phase 3:

- product UI
- auth and usage
- billing
- marketplace validation

Speaker script:

"The roadmap is intentionally sequenced. We are not jumping to marketplace before the core agent execution loop is reliable."

## Slide 10: Vision

Zynx starts as an agent workflow planner and executor.

The long-term vision is an operating layer for AI workers:

- agents are discoverable
- workflows are auditable
- execution is governed
- outputs are verified
- humans stay in control of approval gates

Speaker script:

"The vision is not a black-box AGI claim. The vision is a reliable operating layer for AI work."

## Demo Script

1. Open the Agentic Workflow Planner.
2. Build or load a workflow with registry-backed agents.
3. Export the workflow JSON.
4. Run:

```bash
npm run workflow:run workflows/zynx-developer-mode-build.json
```

5. Open the generated report in `reports/workflow-runs/`.
6. Show how each step maps to an agent ID, MCP tool, backend route, and state.
7. Explain the next milestone: replace backend stubs with real handlers.

## Public Launch Copy

Short:

> Zynx turns goals into executable AI workflows with agents, routing, and audit-ready reports.

Long:

> Zynx is an MCP-native agent workflow platform. Instead of stopping at chat, Zynx maps goals into planned agent workflows, routes each step through a registry-backed backend, and writes reviewable run reports for operators.

Call to action:

> Try the workflow planner and inspect the run report.

