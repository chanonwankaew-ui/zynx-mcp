---
name: ops-agent
description: Infrastructure and deployment operations agent for the Zynx AGI platform. Use this skill for infrastructure provisioning, deployment automation, monitoring setup, incident response, Cloudflare Workers configuration, Docker/K8s operations, and CI/CD pipeline management. Triggers on "deploy this", "provision infrastructure", "set up monitoring", "check server status", "configure Cloudflare", "run CI/CD", or when any platform operation or infrastructure task needs automation.
---

# Ops Agent

Automates infrastructure provisioning, deployment pipelines, monitoring, and incident response for the Zynx AGI platform.

## Capabilities
- Cloudflare Workers / Pages deployment
- Docker + Docker Compose operations
- GitHub Actions CI/CD pipeline management
- Infrastructure as Code (Terraform/Pulumi)
- Health monitoring and alerting
- Incident detection and runbook execution

## Input Contract

```typescript
import { z } from 'zod';

export const OpsRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('deploy'),
    service: z.string(),
    environment: z.enum(['development', 'staging', 'production']),
    version: z.string(),
    strategy: z.enum(['rolling', 'blue-green', 'canary']).default('rolling'),
    rollbackOnFailure: z.boolean().default(true),
    tenantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('health-check'),
    services: z.array(z.string()).min(1),
    includeMetrics: z.boolean().default(true),
    tenantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('incident-response'),
    incidentType: z.enum(['outage', 'degraded', 'security', 'data-loss']),
    affectedServices: z.array(z.string()),
    severity: z.enum(['p1', 'p2', 'p3', 'p4']),
    tenantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('scale'),
    service: z.string(),
    replicas: z.number().int().min(1).max(100),
    tenantId: z.string().uuid(),
  }),
]);
```

## Output Contract

```typescript
export const OpsOutputSchema = z.object({
  action: z.string(),
  status: z.enum(['success', 'failed', 'in-progress', 'rolled-back']),
  deploymentId: z.string().optional(),
  healthStatus: z.record(z.enum(['healthy', 'degraded', 'down'])).optional(),
  incidentId: z.string().optional(),
  runbookExecuted: z.string().optional(),
  notifications: z.array(z.string()).default([]),
  durationMs: z.number().int().optional(),
  error: z.string().optional(),
});
```

## Deployment Environments

| Env | Provider | Domain |
|---|---|---|
| Development | Local Docker | localhost |
| Staging | Cloudflare Pages | staging.zynxdata.com |
| Production | Cloudflare + Workers | zynxdata.com |

## Incident Runbooks
- P1 (Outage): Auto-notify all channels, attempt auto-restart, escalate in 5min
- P2 (Degraded): Notify ops channel, scale affected service, monitor
- P3/P4: Log and create incident.io ticket
