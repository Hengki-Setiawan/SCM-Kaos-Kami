'use client';

import { useState } from 'react';

export default function CalculatorPage() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
  };

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
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <div>
        <h1>Kalkulator AI SCM</h1>
        <p className="text-muted">Ketik harga grosir bahan dalam bahasa sehari-hari, AI akan menghitung harga satuan untuk Anda.</p>
      </div>

      <div className="glass-card">
        <form onSubmit={handleCalculate} className="flex flex-col gap-4">
          <label className="text-sm font-semibold">Masukkan deskripsi pembelian (Contoh: "Beli Solasi 5 roll total harga 45 ribu")</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="input-field flex-1" 
              placeholder="Ketik detail pembelian..." 
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className="btn btn-primary" disabled={isLoading || !input.trim()}>
              {isLoading ? 'Menghitung...' : 'Hitung Satuan'}
            </button>
          </div>
        </form>
      </div>

      {result && (
        <div className="glass-card border-l-4" style={{ borderColor: 'rgb(var(--primary))' }}>
          <h3>Hasil Perhitungan (AI)</h3>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted">Total Bayar</span>
              <span className="text-xl font-bold">{formatRupiah(result.totalPrice || 0)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted">Jumlah Barang</span>
              <span className="text-xl font-bold">{result.quantity} {result.unit}</span>
            </div>
            
            <div className="col-span-2 border-t border-[rgba(var(--border),0.5)] mt-2 pt-4">
              <span className="text-sm text-muted block mb-1">Harga Modal Satuan (HPP/Unit)</span>
              <span className="text-3xl font-bold text-[rgb(var(--success))]">{formatRupiah(result.parsedUnitPrice || 0)}</span>
              <span className="text-sm text-muted"> per {result.unit}</span>
            </div>
          </div>

          {result.recommendation && (
            <div className="mt-6 p-4 rounded-lg bg-[rgba(var(--primary),0.1)] text-sm">
              <strong className="block mb-1">💡 AI Insight:</strong>
              {result.recommendation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
