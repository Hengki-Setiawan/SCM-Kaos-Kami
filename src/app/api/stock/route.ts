import { NextResponse } from 'next/server';
import { db } from '@/db';
import { products, categories } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
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

    return NextResponse.json({ success: true, data: allProducts });
  } catch (error: any) {
    console.error('API Stock Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
