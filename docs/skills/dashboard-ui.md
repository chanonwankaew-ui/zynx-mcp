---
name: dashboard-agent
description: Master dashboard renderer for the Zynx AGI platform. Use this skill to render, update, or generate the Zynx AGI master dashboard — including asset summaries, agent status, LLM routing configs, workflow states, roadmap tasks, and KPI panels. Triggers when user asks to "show dashboard", "update the dashboard", "render metrics", "display agent status", or "open the master view". Also use when consolidating multi-source data into a unified visual overview.
---

# Dashboard Agent

Renders and manages the Zynx AGI Master Dashboard — a six-tab interactive view consolidating all platform assets, agent states, and operational metrics.

## Dashboard Tabs

| Tab | Content | Data Source |
|---|---|---|
| `agents` | Agent registry, status, last run | Memory Manager |
| `llm-routing` | Model assignments, cost, usage | LLM Router |
| `workflows` | Active/paused/failed workflows | Workflow Mapper |
| `roadmap` | Tasks, milestones, blockers | DB Agent |
| `assets` | IP ledger, blueprints (1,100+ items) | DB Agent |
| `issues` | Open bugs, incidents | Logger |

## Input Contract

```typescript
import { z } from 'zod';

export const DashboardRequestSchema = z.object({
  tab: z.enum(['agents', 'llm-routing', 'workflows', 'roadmap', 'assets', 'issues', 'all']).default('all'),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  filters: z.object({
    status: z.array(z.string()).optional(),
    dateRange: z.object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    }).optional(),
    search: z.string().optional(),
  }).default({}),
  renderTarget: z.enum(['json', 'html', 'pdf']).default('json'),
});
```

## Output Contract

```typescript
export const DashboardOutputSchema = z.object({
  dashboardId: z.string().uuid(),
  generatedAt: z.string().datetime(),
  tabs: z.record(z.object({
    data: z.unknown(),
    summary: z.object({
      total: z.number(),
      active: z.number(),
      errors: z.number(),
    }),
    lastRefreshed: z.string().datetime(),
  })),
  renderUrl: z.string().url().optional(),
  error: z.string().optional(),
});
```

## Rendering Pipeline

```typescript
async function renderDashboard(req: DashboardRequest): Promise<DashboardOutput> {
  const tabs = await Promise.all(
    DASHBOARD_TABS
      .filter(t => req.tab === 'all' || t.id === req.tab)
      .map(t => fetchTabData(t, req))
  );
  if (req.renderTarget === 'html') return generateHTML(tabs);
  if (req.renderTarget === 'pdf') return reportGenerator.render(tabs);
  return { dashboardId: uuid(), tabs: Object.fromEntries(tabs.map(t => [t.id, t])) };
}
```

## Refresh Strategy
- Agent status: real-time (WebSocket)
- LLM costs: every 5 minutes
- Roadmap/assets: on-demand
- Issues: every 60 seconds

## Error Handling
- Missing tab data → render with `error` field, do not fail entire dashboard
- Stale data (>10min) → show staleness indicator in UI
