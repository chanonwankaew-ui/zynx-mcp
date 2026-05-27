import { streamText } from 'ai';

const result = streamText({
  model: 'openai/gpt-3.5-turbo',
  prompt: 'อธิบายการคอมพิวเตอร์ควอนตัมในแบบง่าย ๆ เป็นภาษาไทย.',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
