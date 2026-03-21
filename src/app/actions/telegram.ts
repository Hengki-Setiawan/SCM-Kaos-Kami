'use server';

export async function setTelegramWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://scm-kaos-kami.vercel.app';
  
  if (!token) return { success: false, error: 'TELEGRAM_BOT_TOKEN tidak ditemukan' };

  try {
    const webhookUrl = `${appUrl}/api/bot`;
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
    const data = await response.json();

    if (data.ok) {
      return { success: true, message: 'Webhook berhasil diatur!' };
    } else {
      return { success: false, error: data.description || 'Gagal mengatur webhook' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
