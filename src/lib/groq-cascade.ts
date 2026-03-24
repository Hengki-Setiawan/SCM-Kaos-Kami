import { Groq } from 'groq-sdk';
import { logAICall } from './ai-logger';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SMART_CASCADE = [
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'qwen3-32b',
  'openai/gpt-oss-20b',
  'llama-3.1-8b-instant',
];

const FAST_CASCADE = [
  'llama-3.1-8b-instant',
  'qwen3-32b',
  'llama-3.3-70b-versatile',
];

export async function cascadeChat(options: {
  messages: any[];
  type: 'smart' | 'fast';
  temperature?: number;
  max_tokens?: number;
  response_format?: any;
}) {
  const chain = options.type === 'smart' ? SMART_CASCADE : FAST_CASCADE;
  let lastError: any = null;

  for (const model of chain) {
    const startTime = Date.now();
    try {
      const result = await groq.chat.completions.create({
        messages: options.messages,
        model,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? 1024,
        response_format: options.response_format,
      });
      logAICall(model, 'groq', Date.now() - startTime, true);
      return { result, model };
    } catch (error: any) {
      logAICall(model, 'groq', Date.now() - startTime, false, error.status?.toString() || error.message);
      if (error.status === 429 || error.status === 503 || error.status === 404 || error.status === 400) {
        console.warn(`[AI Cascade] ⚠️ ${error.status || 'Error'}: ${model}, trying next...`);
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('All AI models exhausted');
}
