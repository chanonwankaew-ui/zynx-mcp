---
name: workflow-mapper
description: Platform implementation mapping agent for the Zynx AGI platform. Use this skill to map Zynx agent architectures, execution plans, or system specs to concrete implementation patterns on target platforms (OpenAI Agents, LangGraph, CrewAI, n8n, Zapier, Make, Cloudflare Workers). Triggers on "map this to", "implement on platform", "convert to workflow", "how do I build this in", "port this architecture", or when comparing Zynx designs with external platform capabilities. Always produces gap analysis + implementation guide.
---

# Workflow Mapper

Maps Zynx AGI agent architectures to concrete implementation blocks on target automation and AI orchestration platforms.

## Supported Target Platforms

| Platform | Category | Strengths |
|---|---|---|
| OpenAI Agents SDK | AI orchestration | Tool use, handoffs, guardrails |
| LangGraph | AI orchestration | Stateful graphs, checkpointing |
| CrewAI | AI orchestration | Role-based multi-agent |
| n8n | Workflow automation | Visual, 400+ integrations |
| Make (Integromat) | Workflow automation | Complex branching |
| Cloudflare Workers | Edge compute | Low latency, global |
| Temporal | Workflow engine | Durable execution |

## Input Contract

```typescript
import { z } from 'zod';

export const WorkflowMapRequestSchema = z.object({
  sourceSpec: z.object({
    agents: z.array(z.object({
      agentId: z.string(),
      type: z.string(),
      capabilities: z.array(z.string()),
      inputSchema: z.record(z.unknown()),
      outputSchema: z.record(z.unknown()),
    })),
    orchestrationPattern: z.enum(['sequential', 'parallel', 'dag', 'loop', 'event-driven']),
    dataFlows: z.array(z.object({
      from: z.string(),
      to: z.string(),
      dataType: z.string(),
    })),
  }),
  targetPlatform: z.enum(['openai-agents', 'langgraph', 'crewai', 'n8n', 'make', 'cloudflare', 'temporal']),
  tenantId: z.string().uuid(),
  generateCode: z.boolean().default(true),
});
```

## Output Contract

```typescript
export const WorkflowMapResultSchema = z.object({
  mappingId: z.string().uuid(),
  targetPlatform: z.string(),
  blockMappings: z.array(z.object({
    zynxAgentId: z.string(),
    targetBlock: z.string(),
    targetConfig: z.record(z.unknown()),
    implementationNotes: z.string(),
  })),
  gapAnalysis: z.array(z.object({
    capability: z.string(),
    gap: z.string(),
    workaround: z.string().optional(),
    severity: z.enum(['blocking', 'major', 'minor']),
  })),
  implementationCode: z.string().optional(),
  estimatedEffortDays: z.number(),
});
```

## Mapping Logic

```typescript
function mapToOpenAIAgents(spec: SourceSpec): BlockMapping[] {
  return spec.agents.map(agent => ({
    zynxAgentId: agent.agentId,
    targetBlock: inferOpenAIBlock(agent.type),
    // Orchestrator → Runner with handoffs
    // Task Planner → function tool returning TaskGraph
    // Auth Guard → input_guardrail
    // Logger → output_guardrail + trace hook
  }));
}
```

## Output Format
Always produce: block-by-block mapping table, gap analysis, implementation guide, and TypeScript/Python code skeleton.
