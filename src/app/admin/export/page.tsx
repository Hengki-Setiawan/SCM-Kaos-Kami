import { Download, FileText, Database, Package, ShoppingCart, DollarSign } from 'lucide-react';

export default function ExportPage() {
  const exportItems = [
    { id: 'products', name: 'Database Stok Produk', icon: Package, color: 'rgb(var(--primary))', desc: 'Seluruh SKU, level stok, dan harga jual produk.' },
    { id: 'orders', name: 'Riwayat Pesanan', icon: ShoppingCart, color: 'rgb(var(--accent))', desc: 'Data transaksi pelanggan, status pengiriman, dan omzet.' },
    { id: 'finance', name: 'Laporan Pengeluaran', icon: DollarSign, color: 'rgb(var(--danger))', desc: 'Data biaya operasional, gaji, dan pembelian bahan baku.' },
  ];

  const handleDownload = (type: string) => {
    window.open(`/api/export?type=${type}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-white/5">
          <Database size={32} className="text-muted" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Export Center</h1>
          <p className="text-muted">Unduh seluruh data sistem dalam format CSV untuk kebutuhan audit & laporan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportItems.map((item) => (
          <div key={item.id} className="glass-card flex flex-col justify-between hover:scale-[1.02] transition-transform">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="p-2 rounded-lg" 
                  style={{ background: `${item.color}22`, color: item.color }}
                >
                  <item.icon size={20} />
                </div>
                <h3 className="font-bold">{item.name}</h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
            </div>
            
            <button 
              onClick={() => handleDownload(item.id)}
              className="btn btn-outline mt-6 flex items-center justify-center gap-2 w-full"
            >
              <Download size={16} /> Unduh CSV (.csv)
            </button>
          </div>
        ))}

        <div className="glass-card flex flex-col items-center justify-center text-center border-dashed border-2 border-white/5 opacity-60">
           <FileText size={48} className="text-muted mb-4" />
           <p className="text-sm font-medium">Coming Soon</p>
           <p className="text-[10px] text-muted px-8">Laporan Jurnal Akuntansi Otomatis (PDF)</p>
        </div>
      </div>
      
      <div className="mt-12 p-6 glass-card bg-amber-500/5 border-amber-500/20">
         <h4 className="text-sm font-bold text-amber-500 mb-2 flex items-center gap-2">⚠️ Catatan Penggunaan</h4>
         <ul className="text-xs text-muted list-disc ml-4 flex flex-col gap-2">
            <li>Gunakan data ini untuk rekonsiliasi stok di akhir bulan.</li>
            <li>Data yang diunduh adalah data real-time saat ini.</li>
            <li>Hanya Admin yang memiliki akses ke halaman ini.</li>
         </ul>
      </div>
    </div>
  );
}
