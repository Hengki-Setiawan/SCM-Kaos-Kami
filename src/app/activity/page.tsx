'use client';

import { useState, useEffect } from 'react';
import { getStockMovements } from '../actions/stock';

export default function ActivityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const res = await fetch('/api/activity');
      const data = await res.json();
      setLogs(data.data || []);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'IN': return <span className="badge badge-success">MASUK</span>;
      case 'OUT': return <span className="badge badge-warning">KELUAR</span>;
      case 'ADJUSTMENT': return <span className="badge badge-info">ADJUSTMENT</span>;
      default: return <span className="badge">{type}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div>
        <h1>🕵️ Jejak Audit Stok</h1>
        <p className="text-muted text-sm">Transparansi penuh atas setiap perubahan stok barang di gudang.</p>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(var(--border), 0.5)', background: 'rgba(var(--surface-hover), 0.3)' }}>
                <th style={{ padding: '1rem' }}>Waktu</th>
                <th style={{ padding: '1rem' }}>Produk / SKU</th>
                <th style={{ padding: '1rem' }}>Tipe</th>
                <th style={{ padding: '1rem' }}>Qty</th>
                <th style={{ padding: '1rem' }}>Alasan / Referensi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '4rem', textAlign: 'center' }}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(var(--primary))] mx-auto"></div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '4rem', textAlign: 'center' }} className="text-muted">
                    Tidak ada catatan aktivitas.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(var(--border), 0.1)' }} className="zebra-row">
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }} className="text-muted">
                      {new Date(log.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div className="flex flex-col">
                        <span className="font-semibold">{log.productName}</span>
                        <span className="text-xs text-muted">{log.productSku}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {getTypeBadge(log.type)}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 700 }}>
                      {log.type === 'OUT' ? '-' : '+'}{log.quantity}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      <div className="flex flex-col">
                        <span>{log.reason}</span>
                        {log.referenceId && <span className="text-xs text-muted italic">Ref: #{log.referenceId}</span>}
                      </div>
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
