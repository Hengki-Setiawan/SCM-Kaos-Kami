import { db } from '@/db';
import { products, categories } from '@/db/schema';
import { eq } from 'drizzle-orm';
import NewOrderForm from './NewOrderForm';
import { ClipboardList } from 'lucide-react';

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ name?: string; platform?: string }> }) {
  const sp = await searchParams;
  const allProducts = await db.select({
    id: products.id,
    name: products.name,
    sku: products.sku,
    color: products.color,
    size: products.size,
    currentStock: products.currentStock,
    unitPrice: products.unitPrice,
    categorySlug: categories.slug
  })
  .from(products)
  .leftJoin(categories, eq(products.categoryId, categories.id));

  // Filter products that make sense to be ordered directly
  const orderableProducts = allProducts.filter(p => 
    p.categorySlug === 'baju-jadi' || 
    p.categorySlug === 'dtf-print' || 
    p.categorySlug === 'aksesoris-jadi'
  );

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="flex items-center gap-2"><ClipboardList size={28} /> Pesanan Baru</h1>
          <p className="text-muted">Buat pesanan baru. Stok produk utama (baju jadi, DTF, dll) akan otomatis berkurang.</p>
        </div>
        <a href="/orders" className="btn btn-outline" style={{ textDecoration: 'none' }}>Batal</a>
      </div>

      <div className="glass-card">
        <NewOrderForm products={orderableProducts} initialCustomerName={sp?.name || ''} initialPlatform={sp?.platform || ''} />
      </div>
    </div>
  );
}
