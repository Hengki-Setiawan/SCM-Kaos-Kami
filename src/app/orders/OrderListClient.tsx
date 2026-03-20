'use client';

import { useState } from 'react';
import { updateOrderStatus } from '../actions/orders';

export default function OrderListClient({ initialOrders }: { initialOrders: any[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [activeTab, setActiveTab] = useState('Semua');

  const tabs = ['Semua', 'pending', 'processing', 'shipped', 'completed', 'cancelled'];

  const filteredOrders = orders.filter(o => activeTab === 'Semua' || o.status === activeTab);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // Optimistic
    const oldStatus = orders.find(o => o.id === orderId)?.status;
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    const res = await updateOrderStatus(orderId, newStatus);
    if (!res.success) {
      alert(res.error);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: oldStatus } : o));
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
                <th style={{ padding: '1rem' }}>No. Order</th>
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
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }} className="text-muted">
                    Tidak ada pesanan ditemukan.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid rgba(var(--border), 0.2)' }} className="hover-bg">
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{order.orderNumber}</td>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List View */}
      <div className="mobile-card-list desktop-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center text-muted p-4">Tidak ada pesanan ditemukan.</div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="mobile-card-item">
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{order.orderNumber}</span>
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>{order.customerName}</span>
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
