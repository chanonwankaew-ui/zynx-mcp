---
name: form-builder
description: Dynamic form generator for the Zynx AGI platform. Use this skill to generate JSON Schema-driven, Zod-validated HTML/React forms from data models, API specs, or natural language descriptions. Triggers when user says "create a form", "build a form for", "generate input fields", "make a registration form", or when any agent needs a user-facing data capture interface. Also use when converting database schemas or Zod schemas into renderable forms.
---

# Form Builder

Generates production-ready dynamic forms from schema definitions, with built-in Zod validation, accessibility, and multi-step support.

## Responsibilities
- Convert Zod/JSON Schema → React form components
- Generate client-side and server-side validation
- Support multi-step wizard forms
- Output TypeScript-typed form handlers

## Input Contract

```typescript
import { z } from 'zod';

export const FormSpecSchema = z.object({
  formId: z.string().min(1),
  title: z.string(),
  description: z.string().optional(),
  schema: z.record(z.unknown()),   // Zod or JSON Schema
  layout: z.enum(['single', 'multi-step', 'accordion']).default('single'),
  steps: z.array(z.object({
    stepId: z.string(),
    title: z.string(),
    fields: z.array(z.string()),
  })).optional(),
  submitEndpoint: z.string().url().optional(),
  tenantId: z.string().uuid(),
  locale: z.string().default('th'),
});
```

## Output Contract

```typescript
export const FormOutputSchema = z.object({
  formId: z.string(),
  componentCode: z.string(),          // React TSX
  validationSchema: z.string(),       // Zod schema TS
  apiHandler: z.string(),             // Next.js API route
  cssClasses: z.record(z.string()),
  a11yScore: z.number().min(0).max(100),
});
```

## Supported Field Types

| Type | Component | Validation |
|---|---|---|
| `string` | `<Input>` | min/max/regex |
| `number` | `<NumberInput>` | min/max/step |
| `boolean` | `<Checkbox>` | required |
| `enum` | `<Select>` | oneOf |
| `date` | `<DatePicker>` | min/max date |
| `file` | `<FileUpload>` | type/size |
| `array` | `<RepeatableGroup>` | minItems/maxItems |

## Code Generation Pattern

```typescript
function generateFormComponent(spec: FormSpec): string {
  const fields = extractFields(spec.schema);
  const zodSchema = buildZodSchema(fields);
  const jsx = renderFormJSX(fields, spec.layout);
  return formatTypeScript(`
    import { useForm } from 'react-hook-form';
    import { zodResolver } from '@hookform/resolvers/zod';
    ${zodSchema}
    export function ${toPascalCase(spec.formId)}Form() { ${jsx} }
  `);
}
```

## Output Format
Always output: component `.tsx`, validation schema `.ts`, and API handler `.ts` as separate files.
