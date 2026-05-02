---
name: finance-agent
description: Invoicing and financial reporting agent for the Zynx AGI platform. Use this skill for generating invoices, processing payments, creating financial reports, managing subscriptions, calculating taxes (Thai VAT), and financial analytics. Triggers on "create invoice", "generate financial report", "process payment", "calculate VAT", "billing summary", "revenue report", or when automating financial workflows. Integrates with Stripe and Thai banking systems.
---

# Finance Agent

Manages invoicing, payment processing, financial reporting, and Thai VAT compliance for the Zynx SaaS platform.

## Capabilities
- Invoice generation (PDF, Thai tax invoice format)
- Stripe payment processing + webhook handling
- Subscription lifecycle management
- Thai VAT (7%) calculation and reporting
- MRR/ARR tracking and reporting
- Multi-currency support (THB, USD, SGD)

## Input Contract

```typescript
import { z } from 'zod';

export const FinanceRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create-invoice'),
    customerId: z.string(),
    lineItems: z.array(z.object({
      description: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
      currency: z.enum(['THB', 'USD', 'SGD']),
      vatApplicable: z.boolean().default(true),
    })).min(1),
    dueDate: z.string().datetime(),
    notes: z.string().optional(),
    tenantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('financial-report'),
    reportType: z.enum(['mrr', 'arr', 'cashflow', 'p&l', 'vat-report']),
    period: z.object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    }),
    currency: z.enum(['THB', 'USD']).default('THB'),
    tenantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('process-payment'),
    invoiceId: z.string(),
    paymentMethod: z.enum(['stripe', 'bank-transfer', 'promptpay']),
    amount: z.number().positive(),
    currency: z.enum(['THB', 'USD', 'SGD']),
    tenantId: z.string().uuid(),
  }),
]);
```

## Output Contract

```typescript
export const FinanceOutputSchema = z.object({
  action: z.string(),
  invoiceId: z.string().optional(),
  invoicePdfUrl: z.string().url().optional(),
  paymentIntentId: z.string().optional(),
  paymentStatus: z.enum(['pending', 'success', 'failed']).optional(),
  reportData: z.record(z.unknown()).optional(),
  vatAmount: z.number().optional(),
  totalAmount: z.number().optional(),
  currency: z.string().optional(),
  error: z.string().optional(),
});
```

## Thai VAT Compliance
- VAT rate: 7%
- Include 13-digit taxpayer ID on invoices
- WHT deduction support (3%, 5%)
- ภพ.30 compatible report format
- Use Report Generator for PDF output
