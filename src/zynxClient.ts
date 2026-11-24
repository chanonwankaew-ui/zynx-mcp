import { zynxApiBaseUrl } from "./config.js";

export type InvokeAgentInput = {
  agentId: string;
  input: Record<string, unknown>;
  sessionId?: string;
  streaming?: boolean;
  options?: {
    timeoutMs?: number;
    maxTokens?: number;
  };
};

export type GetAgentHealthInput = {
  agentId: string;
};

export type ListAgentsResult = {
  agents: Array<{
    id: string;
    name: string;
    status?: string;
    tenantScope?: string;
    allowedRoles?: string[];
  }>;
};

const baseUrl = () => {
  return zynxApiBaseUrl;
};

const serviceHeaders = () => {
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };

  const serviceToken = process.env.ZYNX_SERVICE_TOKEN || process.env.ZYNX_INTERNAL_SERVICE_TOKEN;
  if (serviceToken) {
    headers.authorization = `Bearer ${serviceToken}`;
  }

  if (process.env.ZYNX_DEFAULT_TENANT_ID) {
    headers["x-zynx-tenant-id"] = process.env.ZYNX_DEFAULT_TENANT_ID;
  }

  if (process.env.ZYNX_DEFAULT_USER_ID) {
    headers["x-zynx-user-id"] = process.env.ZYNX_DEFAULT_USER_ID;
  }

  headers["x-zynx-trace-id"] = `tr-${Math.random().toString(36).slice(2, 11)}`;

  return headers;
};

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    if (typeof body === "object" && body !== null) {
      const b = body as Record<string, unknown>;
      // Support RFC 9457 Problem Details (detail / title) as well as legacy error field
      if (typeof b.detail === "string" && b.detail.trim()) {
        message = b.detail.trim();
      } else if ("error" in b && b.error !== undefined && b.error !== null) {
        message = typeof b.error === "object" ? JSON.stringify(b.error) : String(b.error);
      } else if (typeof b.title === "string" && b.title.trim()) {
        message = b.title.trim();
      }
    }
    const err = new Error(message);
    (err as Record<string, unknown>).status = res.status;
    (err as Record<string, unknown>).problemDetails = body;
    throw err;
  }

  return body;
}

/**
 * ARQ (Automatic Repeat Request) Implementation
 * Retries a function with a fixed delay between attempts.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxAttempts) {
        console.warn(`[ARQ] Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError;
}

export async function invokeAgent(input: InvokeAgentInput) {
  return withRetry(async () => {
    const { agentId, ...payload } = input;
    const res = await fetch(`${baseUrl()}/agents/${encodeURIComponent(agentId)}/invoke`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify(payload)
    });
    return parseJsonResponse(res);
  });
}

export async function getAgentHealth(input: GetAgentHealthInput) {
  return withRetry(async () => {
    const res = await fetch(`${baseUrl()}/agents/${encodeURIComponent(input.agentId)}/health`, {
      method: "GET",
      headers: serviceHeaders()
    });
    return parseJsonResponse(res);
  });
}

export async function listAgents(): Promise<unknown> {
  return withRetry(async () => {
    const res = await fetch(`${baseUrl()}/agents`, {
      method: "GET",
      headers: serviceHeaders()
    });
    return parseJsonResponse(res);
  });
}
