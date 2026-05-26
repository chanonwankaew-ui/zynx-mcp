import fs from 'fs';
import path from 'path';

/**
 * ฟังก์ชันสำหรับวิเคราะห์ Latency จากไฟล์รายงาน
 * @param reportPath พาธของไฟล์รายงาน .json
 */
function analyzeLatency(reportPath: string) {
  try {
    const rawData = fs.readFileSync(reportPath, 'utf-8');
    const report = JSON.parse(rawData);

    console.log(`\n📊 Latency Analysis: ${path.basename(reportPath)}`);
    console.log('----------------------------------------------------');
    console.log(`${'AGENT ID'.padEnd(20)} | ${'LATENCY (ms)'.padEnd(15)} | GRAPH`);
    console.log('----------------------------------------------------');

    const steps = report.steps || [];
    steps.forEach((step: any) => {
      // ดึงค่า duration จาก step.output.meta.durationMs (หรือ fallback เป็น step.duration)
      let duration = 0;
      if (step.output && typeof step.output === 'object' && step.output.meta && typeof step.output.meta.durationMs === 'number') {
        duration = step.output.meta.durationMs;
      } else if (typeof step.duration === 'number') {
        duration = step.duration;
      }
      
      const bar = '█'.repeat(Math.min(Math.floor(duration / 50), 40)); // สเกล 1 ขีด = 50ms
      
      console.log(
        `${(step.agentId || 'unknown').padEnd(20)} | ${duration.toString().padEnd(15)} | ${bar}`
      );
    });

    console.log('----------------------------------------------------\n');
  } catch (error) {
    console.error('❌ Error reading report file:', error);
  }
}

// รับค่าจาก Command Line
const reportFile = process.argv[2] || 'reports/workflow-runs/latest-run.json';
analyzeLatency(reportFile);
