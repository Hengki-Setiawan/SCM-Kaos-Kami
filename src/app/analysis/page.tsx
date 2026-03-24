'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, Package } from 'lucide-react';

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'low-stock'>('overview');
  const [analysis, setAnalysis] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPredicting, setIsPredicting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const res = await fetch('/api/analysis');
        const data = await res.json();
        
        if (data.success) {
          setAnalysis(data.analysis);
        } else {
          setError(data.error || 'Gagal mengambil analisis');
        }
      } catch (err) {
        setError('Terjadi kesalahan jaringan.');
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchPredictions() {
      try {
        const res = await fetch('/api/analysis/predictive');
        const data = await res.json();
        if (data.success) {
          setPredictions(data.predictions);
        }
      } catch (err) {
        console.error('Failed to fetch predictions', err);
      } finally {
        setIsPredicting(false);
      }
    }

    async function fetchLowStock() {
      try {
        const res = await fetch('/api/stock/low-stock');
        const data = await res.json();
        if (data.success) setLowStockItems(data.items);
      } catch (err) {
        console.error('Failed to fetch low stock', err);
      }
    }

    fetchAnalysis();
    fetchPredictions();
    fetchLowStock();
  }, []);

  const generateAISummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const res = await fetch('/api/stock/low-stock/ai-summary');
      const data = await res.json();
      if (data.success) {
        setAiSummary(data.summary);
      } else {
        alert('Gagal membuat rekomendasi AI: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat memanggil AI.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-4xl animate-bounce">🤖</div>
        <p className="text-muted">AI sedang menganalisis ribuan data gudang Anda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center border border-[rgba(var(--danger),0.5)] rounded-2xl p-8 bg-[rgba(var(--danger),0.1)] text-[rgb(var(--danger))]">
        <h3 className="mb-2">Gagal Menganalisis</h3>
        <p>{error}</p>
        <button className="btn btn-outline mt-4" onClick={() => window.location.reload()}>Coba Lagi</button>
      </div>
    );
  }

  // Visual Helper for Score
  let scoreColor = 'rgb(var(--success))';
  if (analysis.healthScore < 75) scoreColor = 'rgb(var(--warning))';
  if (analysis.healthScore < 50) scoreColor = 'rgb(var(--danger))';

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div>
        <h1>Analisis Kesehatan Gudang (AI)</h1>
        <p className="text-muted">Laporan instan berdasarkan kondisi stok SCM Kaos Kami saat ini.</p>
      </div>

      <div className="flex gap-4 border-b border-[rgba(var(--border),0.5)] mb-4 overflow-x-auto custom-scrollbar">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`pb-2 px-4 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-b-2 border-[rgb(var(--primary))] text-[rgb(var(--primary))] font-bold' : 'text-muted hover:text-[rgb(var(--foreground))]'}`}
        >
          Overview (BI Analisis)
        </button>
        <button 
          onClick={() => setActiveTab('low-stock')}
          className={`pb-2 px-4 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'low-stock' ? 'border-b-2 border-[rgb(var(--danger))] text-[rgb(var(--danger))] font-bold' : 'text-muted hover:text-[rgb(var(--foreground))]'}`}
        >
          Low Stock Deficit
          <span className="bg-[rgba(var(--danger),0.1)] text-[rgb(var(--danger))] py-0.5 px-2 rounded-full text-xs font-bold">{lowStockItems.length}</span>
        </button>
      </div>

      {analysis && activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in duration-300">
          
          {/* Main Score Card */}
          <div className="glass-card flex flex-col items-center justify-center text-center p-8 md:col-span-1">
            <h3 className="text-muted text-sm mb-4">Skor Kesehatan Gudang</h3>
            <div 
               className="w-32 h-32 rounded-full border-8 flex items-center justify-center text-4xl font-black mb-4"
               style={{ borderColor: scoreColor, color: scoreColor }}
            >
              {analysis.healthScore}
            </div>
            <p className="text-sm font-medium">{analysis.healthScore >= 80 ? 'Sangat Sehat ✅' : analysis.healthScore >= 50 ? 'Perlu Perhatian ⚠️' : 'Kritis 🛑'}</p>
          </div>

          {/* AI Summary */}
          <div className="glass-card flex flex-col gap-4 md:col-span-2">
            <h3>Executive Summary</h3>
            <p className="text-muted leading-relaxed">{analysis.summary}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-[rgba(var(--border),0.5)] mt-4 pt-4 gap-4">
               <div>
                 <span className="text-xs text-muted block">Total Jenis Barang</span>
                 <span className="font-bold text-lg">{analysis.stats?.totalItems || 0} SKU</span>
               </div>
               <div>
                 <span className="text-xs text-muted block">Stok Menipis</span>
                 <span className="font-bold text-lg text-[rgb(var(--danger))]">{analysis.stats?.lowStockCount || 0} Barang</span>
               </div>
               <div>
                 <span className="text-xs text-muted block">Nilai Aset (Est)</span>
                 <span className="font-bold text-lg">Rp {Intl.NumberFormat('id-ID').format(analysis.stats?.totalValue || 0)}</span>
               </div>
            </div>
          </div>

          {/* Action Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-3">
            <div className="glass-card" style={{ borderTop: '4px solid rgb(var(--danger))' }}>
              <h3 className="mb-4 text-[rgb(var(--danger))]">🔥 Action Mendasak (Harus Beli)</h3>
              <ul className="flex flex-col gap-3 list-none p-0 m-0">
                {analysis.actionItems?.map((item: string, idx: number) => (
                  <li key={idx} className="flex gap-2">
                    <span>➡️</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
                {(!analysis.actionItems || analysis.actionItems.length === 0) && (
                  <span className="text-sm text-muted">Semua aman, tidak ada aksi mendesak.</span>
                )}
              </ul>
            </div>

            <div className="glass-card" style={{ borderTop: '4px solid rgb(var(--primary))' }}>
              <h3 className="mb-4 text-[rgb(var(--primary))]">💡 AI Insights (Pola & Strategi)</h3>
              <ul className="flex flex-col gap-3 list-none p-0 m-0">
                {analysis.insights?.map((insight: string, idx: number) => (
                  <li key={idx} className="flex gap-2 text-sm bg-[rgba(var(--surface-hover),0.3)] p-3 rounded-lg">
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Predictive AI Section */}
          <div className="glass-card md:col-span-3" style={{ borderTop: '4px solid rgb(var(--primary))' }}>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h3 className="text-[rgb(var(--primary))]">🔮 Prediksi Kehabisan Stok (AI)</h3>
              {isPredicting && <span className="text-muted text-sm animate-pulse">Memproses 30 hari data terakhir...</span>}
            </div>
            
            {!isPredicting && predictions.length === 0 ? (
              <p className="text-muted text-sm text-center p-4">Belum ada cukup data penjualan 30 hari terakhir untuk diprediksi.</p>
            ) : !isPredicting && predictions.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(var(--surface-hover), 0.3)' }}>
                      <th style={{ padding: '0.75rem' }}>Produk</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Kecepatan Laku (Hari)</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Sisa Hari (Estimasi)</th>
                      <th style={{ padding: '0.75rem' }}>Rekomendasi AI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((p, idx) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(var(--border), 0.2)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 500 }}>{p.name}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>~{p.velocityPerDay.toFixed(1)} pcs</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: p.estimatedDaysLeft < 7 ? 'rgb(var(--danger))' : p.estimatedDaysLeft < 14 ? 'rgb(var(--warning))' : 'rgb(var(--success))' }}>
                          {p.estimatedDaysLeft > 365 ? '> 1 Tahun' : `${Math.round(p.estimatedDaysLeft)} Hari`}
                        </td>
                        <td style={{ padding: '0.75rem' }} className="text-muted">{p.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {activeTab === 'low-stock' && (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-300">
          <div className="glass-card flex flex-col gap-4 border-t-4 border-t-[rgb(var(--danger))]">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-[rgb(var(--danger))] flex items-center gap-2">
                  <AlertTriangle size={20} /> Daftar Stok Menipis
                </h3>
                <p className="text-sm text-muted">Produk yang jumlah stoknya berada di bawah batas minimum.</p>
              </div>
              <button 
                onClick={generateAISummary} 
                disabled={isGeneratingSummary || lowStockItems.length === 0}
                className="btn btn-primary flex items-center gap-2"
              >
                {isGeneratingSummary ? <Loader2 size={16} className="animate-spin" /> : '🤖'} 
                {isGeneratingSummary ? 'AI sedang menyusun strategi...' : `Generate AI Restock Advisor (${lowStockItems.length} item)`}
              </button>
            </div>

            {aiSummary && (
              <div className="mt-4 p-5 rounded-xl bg-[rgba(var(--primary),0.05)] border border-[rgba(var(--primary),0.2)]">
                <h4 className="flex items-center gap-2 text-[rgb(var(--primary))] mb-4 border-b border-[rgba(var(--primary),0.2)] pb-2">
                  <Package size={18} /> AI Restock Executive Summary
                </h4>
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none text-sm leading-loose"
                  dangerouslySetInnerHTML={{ __html: aiSummary }}
                />
              </div>
            )}

            {lowStockItems.length === 0 ? (
              <p className="text-center text-muted p-8 border border-dashed border-[rgba(var(--border),0.5)] rounded-xl mt-4">Gudang sangat aman. Tidak ada produk di bawah batas minimum.</p>
            ) : (
              <div className="overflow-x-auto mt-4 custom-scrollbar">
                <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-[rgba(var(--surface-hover),0.5)]">
                      <th className="p-3 border-b border-[rgba(var(--border),0.5)]">SKU</th>
                      <th className="p-3 border-b border-[rgba(var(--border),0.5)]">Nama Produk</th>
                      <th className="p-3 border-b border-[rgba(var(--border),0.5)]">Kategori</th>
                      <th className="p-3 text-center border-b border-[rgba(var(--border),0.5)]">Stok</th>
                      <th className="p-3 text-center border-b border-[rgba(var(--border),0.5)]">Min</th>
                      <th className="p-3 text-center border-b border-[rgba(var(--border),0.5)]">Defisit</th>
                      <th className="p-3 text-right border-b border-[rgba(var(--border),0.5)]">Harga (Est)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map((item) => (
                      <tr key={item.id} className="border-b border-[rgba(var(--border),0.2)] hover:bg-[rgba(var(--surface-hover),0.3)] transition-colors">
                        <td className="p-3 font-mono text-[rgb(var(--primary))]">{item.sku}</td>
                        <td className="p-3 font-medium">{item.name}</td>
                        <td className="p-3 text-muted">{item.categoryName || '-'}</td>
                        <td className="p-3 text-center font-bold text-[rgb(var(--danger))]">{item.currentStock}</td>
                        <td className="p-3 text-center">{item.minStock}</td>
                        <td className="p-3 text-center text-[rgb(var(--warning))] font-bold">{item.minStock - item.currentStock}</td>
                        <td className="p-3 text-right">Rp {Intl.NumberFormat('id-ID').format(item.costPrice || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
