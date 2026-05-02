---
name: touchscreen
description: Kiosk and POS interface operator agent for the Zynx AGI platform. Use this skill for managing physical touchscreen interactions, kiosk UI states, POS transaction flows, hardware integration (scanners, printers), and localized offline-first UI logic. Triggers on "kiosk mode", "POS transaction", "screen interaction", "print receipt", "scan barcode", or when automating physical terminal workflows. Designed for low-latency, high-reliability touch interactions.
---

# Touchscreen Operator

Manages the specialized UI/UX flows and hardware integrations for Zynx-powered kiosks and Point-of-Sale (POS) terminals.

## Capabilities
- Kiosk UI state machine management (Idle, Selection, Payment, Success)
- Hardware integration (Thermal printers, Barcode/QR scanners, RFID)
- Payment terminal handoff (local network / serial)
- Offline-first data synchronization (Sync with DB Agent when online)
- Large-target touch-optimized UI layout generation
- Multi-language support for walk-up users

## Input Contract

```typescript
import { z } from 'zod';

export const TouchscreenRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('process-pos-event'),
    eventType: z.enum(['item-scan', 'payment-start', 'payment-cancel', 'receipt-print']),
    payload: z.record(z.unknown()),
    terminalId: z.string(),
    tenantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('update-kiosk-ui'),
    state: z.string(),
    content: z.record(z.unknown()),
    language: z.enum(['th', 'en', 'zh']).default('th'),
    tenantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('hardware-command'),
    device: z.enum(['printer', 'scanner', 'payment-link', 'cash-drawer']),
    command: z.string(),
    params: z.record(z.unknown()).optional(),
    tenantId: z.string().uuid(),
  }),
]);
```

## Output Contract

```typescript
export const TouchscreenOutputSchema = z.object({
  action: z.string(),
  success: z.boolean(),
  nextState: z.string().optional(),
  uiData: z.record(z.unknown()).optional(),
  deviceResponse: z.unknown().optional(),
  error: z.string().optional(),
});
```

## Design Requirements
- **Touch-First**: Minimum button size 48x48dp, high contrast
- **Reliability**: All hardware commands must have timeouts and retry logic
- **Privacy**: Auto-reset to 'Idle' after 60s of inactivity
- **Performance**: UI updates < 100ms for immediate touch feedback

## Hardware Stack
- Thermal Printers: ESC/POS protocol
- Scanners: HID keyboard emulation or Serial
- Payment: PromptPay QR (Dynamic), Stripe Terminal, or local bank EDC
