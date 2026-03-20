import { db } from '@/db';
import { products, categories } from '@/db/schema';
import { eq } from 'drizzle-orm';
import StockTableClient from './StockTableClient';

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
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-start mobile-col mobile-gap-2 mb-4">
        <div>
          <h1>Manajemen Stok</h1>
          <p className="text-muted">Kelola dan pantau stok dari semua kategori.</p>
        </div>
        <div className="flex gap-2 mobile-col" style={{ width: '100%' }}>
          <button className="btn btn-primary touch-target" style={{ flex: 1 }}>+ Tambah Produk</button>
          <div className="flex gap-2 mobile-col" style={{ flex: 1 }}>
            <button className="btn btn-outline touch-target" style={{ flex: 1 }}>Restock Cepat</button>
            <a href="/restock/po" target="_blank" className="btn btn-outline touch-target" style={{ flex: 1, borderColor: 'rgb(var(--primary))', color: 'rgb(var(--primary))' }}>
              📄 Isi PO
            </a>
          </div>
        </div>
      </div>

      {/* Pass data to Client Component for interactivity (Tabs, Filtering, Inline Edit) */}
      <StockTableClient initialProducts={allProducts} categories={allCategories} />
    </div>
  );
}
