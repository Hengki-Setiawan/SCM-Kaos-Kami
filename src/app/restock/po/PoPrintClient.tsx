'use client';

import { useEffect, useState } from 'react';

export default function PoPrintClient({ items }: { items: any[] }) {
  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  
  const poNumber = `PO-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000)}`;

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (items.length > 0) {
      setLoadingAi(true);
      fetch('/api/stock/low-stock/ai-summary')
        .then(res => res.json())
        .then(data => {
          if (data.success) setAiSummary(data.aiSummary);
        })
        .catch(err => console.error('Failed to fetch AI summary:', err))
        .finally(() => setLoadingAi(false));
    }
  }, [items]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      {/* Hide this action bar when printing */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; padding: 0; }
        }
      `}} />

      <div className="no-print flex justify-between items-center mb-8 p-4 bg-[rgba(var(--primary),0.1)] rounded-lg">
        <p style={{ color: 'rgb(var(--primary))', fontWeight: 'bold' }}>📄 Pratinjau Surat Pesanan (PO)</p>
        <button 
          onClick={() => window.print()}
          className="btn btn-primary"
          style={{ padding: '0.5rem 1.5rem', background: 'rgb(var(--primary))', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          Cetak PDF / Print
        </button>
      </div>

      {loadingAi ? (
        <div className="no-print mb-8 p-4 border border-[rgba(var(--primary),0.2)] rounded-lg flex gap-3 text-muted bg-[rgba(var(--primary),0.02)]">
          <span className="animate-spin text-primary">⚙️</span>
          <span>AI Supply Chain sedang menyusun rekomendasi pengadaan...</span>
        </div>
      ) : aiSummary ? (
        <div className="no-print mb-8 p-5 border-l-4 border-l-[rgb(var(--primary))] bg-[rgba(var(--primary),0.05)] rounded-lg" style={{ color: 'rgb(var(--foreground))' }}>
          <div className="flex items-center gap-2 mb-3">
             <span className="text-primary text-xl">🤖</span>
             <h3 className="font-bold text-lg m-0">AI Restock Advisor</h3>
          </div>
          <div dangerouslySetInnerHTML={{ __html: aiSummary }} className="text-sm font-medium opacity-90 leading-relaxed" />
        </div>
      ) : null}

      {/* PO Letterhead */}
      <div style={{ borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', color: '#000' }}>KAOS KAMI</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#555', fontSize: '0.9rem' }}>Jl. SCM Digital No. 1, Makassar, Indonesia</p>
          <p style={{ margin: 0, color: '#555', fontSize: '0.9rem' }}>Telp: 0812-3456-7890 | Email: po@kaoskami.com</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>PURCHASE ORDER</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#555' }}><strong>No. PO:</strong> {poNumber}</p>
          <p style={{ margin: 0, color: '#555' }}><strong>Tanggal:</strong> {currentDate}</p>
        </div>
      </div>

      {/* PO Body */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Daftar Kebutuhan Barang (Low Stock)</h3>
        
        {items.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', background: '#f9f9f9', border: '1px dashed #ccc' }}>
            Saat ini semua stok dalam batas aman. Tidak ada barang yang perlu dipesan.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #333' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', width: '5%' }}>No.</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', width: '20%' }}>Kategori</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', width: '45%' }}>Deskripsi Barang / SKU</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', width: '15%' }}>Kondisi Stok</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', width: '15%' }}>Qty Pesan</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                // Rekomendasi pesanan: 2x minStock atau minimal 10
                const orderQty = Math.max(item.minStock * 2, 10);
                
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '0.75rem', textAlign: 'left' }}>{idx + 1}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'left' }}>{item.categoryName || '-'}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'left' }}>
                      <strong>{item.name}</strong><br/>
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>SKU: {item.sku} | {item.color} - {item.size}</span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: 'red' }}>
                      {item.currentStock} / {item.minStock}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
                      {orderQty} pcs
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Signature Section */}
      <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'center', width: '200px' }}>
          <p style={{ margin: '0 0 4rem 0' }}>Hormat Kami,</p>
          <div style={{ borderBottom: '1px solid #000', marginBottom: '0.5rem' }}></div>
          <p style={{ margin: 0, fontWeight: 'bold' }}>Manajer Pengadaan</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#555' }}>Kaos Kami SCM</p>
        </div>
      </div>
    </div>
  );
}
