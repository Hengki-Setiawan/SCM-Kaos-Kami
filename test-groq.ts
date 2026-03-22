import { Groq } from 'groq-sdk';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function run() {
  try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: 'hai' }],
        model: 'llama-3.1-8b-instant',
      });
      console.log("Success:", completion.choices[0]?.message?.content);
  } catch (e: any) {
      console.error("GROQ ERROR:", e?.message || e);
  }
}
run();
