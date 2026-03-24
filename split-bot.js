const fs = require('fs');

async function splitBot() {
  const file = 'd:/Vibe coding (bisnis)/SCM kaos kami/scm-app/src/app/api/bot/route.ts';
  let code = fs.readFileSync(file, 'utf8');

  // Find bot.on('message:photo' ...);
  const photoRegex = /bot\.on\('message:photo', async \(ctx\) => \{([\s\S]*?)\}\);\n\n\/\/ ==================== 🎙️ VOICE/;
  const photoMatch = photoRegex.exec(code);

  if (photoMatch) {
    const photoLogic = 'export async function handlePhotoMsg(ctx: any) {' + photoMatch[1] + '}\n';
    fs.mkdirSync('d:/Vibe coding (bisnis)/SCM kaos kami/scm-app/src/lib/bot/handlers', { recursive: true });
    
    const photoFile = `import { InlineKeyboard } from 'grammy';
import { db } from '@/db';
import { products } from '@/db/schema';
import { Groq } from 'groq-sdk';
import { followUpGeneral } from '@/lib/bot/keyboards';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

` + photoLogic;
    
    fs.writeFileSync('d:/Vibe coding (bisnis)/SCM kaos kami/scm-app/src/lib/bot/handlers/photo.ts', photoFile);

    // Find bot.on('message:voice' ...);
    const voiceRegex = /bot\.on\('message:voice', async \(ctx\) => \{([\s\S]*?)\}\);\n\n\/\/ ==================== FREE TEXT/;
    const voiceMatch = voiceRegex.exec(code);
    
    if (voiceMatch) {
      const voiceLogic = 'export async function handleVoiceMsg(ctx: any) {' + voiceMatch[1] + '}\n';
      const voiceFile = `import { InlineKeyboard } from 'grammy';
import { db } from '@/db';
import { products } from '@/db/schema';
import { Groq } from 'groq-sdk';
import { followUpGeneral } from '@/lib/bot/keyboards';
import { parseAIIntent } from '@/lib/ai-actions';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

` + voiceLogic;
      fs.writeFileSync('d:/Vibe coding (bisnis)/SCM kaos kami/scm-app/src/lib/bot/handlers/voice.ts', voiceFile);
      
      // Replace in main file
      let newCode = code.replace(photoMatch[0], 'bot.on(\'message:photo\', (ctx) => handlePhotoMsg(ctx));\n\n// ==================== 🎙️ VOICE');
      newCode = newCode.replace(voiceMatch[0], 'bot.on(\'message:voice\', (ctx) => handleVoiceMsg(ctx));\n\n// ==================== FREE TEXT');
      
      // Add imports
      newCode = newCode.replace('import { followUpStock', 'import { handlePhotoMsg } from \'@/lib/bot/handlers/photo\';\nimport { handleVoiceMsg } from \'@/lib/bot/handlers/voice\';\nimport { followUpStock');
      
      fs.writeFileSync(file, newCode);
      console.log('SUCCESS-SPLIT');
    } else {
      console.log('Voice match failed');
    }
  } else {
    console.log('Photo match failed');
  }
}

splitBot();
