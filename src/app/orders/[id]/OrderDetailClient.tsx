'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { updateOrderStatus, deleteOrder, returnOrder } from '../../actions/orders';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';

export default function OrderDetailClient({ order: initialOrder, items }: { order: any; items: any[] }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [order, setOrder] = useState(initialOrder);

  const statusColor: Record<string, string> = {
    pending: 'rgb(var(--warning))', processing: 'rgb(var(--info))',
    shipped: 'rgb(var(--primary))', completed: 'rgb(var(--success))', cancelled: 'rgb(var(--danger))',
  };

  const handleStatusChange = async (newStatus: string) => {
    const old = order.status;
    setOrder((o: any) => ({ ...o, status: newStatus }));
    const res = await updateOrderStatus(order.id, newStatus);
    if (!res.success) {
      setOrder((o: any) => ({ ...o, status: old }));
      showToast(res.error || 'Gagal ubah status', 'error');
    } else {
      showToast(`Status diubah ke ${newStatus}`, 'success');
    }
  };

  const handleReturnAction = async () => {
    const ok = await confirm({
      title: '🔄 Proses Retur / Batal',
      message: `Yakin ingin membatalkan pesanan #${order.orderNumber} dan mengembalikan seluruh stok barang ke gudang?`,
      confirmText: 'Proses Retur Sekarang',
      danger: true
    });
    if (!ok) return;

    const res = await returnOrder(order.id);
    if (res.success) {
      showToast('Pesanan dibatalkan & Stok dikembalikan', 'success');
      setOrder((o: any) => ({ ...o, status: 'cancelled' }));
    } else {
      showToast(res.error || 'Gagal proses retur', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: '🗑️ Hapus Pesanan', message: `Hapus pesanan #${order.orderNumber}?`, confirmText: 'Hapus', danger: true });
    if (!ok) return;
    const res = await deleteOrder(order.id);
    if (res.success) { showToast('Pesanan dihapus', 'success'); window.location.href = '/orders'; }
    else showToast(res.error || 'Gagal menghapus', 'error');
  };

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .sidebar, .topbar, .bottom-nav, button { display: none !important; }
          body { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; }
          .glass-card { border: 1px solid #eee !important; box-shadow: none !important; margin-bottom: 20px !important; }
          .printable-label { 
            display: block !important;
            width: 100mm; 
            padding: 10mm; 
            border: 2px solid black; 
            font-family: monospace;
            margin: 0 auto;
          }
        }
      `}} />
      
      <div className="flex justify-between items-center mobile-col mobile-gap-2 no-print">
        <div>
          <h1>Detail Pesanan</h1>
          <p className="text-muted text-sm">#{order.orderNumber}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/orders" className="btn btn-outline" style={{ textDecoration: 'none' }}>← Kembali</Link>
          <button onClick={handlePrint} className="btn btn-primary">🖨️ Cetak Label</button>
          {order.status !== 'cancelled' && (
            <button onClick={handleReturnAction} className="btn btn-outline" style={{ borderColor: 'rgb(var(--danger))', color: 'rgb(var(--danger))' }}>🔄 Retur/Batal</button>
          )}
          <button onClick={handleDelete} className="btn btn-danger">🗑️ Hapus</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="glass-card">
            <h3 className="mb-4">📦 Daftar Item</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(var(--border), 0.5)' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Produk</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Jumlah</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(var(--border), 0.1)' }}>
                      <td style={{ padding: '0.75rem' }}>{item.productName}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        Rp {new Intl.NumberFormat('id-ID').format(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 'bold' }}>
                    <td colSpan={2} style={{ padding: '1rem', textAlign: 'right' }}>Total Tagihan:</td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: 'rgb(var(--primary))', fontSize: '1.1rem' }}>
                      Rp {new Intl.NumberFormat('id-ID').format(order.totalPrice)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {order.receiptUrl && (
            <div className="glass-card">
              <h3 className="mb-4">📸 Bukti Resi / Scan</h3>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden' }}>
                <Image 
                  src={order.receiptUrl} 
                  alt="Resi" 
                  fill 
                  style={{ objectFit: 'contain' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="glass-card">
            <h3 className="mb-4">👤 Informasi Pembeli</h3>
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-xs text-muted block">Nama Pelanggan</span>
                <span className="font-semibold">{order.customerName}</span>
              </div>
              <div>
                <span className="text-xs text-muted block">Platform</span>
                <span className="badge badge-info uppercase">{order.platform}</span>
              </div>
              <div>
                <span className="text-xs text-muted block">Tanggal Pesanan</span>
                <span>{new Date(order.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="mb-4">🚦 Status Pesanan</h3>
            <div className="flex flex-col gap-4">
              <div 
                className="text-center p-3 rounded-lg font-bold uppercase tracking-wider"
                style={{ background: `rgba(${statusColor[order.status].replace('rgb(', '').replace(')', '')}, 0.15)`, color: statusColor[order.status] }}
              >
                {order.status}
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted">Ubah Status:</span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(statusColor).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      disabled={order.status === s}
                      className={`btn ${order.status === s ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.4rem', fontSize: '0.7rem' }}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Area - ONLY VISIBLE DURING PRINT */}
      <div className="printable-label" style={{ display: 'none' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px dashed black', paddingBottom: '3mm', marginBottom: '3mm' }}>
          <h2 style={{ fontSize: '20pt', margin: '0 0 2mm 0' }}>KAOS KAMI</h2>
          <p style={{ margin: 0 }}>ORDER: #{order.orderNumber}</p>
        </div>
        <div style={{ marginBottom: '4mm' }}>
          <strong style={{ fontSize: '10pt' }}>KEPADA:</strong><br/>
          <span style={{ fontSize: '18pt', fontWeight: 'bold' }}>{order.customerName}</span>
        </div>
        <div style={{ marginBottom: '4mm', fontSize: '10pt' }}>
          <strong>PLATFORM:</strong> {order.platform.toUpperCase()}<br/>
          <strong>TANGGAL:</strong> {new Date().toLocaleDateString('id-ID')}
        </div>
        <div style={{ borderTop: '2px solid black', paddingTop: '2mm' }}>
          <strong style={{ fontSize: '10pt' }}>ISI PAKET:</strong><br/>
          {items.map(item => (
            <div key={item.id} style={{ fontSize: '11pt', marginBottom: '1mm' }}>
              - {item.productName} ({item.quantity}x)
            </div>
          ))}
        </div>
        <div style={{ marginTop: '10mm', textAlign: 'center', borderTop: '1px solid #ccc', paddingTop: '2mm' }}>
          <p style={{ fontSize: '9pt', margin: 0 }}>Terima kasih telah berbelanja di Kaos Kami!</p>
        </div>
      </div>
    </div>
  );
}
