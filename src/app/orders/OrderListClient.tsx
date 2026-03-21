'use client';

import { useState } from 'react';
import { updateOrderStatus, deleteOrder } from '../actions/orders';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { timeAgo } from '@/lib/utils';
import Link from 'next/link';

export default function OrderListClient({ initialOrders }: { initialOrders: any[] }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [orders, setOrders] = useState(initialOrders);
  const [activeTab, setActiveTab] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const tabs = ['Semua', 'pending', 'processing', 'shipped', 'completed', 'cancelled'];

  const filteredOrders = orders.filter(o => activeTab === 'Semua' || o.status === activeTab);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // Optimistic
    const oldStatus = orders.find(o => o.id === orderId)?.status;
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    const res = await updateOrderStatus(orderId, newStatus);
    if (!res.success) {
      showToast(res.error || 'Gagal mengubah status', 'error');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: oldStatus } : o));
    } else {
      showToast('Status diperbarui', 'success');
    }
  };

  const handleDelete = async (orderId: string, orderNumber: string) => {
    const ok = await confirm({ title: '🗑️ Hapus Pesanan', message: `Yakin hapus pesanan ${orderNumber}? Aksi ini tidak bisa dibatalkan.`, confirmText: 'Hapus', danger: true });
    if (!ok) return;
    const res = await deleteOrder(orderId);
    if (res.success) {
      showToast('Pesanan dihapus', 'success');
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } else {
      showToast(res.error || 'Gagal menghapus', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="badge badge-warning">Menunggu</span>;
      case 'processing': return <span className="badge badge-info">Diproses</span>;
      case 'shipped': return <span className="badge badge-primary">Dikirim</span>;
      case 'completed': return <span className="badge badge-success">Selesai</span>;
      case 'cancelled': return <span className="badge badge-danger">Dibatalkan</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-[rgba(var(--border),0.5)] pb-2 overflow-x-auto mobile-scroll-x">
        {tabs.map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`btn touch-target ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
            style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="glass-card desktop-only-table mobile-hidden" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(var(--border), 0.5)', background: 'rgba(var(--surface-hover), 0.3)' }}>
                <th style={{ padding: '1rem' }}>No. Order / Waktu</th>
                <th style={{ padding: '1rem' }}>Pelanggan</th>
                <th style={{ padding: '1rem' }}>Platform</th>
                <th style={{ padding: '1rem' }}>Total</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '4rem', textAlign: 'center' }}>
                    <div className="flex flex-col items-center gap-2 text-muted">
                      <span className="text-3xl opacity-50">📋</span>
                      <p className="m-0 font-medium">Belum ada pesanan ditemukan</p>
                      <span className="text-xs">Ubah filter atau buat pesanan baru.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                currentOrders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid rgba(var(--border), 0.2)' }} className="hover-bg">
                    <td style={{ padding: '1rem' }}>
                      <div className="flex flex-col">
                        <span style={{ fontWeight: 500 }}>{order.orderNumber}</span>
                        {order.createdAt && <span className="text-xs text-muted">{timeAgo(order.createdAt)}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>{order.customerName}</td>
                    <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{order.platform}</td>
                    <td style={{ padding: '1rem' }}>{order.totalPrice ? `Rp ${order.totalPrice.toLocaleString('id-ID')}` : '-'}</td>
                    <td style={{ padding: '1rem' }}>{getStatusBadge(order.status)}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <select 
                        className="input-field" 
                        style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.85rem', textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/orders/${order.id}`} className="btn-ghost" style={{ textDecoration: 'none' }}>👁️</Link>
                        <button onClick={() => handleDelete(order.id, order.orderNumber)} className="btn-icon-danger">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t" style={{ borderColor: 'rgba(var(--border), 0.4)' }}>
            <span className="text-sm text-muted">Hal {currentPage} / {totalPages}</span>
            <div className="flex gap-2">
              <button className="btn btn-outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '0.4rem 0.8rem' }}>←</button>
              <button className="btn btn-outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '0.4rem 0.8rem' }}>→</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card List View */}
      <div className="mobile-card-list desktop-hidden">
        {currentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-muted gap-2 text-center" style={{ minHeight: '20vh' }}>
            <span className="text-4xl opacity-50">📋</span>
            <span className="font-medium text-sm">Belum ada pesanan berjalan</span>
          </div>
        ) : (
          currentOrders.map(order => (
            <div key={order.id} className="mobile-card-item">
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{order.orderNumber}</span>
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>{order.customerName}</span>
                  {order.createdAt && <span className="text-xs text-muted mt-1">🕒 {timeAgo(order.createdAt)}</span>}
                </div>
                <div>{getStatusBadge(order.status)}</div>
              </div>
              
              <div className="flex justify-between items-center text-sm pt-2" style={{ borderTop: '1px dotted rgba(var(--border), 0.5)' }}>
                <span className="text-muted" style={{ textTransform: 'capitalize' }}>Platform: {order.platform}</span>
                <span style={{ fontWeight: 600 }}>{order.totalPrice ? `Rp ${order.totalPrice.toLocaleString('id-ID')}` : '-'}</span>
              </div>
              
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(var(--border), 0.3)' }}>
                <select 
                  className="input-field touch-target" 
                  style={{ width: '100%', padding: '0.5rem' }}
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                >
                  <option value="pending">⏳ Pending</option>
                  <option value="processing">⚙️ Processing</option>
                  <option value="shipped">📦 Shipped</option>
                  <option value="completed">✅ Completed</option>
                  <option value="cancelled">❌ Cancelled</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
