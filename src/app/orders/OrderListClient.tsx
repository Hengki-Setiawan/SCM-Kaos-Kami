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
      <div className="flex gap-2 border-b border-[rgba(var(--border),0.5)] pb-2 overflow-x-auto">
        {tabs.map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
            style={{ textTransform: 'capitalize' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
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
    </div>
  );
}
