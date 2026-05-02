---
name: frontend-designer
description: High-quality UI coder for the Zynx AGI platform. Use this skill when generating production-grade React/TypeScript UI components, landing pages, dashboards, design systems, or any frontend interface. Triggers when user asks to "design a UI", "build a component", "create a page", "make a frontend", "style this", or needs polished visual output. Always produces distinctive, non-generic designs with proper accessibility, TypeScript strict types, and Tailwind CSS — never cookie-cutter AI aesthetics.
---

# Frontend Designer

Generates distinctive, production-grade frontend interfaces using React 19, TypeScript strict, Tailwind CSS, shadcn/ui, and Framer Motion.

## Design Philosophy
- **No generic AI aesthetics** — every output has character and intent
- **Zynx brand**: deep slate + electric violet + warm amber accents
- **Mobile-first**, WCAG AA accessible
- **Performance**: bundle-split, lazy-loaded, optimistic UI

## Input Contract

```typescript
import { z } from 'zod';

export const UISpecSchema = z.object({
  componentName: z.string().regex(/^[A-Z][A-Za-z]+$/),
  componentType: z.enum([
    'page', 'layout', 'widget', 'form', 'table',
    'chart', 'modal', 'nav', 'card', 'hero',
  ]),
  description: z.string().min(10),
  dataSchema: z.record(z.unknown()).optional(),
  theme: z.enum(['zynx-dark', 'zynx-light', 'neutral']).default('zynx-dark'),
  interactions: z.array(z.string()).default([]),
  responsive: z.boolean().default(true),
  a11y: z.boolean().default(true),
  animations: z.boolean().default(true),
  tenantId: z.string().uuid(),
});
```

## Output Contract

```typescript
export const UIOutputSchema = z.object({
  componentCode: z.string(),     // .tsx
  stylesCode: z.string(),        // Tailwind config additions
  storybookStory: z.string(),    // .stories.tsx
  testFile: z.string(),          // .test.tsx
  a11yReport: z.object({
    score: z.number().min(0).max(100),
    issues: z.array(z.string()),
  }),
});
```

## Zynx Design Tokens

```typescript
const ZYNX_TOKENS = {
  colors: {
    primary: '#7C3AED',      // Electric violet
    secondary: '#F59E0B',    // Warm amber
    surface: '#0F172A',      // Deep slate
    surfaceAlt: '#1E293B',   // Slate 800
    text: '#F1F5F9',         // Slate 100
    muted: '#64748B',        // Slate 500
    success: '#10B981',
    error: '#EF4444',
  },
  radius: { sm: '6px', md: '10px', lg: '16px', xl: '24px' },
  shadow: 'shadow-[0_0_30px_rgba(124,58,237,0.15)]',
};
```

## Component Structure

```
ComponentName/
├── index.tsx          (main component, default export)
├── ComponentName.tsx  (implementation)
├── types.ts           (Zod schema + TypeScript types)
├── hooks.ts           (custom hooks)
└── ComponentName.stories.tsx
```

## Code Standards
- All props typed with Zod + `z.infer<>`
- `React.memo` on pure presentational components
- `useCallback`/`useMemo` for expensive computations
- Error boundaries on all async data components
- No `any` types — use `unknown` with type guards
