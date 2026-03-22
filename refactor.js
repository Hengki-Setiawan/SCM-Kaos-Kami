import * as fs from 'fs';

const p = 'src/app/api/bot/route.ts';
let code = fs.readFileSync(p, 'utf-8');

// 1. Remove const sessions = new Map... and getSession block
code = code.replace(/\/\/ ==================== SESSION STATE ====================[\s\S]*?function getSession\(chatId: number\) \{[\s\S]*?\n\}/m, '');

// 2. Add imports
if (!code.includes('import { getTursoAdapter, BotSessionData }')) {
  code = code.replace(/import \{ Groq \} from 'groq-sdk';/, `import { Groq } from 'groq-sdk';\nimport { session, Context, SessionFlavor } from 'grammy';\nimport { getTursoAdapter, BotSessionData } from '@/lib/turso-session';`);
  
  // Update Bot type definition
  code = code.replace(/const bot = new Bot\(process.env.TELEGRAM_BOT_TOKEN as string\);/, `type MyContext = Context & SessionFlavor<BotSessionData>;\nconst bot = new Bot<MyContext>(process.env.TELEGRAM_BOT_TOKEN as string);\n\nbot.use(session({\n  initial: (): BotSessionData => ({ contextMessages: [] }),\n  storage: getTursoAdapter(),\n}));`);
}

// 3. Replace all const session = getSession(...)
code = code.replace(/const session = getSession\([^)]+\);/g, 'const session = ctx.session;');
code = code.replace(/getSession\([^)]+\)/g, 'ctx.session'); // Just in case

fs.writeFileSync(p, code);
console.log('Refactor complete!');
