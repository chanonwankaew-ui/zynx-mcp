---
name: task-planner
description: Job decomposer for the Zynx AGI platform. Use this skill when a complex job or user intent needs to be broken into discrete, ordered subtasks for multi-agent execution. Triggers on phrases like "plan this", "break this down", "create a task list", "decompose", or when the Orchestrator needs a structured execution plan from a raw intent string. Always use before routing to specialized agents.
---

# Task Planner

Converts raw user intent or high-level jobs into structured, dependency-resolved task graphs ready for agent execution.

## Responsibilities
- Parse intent into discrete atomic tasks
- Identify dependencies between tasks (DAG)
- Estimate complexity and assign agent types
- Serialize plan as `TaskGraph` JSON

## Input Contract

```typescript
import { z } from 'zod';

export const TaskPlannerInputSchema = z.object({
  intent: z.string().min(1).max(4000),
  context: z.record(z.unknown()).optional(),
  availableAgents: z.array(z.string()).min(1),
  maxTasks: z.number().int().min(1).max(50).default(20),
  tenantId: z.string().uuid(),
});
```

## Output Contract

```typescript
export const TaskSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  description: z.string(),
  agentType: z.string(),
  priority: z.number().int().min(0).max(10),
  dependsOn: z.array(z.string()),
  estimatedMs: z.number().int().positive(),
  inputs: z.record(z.unknown()),
  outputs: z.array(z.string()),
});

export const TaskGraphSchema = z.object({
  graphId: z.string().uuid(),
  intent: z.string(),
  tasks: z.array(TaskSchema),
  criticalPath: z.array(z.string()),
  totalEstimatedMs: z.number(),
  createdAt: z.string().datetime(),
});
```

## Planning Strategy

1. **Extract entities** — nouns = data, verbs = actions
2. **Map to agents** — match action verbs to agent capability matrix
3. **Resolve dependencies** — topological sort (Kahn's algorithm)
4. **Estimate durations** — lookup table by task type
5. **Identify critical path** — longest path through DAG

## Output Format
Return `TaskGraphSchema`-compliant JSON. Never return prose — always structured output.
