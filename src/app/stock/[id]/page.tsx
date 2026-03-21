import { db } from '@/db';
import { products, categories, stockMovements } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import ProductDetailClient from './ProductDetailClient';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Get Product
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) {
    notFound();
  }

  // 2. Get All Categories for Dropdown
  const allCategories = await db.select().from(categories);

  // 3. Get Stock Move History
  const history = await db.select().from(stockMovements)
    .where(eq(stockMovements.productId, id))
    .orderBy(desc(stockMovements.createdAt))
    .limit(10);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex gap-2 items-center mb-1">
            <Link href="/stock" className="text-muted" style={{ textDecoration: 'none' }}>← Kembali ke Stok</Link>
          </div>
          <h1>Detail Produk</h1>
        </div>
        <span className={`badge ${product.isActive ? 'badge-success' : 'badge-danger'}`}>
          {product.isActive ? 'Aktif' : 'Non-aktif'}
        </span>
      </div>

      <ProductDetailClient 
        initialProduct={product} 
        categories={allCategories} 
        history={history}
      />
    </div>
  );
}
