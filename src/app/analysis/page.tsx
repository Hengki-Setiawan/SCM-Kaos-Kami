'use client';

import { useState, useEffect } from 'react';

export default function AnalysisPage() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
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

    fetchAnalysis();
    fetchPredictions();
  }, []);

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

      {analysis && (
        <div className="grid grid-cols-3 gap-6">
          
          {/* Main Score Card */}
          <div className="col-span-1 glass-card flex flex-col items-center justify-center text-center p-8">
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
          <div className="col-span-2 glass-card flex flex-col gap-4">
            <h3>Executive Summary</h3>
            <p className="text-muted leading-relaxed">{analysis.summary}</p>
            
            <div className="grid grid-cols-3 border-t border-[rgba(var(--border),0.5)] mt-4 pt-4 gap-4">
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
          <div className="col-span-3 grid grid-cols-2 gap-6">
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
          <div className="col-span-3 glass-card" style={{ borderTop: '4px solid rgb(var(--primary))' }}>
            <div className="flex justify-between items-center mb-4">
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
    </div>
  );
}
