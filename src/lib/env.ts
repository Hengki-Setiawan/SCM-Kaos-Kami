const requiredVars = [
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'GROQ_API_KEY',
] as const;

const optionalVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'TELEGRAM_BOT_TOKEN',
] as const;

export function validateEnv() {
  const missing: string[] = [];
  for (const v of requiredVars) {
    if (!process.env[v]) missing.push(v);
  }
  if (missing.length > 0) {
    throw new Error(
      `❌ Environment variables tidak lengkap!\n` +
      `Missing: ${missing.join(', ')}\n` +
      `Pastikan file .env.local sudah dikonfigurasi dengan benar.`
    );
  }
}

export function getEnv() {
  return {
    tursoUrl: process.env.TURSO_DATABASE_URL!,
    tursoToken: process.env.TURSO_AUTH_TOKEN!,
    groqKey: process.env.GROQ_API_KEY!,
    cloudinaryName: process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryKey: process.env.CLOUDINARY_API_KEY || '',
    cloudinarySecret: process.env.CLOUDINARY_API_SECRET || '',
    telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  };
}
