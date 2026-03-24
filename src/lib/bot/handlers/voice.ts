import { InlineKeyboard } from 'grammy';
import { db } from '@/db';
import { products } from '@/db/schema';
import { like, or } from 'drizzle-orm';
import { Groq } from 'groq-sdk';
import { followUpGeneral } from '@/lib/bot/keyboards';
import { parseAIIntent } from '@/lib/ai-actions';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function handleVoiceMsg(ctx: any) {
  try {
    await ctx.reply('🎙️ *Sedang mendengarkan pesan suara...*', { parse_mode: 'Markdown' });

    const file = await ctx.api.getFile(ctx.message.voice.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    
    const voiceResponse = await fetch(fileUrl);
    const voiceBuffer = await voiceResponse.arrayBuffer();

    const audioFile = new File([voiceBuffer], 'voice.ogg', { type: 'audio/ogg' });
    
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: 'id',
      response_format: 'json',
    });

    const transcript = (transcription as any).text || '';

    if (!transcript || transcript.trim().length === 0) {
      await ctx.reply('❌ Tidak dapat mengenali suara.', { reply_markup: followUpGeneral });
      return;
    }

    await ctx.reply(`🎙️ *Transkrip:*\n_"${transcript.trim()}"_\n\n⏳ Sedang memproses perintah...`, { parse_mode: 'Markdown' });

    const session = ctx.session;
    session.contextMessages.push({ role: 'user', content: `[VOICE] ${transcript.trim()}` });
    if (session.contextMessages.length > 10) session.contextMessages = session.contextMessages.slice(-10);

    const actionIntent = await parseAIIntent(transcript.trim(), session.contextMessages);

    const NON_PRODUCT_ACTIONS = ['CREATE_CATEGORY', 'DELETE_CATEGORY', 'CREATE_SUPPLIER', 'DELETE_SUPPLIER', 'CREATE_ORDER', 'DELETE_ORDER', 'UPDATE_ORDER_STATUS'];

    if (actionIntent && actionIntent.action === 'LOG_EXPENSE') {
      session.pendingAction = actionIntent;
      const confirmKeyboard = new InlineKeyboard()
        .text('✅ Ya, Catat', 'confirm_action')
        .text('❌ Batalkan', 'cancel_action');
      await ctx.reply(`💸 *Catat Pengeluaran dari Suara*\n\n📝 ${actionIntent.title}\n💰 Rp ${new Intl.NumberFormat('id-ID').format(actionIntent.qty || 0)}\n📂 ${actionIntent.category || 'operasional'}\n\nLanjutkan?`, { parse_mode: 'Markdown', reply_markup: confirmKeyboard });
      return;
    }

    if (actionIntent && NON_PRODUCT_ACTIONS.includes(actionIntent.action)) {
      session.pendingAction = actionIntent;
      const confirmKeyboard = new InlineKeyboard()
        .text('✅ Ya, Lanjutkan', 'confirm_action')
        .text('❌ Batalkan', 'cancel_action');
      await ctx.reply(`🎙️ *Perintah Suara*\n\n📌 Aksi: \`${actionIntent.action}\`\n${actionIntent.name ? `📝 Nama: ${actionIntent.name}` : ''}${actionIntent.sku ? `📦 Produk: ${actionIntent.sku}` : ''}\n\nLanjutkan?`, { parse_mode: 'Markdown', reply_markup: confirmKeyboard });
      return;
    }

    if (actionIntent && actionIntent.action !== 'CHAT') {
      const searchKey = actionIntent.sku || '';
      const p = searchKey ? await db.select().from(products)
        .where(or(
          like(products.sku, `%${searchKey}%`),
          like(products.name, `%${searchKey}%`)
        )).limit(1).then(res => res[0]) : null;

      if (p) {
        session.pendingAction = actionIntent;
        const confirmKeyboard = new InlineKeyboard()
          .text('✅ Ya, Lanjutkan', 'confirm_action')
          .text('❌ Batalkan', 'cancel_action');
        await ctx.reply(`🎙️ *Perintah Suara*\n\n📌 Aksi: \`${actionIntent.action}\`\n📦 Produk: *${p.name}*\n🔢 Qty: ${actionIntent.qty || '-'}\n\nLanjutkan?`, { parse_mode: 'Markdown', reply_markup: confirmKeyboard });
        return;
      }
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Anda asisten AI SCM Kaos Kami. Jawab singkat dan ramah dalam bahasa Indonesia.' },
        ...session.contextMessages.slice(-5).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiReply = chatCompletion.choices[0]?.message?.content || 'Maaf, saya tidak mengerti pesan suara tersebut.';
    session.contextMessages.push({ role: 'assistant', content: aiReply });
    await ctx.reply(aiReply, { parse_mode: 'Markdown', reply_markup: followUpGeneral });

  } catch (error: any) {
    console.error('Voice Bot Error:', error);
    await ctx.reply('❌ Gagal memproses pesan suara.', { reply_markup: followUpGeneral });
  }
}
