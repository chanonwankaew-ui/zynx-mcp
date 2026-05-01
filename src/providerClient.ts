import {
  llmProvider,
  llmRequireProvider,
  llmTimeoutMs,
  openaiBaseUrl,
  openaiModel
} from "./config.js";

type ProviderStatus = "disabled" | "completed" | "fallback" | "error";

export type ProviderTextRequest = {
  instructions: string;
  input: string;
  fallbackText: string;
  maxOutputTokens?: number;
  metadata?: Record<string, string>;
};

export type ProviderTextResult = {
  text: string;
  provider: "local" | "openai";
  status: ProviderStatus;
  modelUsed: string;
  tokensUsed: number;
  usedRemoteProvider: boolean;
  error?: string;
};

type ResponseContentPart = {
  type?: unknown;
  text?: unknown;
};

type ResponseOutputItem = {
  content?: unknown;
};

type OpenAIResponseBody = {
  output_text?: unknown;
  output?: unknown;
  usage?: {
    total_tokens?: unknown;
  };
  model?: unknown;
  error?: {
    message?: unknown;
  };
};

function providerDisabledResult(fallbackText: string, error?: string): ProviderTextResult {
  return {
    text: fallbackText,
    provider: "local",
    status: error ? "fallback" : "disabled",
    modelUsed: "local-deterministic-handler",
    tokensUsed: 0,
    usedRemoteProvider: false,
    error
  };
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]");
}

function sanitizeMetadata(metadata: Record<string, string> | undefined) {
  if (!metadata) return undefined;

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key.slice(0, 64),
      value.slice(0, 512)
    ])
  );
}

function extractOutputText(body: OpenAIResponseBody): string {
  if (typeof body.output_text === "string" && body.output_text.trim()) {
    return body.output_text.trim();
  }

  if (!Array.isArray(body.output)) return "";

  const chunks: string[] = [];
  for (const item of body.output as ResponseOutputItem[]) {
    if (!Array.isArray(item.content)) continue;

    for (const part of item.content as ResponseContentPart[]) {
      if (part.type === "output_text" && typeof part.text === "string") {
        chunks.push(part.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

async function callOpenAI(request: ProviderTextRequest): Promise<ProviderTextResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !openaiModel) {
    const missing = !apiKey ? "OPENAI_API_KEY" : "OPENAI_MODEL";
    const message = `OpenAI provider is selected but ${missing} is not configured.`;
    if (llmRequireProvider) throw new Error(message);
    return providerDisabledResult(request.fallbackText, message);
  }

  const response = await fetch(`${openaiBaseUrl}/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    signal: AbortSignal.timeout(llmTimeoutMs),
    body: JSON.stringify({
      model: openaiModel,
      instructions: request.instructions,
      input: request.input,
      max_output_tokens: request.maxOutputTokens ?? 512,
      metadata: sanitizeMetadata(request.metadata),
      store: false
    })
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) as OpenAIResponseBody : {};

  if (!response.ok) {
    const message = typeof body.error?.message === "string"
      ? body.error.message
      : `OpenAI provider returned HTTP ${response.status}.`;
    throw new Error(message);
  }

  const outputText = extractOutputText(body);
  if (!outputText) {
    throw new Error("OpenAI provider returned no output text.");
  }

  return {
    text: outputText,
    provider: "openai",
    status: "completed",
    modelUsed: typeof body.model === "string" ? body.model : openaiModel,
    tokensUsed: typeof body.usage?.total_tokens === "number" ? body.usage.total_tokens : 0,
    usedRemoteProvider: true
  };
}

export async function generateProviderText(request: ProviderTextRequest): Promise<ProviderTextResult> {
  if (llmProvider !== "openai") {
    if (llmRequireProvider) {
      throw new Error(`Unsupported required ZYNX_LLM_PROVIDER "${llmProvider}".`);
    }
    return providerDisabledResult(request.fallbackText);
  }

  try {
    return await callOpenAI(request);
  } catch (error) {
    const message = safeErrorMessage(error);
    if (llmRequireProvider) throw new Error(message);
    return providerDisabledResult(request.fallbackText, message);
  }
}
