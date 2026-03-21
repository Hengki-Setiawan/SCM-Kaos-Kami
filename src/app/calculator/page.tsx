'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { Calculator, History as HistoryIcon, ArrowRight, Sparkles } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

export default function CalculatorPage() {
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('calc_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      
      if (data.success) {
        setResult(data.data);
        
        // Save to history
        const newHistoryItem = {
          input,
          result: data.data,
          timestamp: new Date().toISOString()
        };
        const updatedHistory = [newHistoryItem, ...history].slice(0, 5); // Keep max 5
        setHistory(updatedHistory);
        localStorage.setItem('calc_history', JSON.stringify(updatedHistory));
        
      } else {
        showToast(data.error || 'Gagal menghitung', 'error');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('calc_history');
    showToast('Riwayat dibersihkan', 'success');
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <div style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))', padding: '0.75rem', borderRadius: '12px', color: 'white' }}>
          <Calculator size={24} />
        </div>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Kalkulator AI SCM</h1>
          <p className="text-muted" style={{ margin: 0 }}>Ketik harga grosir bahan secara natural, AI akan menghitung harga satuan (HPP) untuk Anda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-3 flex flex-col gap-6">
          <div className="glass-card">
            <form onSubmit={handleCalculate} className="flex flex-col gap-4">
              <label className="text-sm font-semibold">Teks Pembelian Pembukaan</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="input-field flex-1" 
                  placeholder="Contoh: Beli resleting 5 lusin harganya 60 ribu" 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={isLoading}
                />
                <button type="submit" className="btn btn-primary" disabled={isLoading || !input.trim()} style={{ whiteSpace: 'nowrap' }}>
                  {isLoading ? 'Menghitung...' : '⚡ Hitung Satuan'}
                </button>
              </div>
            </form>
          </div>

          {result && (
            <div className="glass-card border-l-4" style={{ borderColor: 'rgb(var(--primary))', animation: 'fadeIn 0.5s ease-out' }}>
              <h3 className="flex items-center gap-2 m-0" style={{ color: 'rgb(var(--primary))' }}><Sparkles size={18} /> Hasil Perhitungan AI</h3>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="flex flex-col gap-1 p-4 rounded-xl" style={{ background: 'rgba(var(--foreground-rgb), 0.03)' }}>
                  <span className="text-sm text-muted">Total Bayar</span>
                  <span className="text-xl font-bold">{formatRupiah(result.totalPrice || 0)}</span>
                </div>
                <div className="flex flex-col gap-1 p-4 rounded-xl" style={{ background: 'rgba(var(--foreground-rgb), 0.03)' }}>
                  <span className="text-sm text-muted">Jumlah Diterima</span>
                  <span className="text-xl font-bold">{result.quantity} {result.unit}</span>
                </div>
                
                <div className="col-span-2 p-6 rounded-xl mt-2" style={{ background: 'linear-gradient(135deg, rgba(var(--primary), 0.1), transparent)' }}>
                  <span className="text-sm text-muted block mb-2 uppercase font-semibold">Harga Modal Satuan (HPP / Unit)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-4xl font-bold" style={{ color: 'rgb(var(--primary))' }}>{formatRupiah(result.parsedUnitPrice || 0)}</span>
                    <span className="text-muted font-medium mt-2">/ {result.unit}</span>
                  </div>
                </div>
              </div>

              {result.recommendation && (
                <div className="mt-6 p-4 rounded-lg flex gap-3 text-sm" style={{ background: 'rgba(var(--warning), 0.1)', border: '1px solid rgba(var(--warning), 0.2)' }}>
                  <span style={{ fontSize: '1.2rem' }}>💡</span>
                  <div>
                    <strong className="block mb-1 text-[rgb(var(--warning))] font-semibold">Insight AI:</strong>
                    {result.recommendation}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIWAYAT / HISTORY PANEL */}
        <div className="md:col-span-2">
          <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="flex items-center gap-2 text-base m-0"><HistoryIcon size={16} /> Riwayat Kalkulasi</h3>
              {history.length > 0 && (
                <button onClick={clearHistory} className="text-xs text-[rgb(var(--danger))] hover:underline bg-transparent border-none cursor-pointer">Bersihkan</button>
              )}
            </div>
            
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2">
              {history.length === 0 ? (
                <div className="text-center text-muted text-sm py-8 flex flex-col items-center justify-center h-full">
                  Belum ada riwayat kalkulasi.
                </div>
              ) : (
                history.map((h, i) => (
                  <div key={i} className="p-3 rounded-lg flex flex-col gap-2" style={{ border: '1px solid rgba(var(--border), 0.5)', background: 'rgba(var(--surface-hover), 0.3)' }}>
                    <p className="text-xs text-muted m-0 line-clamp-2" style={{ fontStyle: 'italic' }}>"{h.input}"</p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 text-[rgb(var(--success))] font-bold text-sm">
                        {formatRupiah(h.result.parsedUnitPrice)} <span className="text-muted font-normal text-xs">/ {h.result.unit}</span>
                      </div>
                      <span className="text-[0.65rem] text-muted">{new Date(h.timestamp).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
