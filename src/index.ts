import { streamText } from 'ai';
import 'dotenv/config';
const result = streamText({
  model: 'openai/gpt-3.5-turbo',
  prompt: 'Explain quantum computing in simple terms.',
});
let totalTokens = 0;
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// After the stream finishes, get overall usage information
const usage = await result.usage;
console.log('\n\nToken usage:', usage);

console.log('\n\nTotal tokens used:', totalTokens);
