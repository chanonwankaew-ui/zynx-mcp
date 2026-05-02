import { ZynxAGIPlatform } from "../src/platform";
import crypto from "crypto";

async function run() {
  const platform = new ZynxAGIPlatform({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  });

  const sessionId = crypto.randomUUID();
  const result = await platform.process(sessionId, "สวัสดี ช่วยสรุปรายงานให้หน่อย");

  console.log("\n--- Final Output ---");
  console.log(JSON.stringify(result, null, 2));
}

run().catch(console.error);
