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
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Manajemen Stok</h1>
          <p className="text-muted">Kelola dan pantau stok dari semua kategori.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary">+ Tambah Produk</button>
          <button className="btn btn-outline">Restock Cepat</button>
        </div>
      </div>

      {/* Pass data to Client Component for interactivity (Tabs, Filtering, Inline Edit) */}
      <StockTableClient initialProducts={allProducts} categories={allCategories} />
    </div>
  );
}
