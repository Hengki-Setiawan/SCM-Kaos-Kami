import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { aiTelemetry } from '@/db/schema';

let isDbInitialized = false;

async function ensureTable() {
  if (isDbInitialized) return;
  try {
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS ai_telemetry (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        latency_ms INTEGER NOT NULL,
        is_success INTEGER NOT NULL,
        error_message TEXT,
        task_type TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    isDbInitialized = true;
  } catch (e) {
    console.error('Failed to init telemetry table', e);
  }
}

export async function logAICall(model: string, provider: string, latency: number, success: boolean, errorMessage?: string, taskType: 'pipeline' | 'solo' | 'verify' = 'solo') {
  const symbol = success ? '✅' : '❌';
  console.log(`[AI Telemetry] ${symbol} ${provider}/${model} - ${latency}ms`);
  
  await ensureTable();
  try {
    await db.insert(aiTelemetry).values({
      id: uuidv4(),
      provider,
      model,
      latencyMs: latency,
      isSuccess: success,
      errorMessage: errorMessage || null,
      taskType
    });
  } catch (e) {
    console.error('[AI Telemetry] Failed to insert', e);
  }
}

export async function getAIStats() {
  await ensureTable();
  try {
    const raw = await db.select().from(aiTelemetry);
    const s = {
      pipeline_calls: raw.filter(x => x.taskType === 'pipeline').length,
      groq_solo_calls: raw.filter(x => x.taskType === 'solo').length,
      verify_calls: raw.filter(x => x.taskType === 'verify').length,
      gemini_failures: raw.filter(x => !x.isSuccess && x.provider === 'gemini').length,
      total_calls: raw.length,
      success_calls: raw.filter(x => x.isSuccess).length,
      failed_calls: raw.filter(x => !x.isSuccess).length,
      total_latency_ms: raw.filter(x => x.isSuccess).reduce((acc, curr) => acc + curr.latencyMs, 0),
      avg_latency_ms: 0,
      models: {} as Record<string, number>
    };
    if (s.success_calls > 0) s.avg_latency_ms = Math.round(s.total_latency_ms / s.success_calls);
    
    raw.forEach(x => {
      s.models[x.model] = (s.models[x.model] || 0) + 1;
    });
    return s;
  } catch (e) {
    console.error('Failed to get stats', e);
    return null;
  }
}
