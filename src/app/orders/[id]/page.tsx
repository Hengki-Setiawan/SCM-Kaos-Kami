import { db } from '@/db';
import { orders, orderItems, products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import OrderDetailClient from './OrderDetailClient';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const orderData = await db.select().from(orders).where(eq(orders.id, id));
  if (orderData.length === 0) return { title: 'Pesanan Tidak Ditemukan' };

  return {
    title: `Pesanan ${orderData[0].orderNumber} - ${orderData[0].customerName}`,
    description: `Tracking pesanan ${orderData[0].orderNumber} atas nama ${orderData[0].customerName}. Status saat ini: ${orderData[0].status}. Total: Rp ${orderData[0].totalPrice?.toLocaleString('id-ID')}`,
  };
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const orderData = await db.select().from(orders).where(eq(orders.id, id));
  if (orderData.length === 0) return notFound();

  const order = orderData[0];

  const items = await db.select({
    id: orderItems.id,
    quantity: orderItems.quantity,
    unitPrice: orderItems.unitPrice,
    productName: products.name,
    productSku: products.sku
  })
  .from(orderItems)
  .leftJoin(products, eq(orderItems.productId, products.id))
  .where(eq(orderItems.orderId, id));

  return <OrderDetailClient order={order} items={items} />;
}
