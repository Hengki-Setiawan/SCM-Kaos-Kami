import { db } from '@/db';
import { products, categories } from '@/db/schema';
import { eq } from 'drizzle-orm';
import StockTableClient from './StockTableClient';
import Link from 'next/link';
import { Package, Plus, RefreshCcw, FileText } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Manajemen Stok' };

export default async function StockPage() {
  const allProducts = await db.select({
    id: products.id,
    categoryId: products.categoryId,
    categoryName: categories.name,
    name: products.name,
    sku: products.sku,
    color: products.color,
    size: products.size,
    material: products.material,
    currentStock: products.currentStock,
    minStock: products.minStock,
    unitPrice: products.unitPrice,
  })
  .from(products)
  .leftJoin(categories, eq(products.categoryId, categories.id));

  const allCategories = await db.select().from(categories);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start mobile-col mobile-gap-2">
        <div>
          <h1 className="flex items-center gap-2"><Package size={24} /> Manajemen Stok</h1>
          <p className="text-muted text-sm">Kelola dan pantau stok dari semua kategori.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/stock/new" className="btn btn-primary touch-target" style={{ textDecoration: 'none' }}>
            <Plus size={16} /> Produk Baru
          </Link>
        </div>
      </div>

      <StockTableClient initialProducts={allProducts} categories={allCategories} />
    </div>
  );
}

