# Supabase CSV Import Starter

This starter dataset is based on the current Zynx backend registry, workflow JSON files, and workflow run reports.

## Files

Import in this order:

1. `data/supabase/zynx_agents.csv`
2. `data/supabase/zynx_workflows.csv`
3. `data/supabase/zynx_workflow_steps.csv`
4. `data/supabase/zynx_workflow_edges.csv`
5. `data/supabase/zynx_workflow_runs.csv`
6. `data/supabase/zynx_agent_invocations.csv`
7. `data/supabase/zynx_audit_events.csv`

## Recommended Setup

Run `supabase-schema.sql` in the Supabase SQL Editor first, then import each CSV into the matching table.

Supabase changed Data API exposure behavior in April 2026. New tables may not be exposed through the REST Data API automatically. If the backend must read these tables through `/rest/v1`, check the project's Data API settings and grant only the roles you actually need.

## Security Notes

RLS is enabled in `supabase-schema.sql`, but no public read/write policies are created. Add policies only after deciding the access model.

For a backend-only service, prefer using a server-side key in backend environment variables. Never put a service role key in frontend code or in CSV files.

## Table Purpose

- `zynx_agents`: Registry mirror from `src/agentRegistry.ts`.
- `zynx_workflows`: Workflow definitions from `workflows/*.json`.
- `zynx_workflow_steps`: Ordered workflow agent steps.
- `zynx_workflow_edges`: Agent-to-agent flow edges.
- `zynx_workflow_runs`: Existing run report summaries from `reports/workflow-runs/*.json`.
- `zynx_agent_invocations`: Runtime invocation log shape matching `POST /agents/:agentId/invoke`.
- `zynx_audit_events`: Backend audit event shape matching `auditLog(...)`.

## Minimal Import Check

After import, run:

```sql
select count(*) as agent_count from public.zynx_agents;
select id, name, status from public.zynx_workflows order by id;
select workflow_id, step_number, agent_id from public.zynx_workflow_steps order by workflow_id, step_number;
```
