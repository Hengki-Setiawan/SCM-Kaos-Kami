import { db } from '@/db';
import { telegramSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { StorageAdapter } from 'grammy';

export interface BotSessionData {
  pendingAction?: any;
  lastCategory?: string;
  lastQuery?: string;
  contextMessages: {role: 'user' | 'assistant' | 'system', content: string}[];
  role?: string;
}

export const getTursoAdapter = (): StorageAdapter<BotSessionData> => {
  return {
    read: async (key: string) => {
      try {
        const [session] = await db.select().from(telegramSessions).where(eq(telegramSessions.id, key));
        if (session) {
            return JSON.parse(session.data) as BotSessionData;
        }
      } catch (e) {
          console.error("Session read error:", e);
      }
      return undefined;
    },
    write: async (key: string, value: BotSessionData) => {
      try {
        const jsonStr = JSON.stringify(value);
        const [existing] = await db.select().from(telegramSessions).where(eq(telegramSessions.id, key));
        if (existing) {
            await db.update(telegramSessions).set({ data: jsonStr, updatedAt: new Date().toISOString() }).where(eq(telegramSessions.id, key));
        } else {
            await db.insert(telegramSessions).values({ id: key, data: jsonStr, updatedAt: new Date().toISOString() });
        }
      } catch (e) {
          console.error("Session write error:", e);
      }
    },
    delete: async (key: string) => {
      try {
        await db.delete(telegramSessions).where(eq(telegramSessions.id, key));
      } catch (e) {
          console.error("Session delete error:", e);
      }
    }
  };
};
