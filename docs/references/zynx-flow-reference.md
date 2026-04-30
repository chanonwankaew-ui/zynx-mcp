# zynx-flow Reference Status

`/Users/kant/zynx-flow` is now treated as an archived reference for early node/edge workflow-builder experiments.

The canonical implementation for Zynx workflow planning, MCP routing, agent registry, execution reports, and governance automation is:

```text
/Users/kant/zynx-mcp
```

## What Was Absorbed

- Sequential `nodes` and `edges` workflow model.
- Planner UI flow preview.
- Local executor concept that walks a workflow in order.

## What Should Stay In zynx-flow

- Historical UI/engine experiments.
- Reference code for React Flow style interaction.
- Comparison material only.

## Do Not Add New Production Work There

New workflow features should land in `zynx-mcp`:

- Agent registry: `src/agentRegistry.ts`
- Planner UI: `apps/workflow-mapper/`
- Workflow artifacts: `workflows/*.json`
- Executor: `scripts/run-workflow.ts`
- Run reports: `reports/workflow-runs/`
