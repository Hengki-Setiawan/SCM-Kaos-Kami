import { NextResponse } from 'next/server';
import { db } from '@/db';
import { products, categories } from '@/db/schema';
import { eq, lte } from 'drizzle-orm';
import { pipeline } from '@/lib/ai-collab';
import { requireRole } from '@/lib/rbac';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(req: Request) {
  try {
    const roleCheck = await requireRole(['admin', 'manager', 'staff']);
    if (roleCheck) return roleCheck;

    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const { allowed } = checkRateLimit(`advisor:${ip}`, 5, 60000);
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const lowItems = await db.select({
      sku: products.sku,
      name: products.name,
      stock: products.currentStock,
      min: products.minStock,
      catId: products.categoryId
    }).from(products)
    .where(lte(products.currentStock, products.minStock));

    if (lowItems.length === 0) {
      return NextResponse.json({ success: true, aiSummary: '<div class="p-4 bg-[rgba(var(--success),0.1)] text-[rgb(var(--success))] rounded-lg">🟢 Semua stok dalam kondisi aman. Tidak ada prioritas restock saat ini.</div>' });
    }

    const cats = await db.select().from(categories);
    const dataToSend = lowItems.map(item => ({
       ...item,
       kategori: cats.find(c => c.id === item.catId)?.name || 'Unknown',
       suggestedQty: Math.max(item.min * 2, 10)
    }));

    const systemPrompt = `Anda adalah "AI Supply Chain Advisor" untuk SCM Kaos Kami.
Tugas Anda menganalisis daftar barang yang stoknya menipis (currentStock <= minStock) dan memberikan rekomendasi "Restock Plan".
Buat output HANYA berisi HTML ringkas (gunakan div, ul, li, strong, span dengan inline style sederhana atau Tailwind classes dasar seperti text-red-500) yang rapi dan profesional untuk langsung di-render.
Format yang harus ada:
1. Ringkasan Tingkat Bahaya (misal: "3 Produk Kritis!")
2. Prioritas utama yang harus dipesan (Highlight yang stoknya 0)
3. Saran strategi pengadaan.
Jangan gunakan markdown \`\`\`html, langsung hasilkan tag HTML-nya saja. Jadikan seprofesional mungkin dengan visual emoji secukupnya.`;

    const { content } = await pipeline({
       userMessage: 'Tolong buatkan Executive Summary & Recommendation untuk daftar barang low stock ini.',
       systemPrompt,
       dbData: dataToSend,
    });

    const cleanHTML = content?.replace(/```html|```/g, '').trim();

    return NextResponse.json({ success: true, aiSummary: cleanHTML });
  } catch(e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
