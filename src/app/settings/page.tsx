import { db } from '@/db';
import { autoDeductRules, products, categories } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import AutoDeductClient from './AutoDeductClient';
import Link from 'next/link';

export default async function SettingsPage() {
  // 1. Ambil aturan aktif saat ini
  const rules = await db.select().from(autoDeductRules).where(eq(autoDeductRules.isActive, true));
  const activeRule = rules[0] || null;

  // 2. Ambil produk packaging
  const packagingCategories = await db.select().from(categories).where(inArray(categories.slug, ['alat', 'packaging', 'bahan-aksesoris']));
  const catIds = packagingCategories.map(c => c.id);

  let availableProducts: any[] = [];
  if (catIds.length > 0) {
    availableProducts = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      currentStock: products.currentStock
    }).from(products)
      .where(inArray(products.categoryId, catIds));
  }

  const currentItems = activeRule && activeRule.items ? JSON.parse(activeRule.items as string) : [];

  // 3. Ambil semua kategori
  const allCategories = await db.select().from(categories);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div>
        <h1>⚙️ Pengaturan Sistem</h1>
        <p className="text-muted">Kelola aturan otomatisasi, kategori, dan konfigurasi SCM Kaos Kami.</p>
      </div>

      {/* Profil Bisnis */}
      <div className="glass-card">
        <h2 style={{ fontSize: '1.25rem' }} className="mb-4">🏪 Profil Bisnis</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-muted block mb-1">Nama Brand</span>
            <span className="font-semibold text-lg">Kaos Kami</span>
          </div>
          <div>
            <span className="text-xs text-muted block mb-1">Admin</span>
            <span className="font-semibold">Hengki Setiawan</span>
          </div>
          <div>
            <span className="text-xs text-muted block mb-1">Telegram Bot</span>
            <span className="text-sm text-[rgb(var(--success))]">✅ Terhubung (@Enggriz)</span>
          </div>
          <div>
            <span className="text-xs text-muted block mb-1">Database</span>
            <span className="text-sm text-[rgb(var(--success))]">✅ Turso (libSQL)</span>
          </div>
        </div>
      </div>

      {/* Auto Deduct Rules */}
      <div className="glass-card">
        <h2 className="mb-4" style={{ fontSize: '1.25rem' }}>📦 Aturan Auto-Deduct Packaging</h2>
        <p className="text-sm text-muted mb-6">
          Item di bawah ini dikurangi otomatis setiap kali pesanan diubah ke status <strong>"Shipped"</strong>.
        </p>
        <AutoDeductClient 
          initialItems={currentItems} 
          availableProducts={availableProducts} 
          ruleId={activeRule?.id}
        />
      </div>

      {/* Kategori Management */}
      <div className="glass-card">
        <h2 className="mb-4" style={{ fontSize: '1.25rem' }}>🏷️ Kategori Produk ({allCategories.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {allCategories.map((cat) => (
            <div key={cat.id} className="p-3 rounded-lg flex items-center gap-2" style={{ background: 'rgba(var(--surface-hover), 0.3)' }}>
              <span className="text-xl">{cat.icon || '📁'}</span>
              <div>
                <span className="font-semibold text-sm">{cat.name}</span>
                <span className="block text-xs text-muted">{cat.slug}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Konektivitas */}
      <div className="glass-card">
        <h2 className="mb-4" style={{ fontSize: '1.25rem' }}>🔗 Status Koneksi Layanan</h2>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(var(--surface-hover), 0.3)' }}>
            <span>☁️ Cloudinary (Upload Gambar)</span>
            <span className="text-[rgb(var(--success))] text-sm font-semibold">✅ Aktif</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(var(--surface-hover), 0.3)' }}>
            <span>🤖 Groq AI (Chat + Vision)</span>
            <span className="text-[rgb(var(--success))] text-sm font-semibold">✅ Aktif</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(var(--surface-hover), 0.3)' }}>
            <span>📱 Telegram Bot Webhook</span>
            <span className="text-[rgb(var(--success))] text-sm font-semibold">✅ Aktif</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(var(--surface-hover), 0.3)' }}>
            <span>⏰ Cron Stock Alert</span>
            <span className="text-sm text-muted">/api/cron/stock-check</span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="glass-card">
        <h2 className="mb-4" style={{ fontSize: '1.25rem' }}>📎 Link Fitur Cepat</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/analysis" className="btn btn-outline text-sm w-full">📈 Analisis AI</Link>
          <Link href="/calculator" className="btn btn-outline text-sm w-full">🧮 Kalkulator</Link>
          <Link href="/history" className="btn btn-outline text-sm w-full">📜 Log Stok</Link>
          <Link href="/chat" className="btn btn-outline text-sm w-full">🤖 Chat AI</Link>
        </div>
      </div>
    </div>
  );
}
