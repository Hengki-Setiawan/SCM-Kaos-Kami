import { db } from '@/db';
import { orders, orderItems, products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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

  const statusColor: Record<string, string> = {
    pending: 'rgb(var(--warning))',
    processing: 'rgb(var(--info))',
    shipped: 'rgb(var(--primary))',
    completed: 'rgb(var(--success))',
    cancelled: 'rgb(var(--danger))'
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1>Detail Pesanan</h1>
          <p className="text-muted">#{order.orderNumber}</p>
        </div>
        <Link href="/orders" className="btn btn-outline">← Kembali</Link>
      </div>

      {/* Order Info */}
      <div className="glass-card grid grid-cols-2 gap-4">
        <div>
          <span className="text-xs text-muted block">Nama Pembeli</span>
          <span className="font-semibold">{order.customerName}</span>
        </div>
        <div>
          <span className="text-xs text-muted block">Platform</span>
          <span className="font-semibold capitalize">{order.platform}</span>
        </div>
        <div>
          <span className="text-xs text-muted block">Status</span>
          <span className="font-bold capitalize" style={{ color: statusColor[order.status] || 'inherit' }}>
            {order.status}
          </span>
        </div>
        <div>
          <span className="text-xs text-muted block">Total Harga</span>
          <span className="font-semibold">Rp {new Intl.NumberFormat('id-ID').format(order.totalPrice || 0)}</span>
        </div>
        {order.notes && (
          <div className="col-span-2">
            <span className="text-xs text-muted block">Catatan</span>
            <span className="text-sm">{order.notes}</span>
          </div>
        )}
        <div>
          <span className="text-xs text-muted block">Dibuat</span>
          <span className="text-sm text-muted">{order.createdAt}</span>
        </div>
      </div>

      {/* Receipt Image */}
      {order.receiptImageUrl && (
        <div className="glass-card">
          <h3 className="mb-3">📸 Foto Resi</h3>
          <img src={order.receiptImageUrl} alt="Resi" className="rounded-lg max-w-full max-h-64 object-contain" />
          {order.receiptData && (
            <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: 'rgba(var(--primary),0.1)' }}>
              <strong>Data OCR:</strong>
              <pre className="mt-1 text-xs text-muted whitespace-pre-wrap">{order.receiptData}</pre>
            </div>
          )}
        </div>
      )}

      {/* Order Items */}
      <div className="glass-card">
        <h3 className="mb-4">📦 Item Pesanan</h3>
        <table className="table-auto w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[rgba(var(--border),0.5)]">
              <th className="p-3">Produk</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Harga</th>
              <th className="p-3">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[rgba(var(--border),0.2)]">
                <td className="p-3 font-semibold">{item.productName || '-'}</td>
                <td className="p-3 text-muted">{item.productSku || '-'}</td>
                <td className="p-3">{item.quantity}</td>
                <td className="p-3">Rp {new Intl.NumberFormat('id-ID').format(item.unitPrice)}</td>
                <td className="p-3 font-bold">Rp {new Intl.NumberFormat('id-ID').format(item.unitPrice * item.quantity)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted">Tidak ada item.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
