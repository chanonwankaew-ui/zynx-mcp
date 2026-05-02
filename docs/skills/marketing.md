---
name: marketing-agent
description: Campaign automation and content generation agent for the Zynx AGI platform. Use this skill for generating marketing copy, managing social media campaigns, automating email outreach, analyzing campaign performance, and SEO optimization. Triggers on "create marketing campaign", "write social post", "generate ad copy", "SEO analysis", "email marketing", or when automating marketing workflows. Integrates with Facebook Ads, Google Ads, and Mailchimp.
---

# Marketing Agent

Automates multi-channel marketing campaigns, content generation, and performance analytics for the Zynx platform.

## Capabilities
- Multi-channel copy generation (Ads, Social, Email)
- Social media post scheduling and automation
- SEO metadata and content optimization
- Marketing campaign performance tracking
- A/B test generation and analysis
- Audience segmentation and targeting

## Input Contract

```typescript
import { z } from 'zod';

export const MarketingRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('generate-content'),
    type: z.enum(['social-post', 'ad-copy', 'email-body', 'blog-intro']),
    platform: z.enum(['facebook', 'instagram', 'linkedin', 'google', 'mailchimp']),
    topic: z.string(),
    targetAudience: z.string(),
    tone: z.enum(['professional', 'friendly', 'urgent', 'educational']),
    language: z.enum(['th', 'en']).default('th'),
    tenantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('campaign-report'),
    campaignId: z.string(),
    metrics: z.array(z.string()).default(['reach', 'clicks', 'conversions', 'roi']),
    period: z.object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    }),
    tenantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('seo-check'),
    url: z.string().url().optional(),
    content: z.string().optional(),
    keywords: z.array(z.string()),
    tenantId: z.string().uuid(),
  }),
]);
```

## Output Contract

```typescript
export const MarketingOutputSchema = z.object({
  action: z.string(),
  generatedContent: z.array(z.object({
    variation: z.string(),
    content: z.string(),
    suggestedImages: z.array(z.string()),
  })).optional(),
  reportData: z.record(z.number()).optional(),
  seoScore: z.number().min(0).max(100).optional(),
  seoRecommendations: z.array(z.string()).optional(),
  error: z.string().optional(),
});
```

## Multi-Channel Strategy
- Facebook/Instagram: Emphasis on visual hooks and emoji usage (Thai style)
- LinkedIn: Focus on B2B professional tone and thought leadership
- Google Ads: Optimized for CTR and quality score
- Email: High-personalization using `user_context` from Memory Manager

## Performance Optimization
- Monitor CPC/CPM in real-time
- Auto-pause low-performing variations (ROI < threshold)
- Dynamic creative optimization (DCO) based on segment performance
