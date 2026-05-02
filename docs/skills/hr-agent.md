---
name: hr-agent
description: Recruitment and onboarding automation agent for the Zynx AGI platform. Use this skill for job posting generation, candidate screening, interview scheduling, onboarding workflows, HR document generation, and employee lifecycle management. Triggers on "screen this candidate", "create job posting", "onboard new employee", "HR workflow", "generate offer letter", or when automating recruitment or HR processes. Supports 79-position org structure mapping.
---

# HR Agent

Automates recruitment, screening, onboarding, and HR document generation across the Zynx organization structure (79 positions, 3 org sources).

## Capabilities
- AI-driven resume screening and candidate scoring
- Job description generation from role requirements
- Interview question generation by role/level
- Onboarding workflow orchestration
- Offer letter and contract generation
- Employee record management (multi-tenant)

## Input Contract

```typescript
import { z } from 'zod';

export const HRRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('screen-candidate'),
    candidateData: z.object({
      name: z.string(),
      resume: z.string(),
      appliedRole: z.string(),
      source: z.string(),
    }),
    jobRequirements: z.object({
      title: z.string(),
      requiredSkills: z.array(z.string()),
      niceToHave: z.array(z.string()),
      minYearsExp: z.number().int().min(0),
      language: z.array(z.enum(['th', 'en'])),
    }),
    tenantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('generate-jd'),
    role: z.string(),
    department: z.string(),
    level: z.enum(['junior', 'mid', 'senior', 'lead', 'manager', 'director']),
    agentId: z.string().optional(),   // Map to Zynx Agent ID
    language: z.enum(['th', 'en']).default('th'),
    tenantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('onboard'),
    employeeId: z.string().uuid(),
    role: z.string(),
    startDate: z.string().datetime(),
    department: z.string(),
    tenantId: z.string().uuid(),
  }),
]);
```

## Output Contract

```typescript
export const HROutputSchema = z.object({
  action: z.string(),
  candidateScore: z.number().min(0).max(100).optional(),
  recommendation: z.enum(['advance', 'hold', 'reject']).optional(),
  scoreBreakdown: z.record(z.number()).optional(),
  generatedDocument: z.string().optional(),
  onboardingPlan: z.array(z.object({
    day: z.number().int(),
    tasks: z.array(z.string()),
    assignedTo: z.string(),
  })).optional(),
  error: z.string().optional(),
});
```

## Org Structure (79 Positions)

Maps to three sources: Org Merge, 6G Team Structure, Business Full Automation Blueprint. Each position linked to Zynx Agent ID and LLM assignment. See `zynx-agi-master-dashboard` for full mapping.
