---
name: report-gen
description: PDF, Excel, and document generator for the Zynx AGI platform. Use this skill for creating formatted reports, invoices, data exports, charts, and summaries in various file formats. Triggers on "generate PDF", "export to Excel", "create report", "render chart", "download summary", or when any agent needs to produce a downloadable document for the user. Supports complex layouts and styling.
---

# Report Generator

Generates high-fidelity, formatted documents (PDF, XLSX, CSV) from platform data with support for charts, tables, and branding.

## Capabilities
- PDF generation with CSS/HTML templates (Puppeteer/Playwright)
- Excel (XLSX) generation with multi-sheet support
- Data export to CSV/JSON formats
- Dynamic chart rendering (SVG/PNG) for reports
- S3/GCS upload and signed URL generation
- Template management (Invoices, Reports, Lists)

## Input Contract

```typescript
import { z } from 'zod';

export const ReportRequestSchema = z.object({
  reportType: z.enum(['pdf', 'xlsx', 'csv', 'json', 'image']),
  templateId: z.string(),
  data: z.record(z.unknown()),
  title: z.string().default('Zynx Report'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  branding: z.object({
    logo: z.boolean().default(true),
    colors: z.record(z.string()).optional(),
  }).default({}),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
});
```

## Output Contract

```typescript
export const ReportOutputSchema = z.object({
  reportId: z.string().uuid(),
  fileUrl: z.string().url(),
  fileName: z.string(),
  fileSize: z.number().int(), // Bytes
  expiresAt: z.string().datetime(),
  format: z.string(),
  error: z.string().optional(),
});
```

## Rendering Engine
- **PDF**: Chromium-based headless browser for pixel-perfect CSS rendering
- **Excel**: `exceljs` for high-performance spreadsheet generation
- **Charts**: `d3.js` or `Chart.js` rendered to PNG/SVG
- **Storage**: Temporary storage in S3 bucket with 24-hour TTL lifecycle policy

## Standard Templates
- `invoice-v1`: Standard Thai Tax Invoice layout
- `summary-dashboard`: Compact multi-chart report
- `data-export`: Raw table layout for Excel
- `performance-audit`: Security and speed audit report
