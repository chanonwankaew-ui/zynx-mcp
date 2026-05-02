import { Intent, IntentSchema, AgentResult } from "./schemas/index.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Utility for exponential backoff
 */
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * DeejaAgent: Thai NLP Parser
 * Simulates intent parsing with retry and timeout race.
 */
export class DeejaAgent {
  private maxRetries = 3;
  private baseDelay = 1000;
  private timeoutMs = 5000;

  constructor(options?: { maxRetries?: number; timeoutMs?: number }) {
    if (options?.maxRetries) this.maxRetries = options.maxRetries;
    if (options?.timeoutMs) this.timeoutMs = options.timeoutMs;
  }

  /**
   * Parse Thai text to Intent with exponential backoff and timeout
   */
  async parseIntent(text: string): Promise<AgentResult<Intent>> {
    let attempt = 0;
    
    while (attempt <= this.maxRetries) {
      try {
        const result = await Promise.race([
          this._simulateParsing(text),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), this.timeoutMs))
        ]);
        
        // Validate with Zod
        const validated = IntentSchema.parse(result);
        return { success: true, data: validated };
      } catch (err: any) {
        attempt++;
        if (attempt > this.maxRetries) {
          return { success: false, error: `DeejaAgent failed after ${this.maxRetries} retries. Last error: ${err.message}` };
        }
        const delay = this.baseDelay * Math.pow(2, attempt - 1);
        console.log(`[DeejaAgent] Parsing failed (${err.message}), retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
    
    return { success: false, error: "Unknown failure" };
  }

  private async _simulateParsing(text: string): Promise<Partial<Intent>> {
    // Simulate network delay
    await sleep(Math.random() * 1000 + 500);
    
    // Simulate occasional random failure for retry demonstration
    if (Math.random() < 0.2) throw new Error("Random NLP API failure");

    // Simple heuristic-based parsing for demo
    let parsedIntent = "general_chat";
    if (text.includes("สรุป")) parsedIntent = "summarize";
    else if (text.includes("แปล")) parsedIntent = "translate";
    else if (text.includes("ค้นหา") || text.includes("หา")) parsedIntent = "search";

    return {
      id: uuidv4(),
      rawInput: text,
      parsedIntent,
      confidence: 0.85 + (Math.random() * 0.1), // 0.85 - 0.95
      createdAt: new Date()
    };
  }
}
