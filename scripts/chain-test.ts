// scripts/chain-test.ts
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

// List of agents to invoke sequentially. Adjust as needed.
// To extend the chain, simply add more agent IDs to this array.
const AGENT_CHAIN = ['task-planner', 'validator', 'db-agent']; // e.g., add 'reviewer', 'report-gen', 'logger'
const BASE_URL = process.env.ZYNX_API_BASE_URL || 'http://localhost:8787';

async function runChainTest() {
  console.log('🚀 Starting Chain Test for Zynx Agents...');

  let currentInput: any = { goal: 'Automated Integration Test' }; // initial payload
  let lastTraceId: string | null = null;
  const stepResults: Array<any> = []; // store each step's result for reporting

  for (const agentId of AGENT_CHAIN) {
    try {
      console.log(`\nTesting agent: ${agentId}...`);

      const payload = {
        input: lastTraceId ? { traceId: lastTraceId, data: currentInput } : currentInput,
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        streaming: false,
        // options are optional; you can uncomment if needed
        // options: { timeoutMs: 30000, maxTokens: 2048 }
      };

      const response = await axios.post(`${BASE_URL}/agents/${agentId}/invoke`, payload);

        if (response.status === 200) {
          const data = response.data;
          // Verify traceId presence; abort if missing
          if (!data.traceId) {
            console.error(`❌ ${agentId} response missing traceId. Aborting.`);
            process.exit(1);
          }
          lastTraceId = data.traceId;
          currentInput = data.output;
          console.log(`✅ ${agentId} succeeded (TraceId: ${lastTraceId})`);
          // Record step result
          stepResults.push({
            agentId,
            traceId: lastTraceId,
            status: response.status,
            output: data.output,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error(`❌ ${agentId} returned unexpected status: ${response.status}`);
          process.exit(1);
        }
    } catch (err: any) {
      console.error(`❌ ${agentId} failed:`, err.response?.data ?? err.message);
      process.exit(1);      }
    }

  // Write report to reports/workflow-runs/
  try {
    const reportsDir = path.resolve('reports', 'workflow-runs');
    await fs.mkdir(reportsDir, { recursive: true });
    const reportPath = path.join(reportsDir, `chain-test-${Date.now()}.json`);
    await fs.writeFile(
      reportPath,
      JSON.stringify({
        startedAt: new Date().toISOString(),
        steps: stepResults
      }, null, 2)
    );
    console.log(`\n📄 Report written to ${reportPath}`);
  } catch (err) {
    console.error('Failed to write report:', err);
  }

  console.log('\n✨ Chain Test completed successfully for all agents!');
}

runChainTest();
