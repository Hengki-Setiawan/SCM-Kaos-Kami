import { db } from '@/db';
import { orders } from '@/db/schema';
import { desc } from 'drizzle-orm';
import Link from 'next/link';
import OrderListClient from './OrderListClient';

export default async function OrdersPage() {
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Riwayat Pesanan</h1>
          <p className="text-muted">Kelola pesanan pelanggan dan proses pengiriman.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/orders/scan" className="btn btn-outline" style={{ textDecoration: 'none' }}>📸 Scan Resi</Link>
          <Link href="/orders/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>+ Pesanan Baru</Link>
        </div>
      </div>

      <OrderListClient initialOrders={allOrders} />
    </div>
  );
}
