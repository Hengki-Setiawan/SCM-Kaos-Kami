import { db } from '@/db';
import { categories } from '@/db/schema';
import NewProductForm from './NewProductForm';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tambah Produk Baru' };

export default async function NewProductPage() {
  const allCategories = await db.select().from(categories);

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
      <div className="flex justify-between items-center">
        <div>
          <h1>➕ Tambah Produk Baru</h1>
          <p className="text-muted text-sm">Daftarkan SKU baru ke inventori gudang.</p>
        </div>
        <Link href="/stock" className="btn btn-outline">← Kembali</Link>
      </div>

      <div className="glass-card">
        <NewProductForm categories={allCategories} />
      </div>
    </div>
  );
}
