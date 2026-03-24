'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { Calculator, History as HistoryIcon, ArrowRight, Sparkles, TrendingUp, Package, Shield, Target, DollarSign, Loader2, Info } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

type TabType = 'hpp' | 'eoq' | 'ss' | 'rop' | 'bep' | 'profit';

export default function CalculatorPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('hpp');
  const [inputHPP, setInputHPP] = useState('');
  
  // EOQ State
  const [eoqData, setEoqData] = useState({ demand: '', orderCost: '', holdingCost: '' });
  // SS State
  const [ssData, setSsData] = useState({ serviceLevel: '95', stdDev: '', leadTime: '' });
  // ROP State
  const [ropData, setRopData] = useState({ leadTime: '', avgDemand: '', safetyStock: '' });
  // BEP State
  const [bepData, setBepData] = useState({ fixedCost: '', price: '', variableCost: '' });
  // Profit State
  const [profitData, setProfitData] = useState({ price: '', cost: '' });

  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const { data: productsData } = useSWR('/api/stock', fetcher);
  const products = productsData || [];

  const handleProductSelect = (productId: string, tab: TabType) => {
    if (!productId) return;
    const product = products.find((p: any) => p.id === productId);
    if (!product) return;
    
    if (tab === 'eoq') {
      setEoqData({...eoqData, holdingCost: ((product.buyPrice || 0) * 0.2).toString(), demand: product.currentStock.toString()});
    } else if (tab === 'bep') {
      setBepData({...bepData, price: (product.unitPrice || 0).toString(), variableCost: (product.buyPrice || 0).toString()});
    } else if (tab === 'profit') {
      setProfitData({...profitData, price: (product.unitPrice || 0).toString(), cost: (product.buyPrice || 0).toString()});
    }
  };

  const ProductDropdown = () => (
    <div className="mb-4 p-3 rounded-lg border border-[rgba(var(--primary),0.3)] bg-[rgba(var(--primary),0.05)]">
      <label className="text-xs font-semibold text-[rgb(var(--primary))] block mb-1">💡 Auto-Fill dari Database Produk</label>
      <select className="input-field w-full text-sm" onChange={(e) => handleProductSelect(e.target.value, activeTab)}>
        <option value="">-- Pilih Produk untuk Isi Otomatis --</option>
        {products.map((p: any) => (
          <option key={p.id} value={p.id}>{p.name} (Stok: {p.currentStock}, Beli: {formatRupiah(p.buyPrice || 0)})</option>
        ))}
      </select>
    </div>
  );

  useEffect(() => {
    const saved = localStorage.getItem('calc_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveHistory = (tab: string, resData: any) => {
    const newHistoryItem = {
      type: tab,
      result: resData,
      timestamp: new Date().toISOString()
    };
    const updatedHistory = [newHistoryItem, ...history].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem('calc_history', JSON.stringify(updatedHistory));
  };

  const handleCalculateHPP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputHPP.trim()) return;
    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputHPP }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: 'hpp', ...data.data });
        saveHistory('HPP', data.data);
      } else {
        showToast(data.error || 'Gagal menghitung AI', 'error');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculateSCM = async (e: React.FormEvent, type: TabType) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    let payload = {};
    if (type === 'eoq') payload = eoqData;
    else if (type === 'ss') payload = ssData;
    else if (type === 'rop') payload = ropData;
    else if (type === 'bep') payload = bepData;
    else if (type === 'profit') payload = profitData;

    try {
      const res = await fetch('/api/calculator/scm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data: payload }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type, ...data.data });
        saveHistory(type.toUpperCase(), data.data);
      } else {
        showToast(data.error || 'Input tidak valid', 'error');
      }
    } catch (err: any) {
      showToast('Koneksi bermasalah', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('calc_history');
    showToast('Riwayat dibersihkan', 'success');
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setResult(null);
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <div className="glass-card border-l-4 mt-6 animate-in fade-in slide-in-from-bottom-2" style={{ borderColor: 'rgb(var(--primary))' }}>
        <h3 className="flex items-center gap-2 m-0 mb-4" style={{ color: 'rgb(var(--primary))' }}>
          <Sparkles size={18} /> Hasil Kalkulasi
        </h3>
        
        {result.type === 'hpp' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 p-4 rounded-xl" style={{ background: 'rgba(var(--foreground-rgb), 0.03)' }}>
              <span className="text-sm text-muted">Total Bayar</span>
              <span className="text-xl font-bold">{formatRupiah(result.totalPrice || 0)}</span>
            </div>
            <div className="flex flex-col gap-1 p-4 rounded-xl" style={{ background: 'rgba(var(--foreground-rgb), 0.03)' }}>
              <span className="text-sm text-muted">Diterima</span>
              <span className="text-xl font-bold">{result.quantity} {result.unit}</span>
            </div>
            <div className="col-span-2 p-6 rounded-xl mt-2" style={{ background: 'linear-gradient(135deg, rgba(var(--primary), 0.1), transparent)' }}>
              <span className="text-sm text-muted block mb-2 uppercase font-semibold">Harga Modal Satuan (HPP / Unit)</span>
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold" style={{ color: 'rgb(var(--primary))' }}>{formatRupiah(result.parsedUnitPrice || 0)}</span>
              </div>
            </div>
          </div>
        )}

        {result.type === 'eoq' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 p-6 rounded-xl text-center" style={{ background: 'linear-gradient(135deg, rgba(var(--primary), 0.1), transparent)' }}>
              <span className="text-sm text-muted block mb-2 uppercase font-semibold">Jumlah Pesanan Optimal (EOQ)</span>
              <span className="text-4xl font-bold text-[rgb(var(--primary))]">{result.eoq} Unit</span>
            </div>
            <div className="col-span-2 text-center text-sm text-muted">Intensitas: <strong>{result.annualOrders}x</strong> Pesan / Tahun</div>
          </div>
        )}

        {result.type === 'ss' && (
          <div className="p-6 rounded-xl text-center" style={{ background: 'linear-gradient(135deg, rgba(var(--warning), 0.1), transparent)' }}>
            <span className="text-sm text-muted block mb-2 uppercase font-semibold">Safety Stock Ideal</span>
            <span className="text-4xl font-bold text-[rgb(var(--warning))]">{result.safetyStock} Unit Penyangga</span>
          </div>
        )}

        {result.type === 'rop' && (
          <div className="p-6 rounded-xl text-center" style={{ background: 'linear-gradient(135deg, rgba(var(--danger), 0.1), transparent)' }}>
            <span className="text-sm text-muted block mb-2 uppercase font-semibold">Titik Pesan Ulang (ROP)</span>
            <span className="text-4xl font-bold text-[rgb(var(--danger))]">Sisa {result.rop} Unit</span>
            <span className="text-sm text-muted block mt-2">Segera pesan ke supplier saat stok menyentuh angka ini!</span>
          </div>
        )}

        {result.type === 'bep' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(var(--foreground-rgb), 0.03)' }}>
              <span className="text-sm text-muted block">Balik Modal Pada Penjualan:</span>
              <span className="text-2xl font-bold text-[rgb(var(--success))]">{result.bepUnits} pcs</span>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(var(--foreground-rgb), 0.03)' }}>
              <span className="text-sm text-muted block">Target Omzet Minimal:</span>
              <span className="text-2xl font-bold text-[rgb(var(--success))]">{formatRupiah(result.bepRevenue)}</span>
            </div>
          </div>
        )}

        {result.type === 'profit' && (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 p-4 rounded-xl text-center" style={{ background: 'rgba(var(--success), 0.1)' }}>
               <span className="text-sm text-[rgb(var(--success))] block font-semibold mb-1">Profit Bersih (Per Unit)</span>
               <span className="text-3xl font-black text-[rgb(var(--success))]">{formatRupiah(result.profit)}</span>
            </div>
            <div className="col-span-3 flex gap-4">
              <div className="flex-1 p-4 rounded-xl text-center border border-[rgba(var(--border),0.5)] bg-[rgba(var(--surface-hover),0.3)]">
                <span className="text-sm text-muted block mb-1">Gross Margin</span>
                <span className="text-xl font-bold">{result.margin}%</span>
              </div>
              <div className="flex-1 p-4 rounded-xl text-center border border-[rgba(var(--border),0.5)] bg-[rgba(var(--surface-hover),0.3)]">
                <span className="text-sm text-muted block mb-1">Selisih Markup</span>
                <span className="text-xl font-bold">{result.markup}%</span>
              </div>
            </div>
          </div>
        )}

        {result.recommendation && (
          <div className="mt-6 p-4 rounded-xl flex gap-3 text-sm" style={{ background: 'rgba(var(--primary), 0.05)', border: '1px solid rgba(var(--primary), 0.2)' }}>
            <span style={{ fontSize: '1.2rem' }}>🤖</span>
            <div>
              <strong className="block mb-1 text-[rgb(var(--primary))] font-semibold">AI SCM Expert:</strong>
              <div className="leading-relaxed opacity-90">{result.recommendation}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <div style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))', padding: '0.75rem', borderRadius: '12px', color: 'white' }}>
          <TrendingUp size={24} />
        </div>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Business Analytical SCM</h1>
          <p className="text-muted" style={{ margin: 0 }}>Modul perhitungan komprehensif untuk rantai pasok (HPP, EOQ, BEP, ROP).</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto custom-scrollbar gap-2 pb-2">
        <button onClick={() => switchTab('hpp')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'hpp' ? 'bg-[rgb(var(--primary))] text-white shadow-md' : 'hover:bg-[rgba(var(--surface-hover),0.5)] text-muted'}`}>
           <Calculator size={16} /> HPP Mentah AI
        </button>
        <button onClick={() => switchTab('eoq')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'eoq' ? 'bg-[rgb(var(--primary))] text-white shadow-md' : 'hover:bg-[rgba(var(--surface-hover),0.5)] text-muted'}`}>
           <Package size={16} /> EOQ Order
        </button>
        <button onClick={() => switchTab('ss')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'ss' ? 'bg-[rgb(var(--primary))] text-white shadow-md' : 'hover:bg-[rgba(var(--surface-hover),0.5)] text-muted'}`}>
           <Shield size={16} /> Safety Stock
        </button>
        <button onClick={() => switchTab('rop')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'rop' ? 'bg-[rgb(var(--primary))] text-white shadow-md' : 'hover:bg-[rgba(var(--surface-hover),0.5)] text-muted'}`}>
           <ArrowRight size={16} /> Reorder Point
        </button>
        <button onClick={() => switchTab('bep')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'bep' ? 'bg-[rgb(var(--primary))] text-white shadow-md' : 'hover:bg-[rgba(var(--surface-hover),0.5)] text-muted'}`}>
           <Target size={16} /> Break Even
        </button>
        <button onClick={() => switchTab('profit')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'profit' ? 'bg-[rgb(var(--primary))] text-white shadow-md' : 'hover:bg-[rgba(var(--surface-hover),0.5)] text-muted'}`}>
           <DollarSign size={16} /> Margin & Profit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* FORM PANEL */}
        <div className="md:col-span-3 flex flex-col gap-6" style={{ minHeight: '600px' }}>
          
          {activeTab === 'hpp' && (
            <div className="glass-card animate-in fade-in slide-in-from-left-2 duration-300">
              <form onSubmit={handleCalculateHPP} className="flex flex-col gap-4">
                <div className="flex items-center gap-2 font-semibold">
                  <Calculator size={18} className="text-[rgb(var(--primary))]" /> Harga Pokok AI
                </div>
                <p className="text-sm text-muted m-0">Ekstrak otomatis harga satuan / HPP dari teks natural pembelian kuitansi Anda menggunakan bahasa alami.</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="input-field flex-1" 
                    placeholder="Contoh: Beli resleting 5 lusin total 60 ribu" 
                    value={inputHPP}
                    onChange={e => setInputHPP(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <button type="submit" className="btn btn-primary whitespace-nowrap" disabled={isLoading || !inputHPP.trim()}>
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : '⚡ Analisis'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'eoq' && (
            <div className="glass-card animate-in fade-in slide-in-from-left-2 duration-300">
              <form onSubmit={(e) => handleCalculateSCM(e, 'eoq')} className="flex flex-col gap-4">
                <div className="flex items-center gap-2 font-semibold"><Package size={18} className="text-[rgb(var(--primary))]" /> Economic Order Quantity</div>
                <p className="text-sm text-muted m-0">Menghitung pesanan optimal (minimum lot size) agar ongkir & biaya gudang Anda serendah mungkin.</p>
                
                <ProductDropdown />
                <div className="grid gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted ml-1 mb-1 block">Total Penjualan/Kebutuhan Setahun (Unit)</label>
                    <input type="number" className="input-field w-full" placeholder="Cth: 2000" value={eoqData.demand} onChange={e => setEoqData({...eoqData, demand: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted ml-1 mb-1 block">Ongkir / Biaya Admin Sekali Pesan (Rp)</label>
                    <input type="number" className="input-field w-full" placeholder="Cth: 50000" value={eoqData.orderCost} onChange={e => setEoqData({...eoqData, orderCost: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted ml-1 mb-1 block">Biaya Simpan Gudang Per Unit/Tahun (Rp)</label>
                    <input type="number" className="input-field w-full" placeholder="Cth: 2000" value={eoqData.holdingCost} onChange={e => setEoqData({...eoqData, holdingCost: e.target.value})} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary mt-2" disabled={isLoading}>{isLoading ? <Loader2 size={18} className="animate-spin text-center w-full" /> : 'Kalkulasi EOQ'}</button>
              </form>
            </div>
          )}

          {activeTab === 'ss' && (
            <div className="glass-card animate-in fade-in slide-in-from-left-2 duration-300">
              <form onSubmit={(e) => handleCalculateSCM(e, 'ss')} className="flex flex-col gap-4">
                <div className="flex items-center gap-2 font-semibold"><Shield size={18} className="text-[rgb(var(--warning))]" /> Safety Stock</div>
                <p className="text-sm text-muted m-0">Tentukan persediaan cadangan stok pengaman ideal bagi operasional produksi harian Gudang.</p>
                
                <div className="grid gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted ml-1 mb-1 block">Target Service Level (Keamanan)</label>
                    <select className="input-field w-full" value={ssData.serviceLevel} onChange={e => setSsData({...ssData, serviceLevel: e.target.value})}>
                      <option value="95">Z=1.645 (Standar 95% Aman - Toko Biasa)</option>
                      <option value="99">Z=2.326 (Super Aman 99% - Distro Skala Besar)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted ml-1 mb-1 block">Standar Deviasi Penjualan (Tingkat Fluktuasi / Hari)</label>
                    <input type="number" className="input-field w-full" placeholder="Cth: 5" value={ssData.stdDev} onChange={e => setSsData({...ssData, stdDev: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted ml-1 mb-1 block">Waktu Tunggu Supplier Kirim Barang (Hari)</label>
                    <input type="number" className="input-field w-full" placeholder="Cth: 7" value={ssData.leadTime} onChange={e => setSsData({...ssData, leadTime: e.target.value})} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary mt-2" disabled={isLoading}>{isLoading ? <Loader2 size={18} className="animate-spin text-center w-full" /> : 'Hitung Stok Penyangga'}</button>
              </form>
            </div>
          )}

          {activeTab === 'rop' && (
            <div className="glass-card animate-in fade-in slide-in-from-left-2 duration-300">
              <form onSubmit={(e) => handleCalculateSCM(e, 'rop')} className="flex flex-col gap-4">
                <div className="flex items-center gap-2 font-semibold"><ArrowRight size={18} className="text-[rgb(var(--danger))]" /> Reorder Point (ROP)</div>
                <p className="text-sm text-muted m-0">Menjawab pertanyaan kapan saatnya gudang memesan stok lagi (Restock Alarm Trigger).</p>
                
                <div className="grid gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted ml-1 mb-1 block">Estimasi Lead Time Supplier (Hari)</label>
                    <input type="number" className="input-field w-full" placeholder="Cth: 5" value={ropData.leadTime} onChange={e => setRopData({...ropData, leadTime: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted ml-1 mb-1 block">Rata-Rata Barang Terjual Tiap Hari (Unit)</label>
                    <input type="number" className="input-field w-full" placeholder="Cth: 15" value={ropData.avgDemand} onChange={e => setRopData({...ropData, avgDemand: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted ml-1 mb-1 block">Total Safety Stock / Stok Penyanga (Unit)</label>
                    <input type="number" className="input-field w-full" placeholder="Cth: 20" value={ropData.safetyStock} onChange={e => setRopData({...ropData, safetyStock: e.target.value})} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary mt-2" disabled={isLoading}>{isLoading ? <Loader2 size={18} className="animate-spin text-center w-full" /> : 'Hitung ROP'}</button>
              </form>
            </div>
          )}

          {activeTab === 'bep' && (
            <div className="glass-card animate-in fade-in slide-in-from-left-2 duration-300">
              <form onSubmit={(e) => handleCalculateSCM(e, 'bep')} className="flex flex-col gap-4">
                <div className="flex items-center gap-2 font-semibold"><Target size={18} className="text-[rgb(var(--primary))]" /> Break Even Point (BEP)</div>
                <p className="text-sm text-muted m-0">Pahami minimal jumlah kaos yang harus terjual untuk mencapai titik impas (tidak rugi).</p>
                
                <ProductDropdown />
                <div className="grid gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted ml-1 mb-1 block">Biaya Fix Bulanan (Gaji, Sewa, Admin)</label>
                    <input type="number" className="input-field w-full" placeholder="Cth: 5000000" value={bepData.fixedCost} onChange={e => setBepData({...bepData, fixedCost: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted ml-1 mb-1 block">Rencana Harga Jual Satuan Konsumen (Rp)</label>
                    <input type="number" className="input-field w-full" placeholder="Cth: 120000" value={bepData.price} onChange={e => setBepData({...bepData, price: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted ml-1 mb-1 block">Harga Modal Beli / Variable Cost (Rp)</label>
                    <input type="number" className="input-field w-full" placeholder="Cth: 75000" value={bepData.variableCost} onChange={e => setBepData({...bepData, variableCost: e.target.value})} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary mt-2" disabled={isLoading}>{isLoading ? <Loader2 size={18} className="animate-spin text-center w-full" /> : 'Hitung BEP'}</button>
              </form>
            </div>
          )}

          {activeTab === 'profit' && (
            <div className="glass-card animate-in fade-in slide-in-from-left-2 duration-300">
              <form onSubmit={(e) => handleCalculateSCM(e, 'profit')} className="flex flex-col gap-4">
                <div className="flex items-center gap-2 font-semibold"><DollarSign size={18} className="text-[rgb(var(--success))]" /> Analisis Margin & Markup Profit</div>
                <p className="text-sm text-muted m-0">Lihat dengan jelas persentase Gross Margin agar bisnis pakaian Kaos Kami tidak bakar uang tanpa sadar.</p>
                
                <ProductDropdown />
                <div className="grid gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted ml-1 mb-1 block">Total Harga Beli / Modal Barang (Rp)</label>
                    <input type="number" className="input-field w-full" placeholder="Cth: 45000" value={profitData.cost} onChange={e => setProfitData({...profitData, cost: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted ml-1 mb-1 block">Target Harga Jual Toko (Rp)</label>
                    <input type="number" className="input-field w-full" placeholder="Cth: 85000" value={profitData.price} onChange={e => setProfitData({...profitData, price: e.target.value})} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary mt-2" disabled={isLoading}>{isLoading ? <Loader2 size={18} className="animate-spin text-center w-full" /> : 'Skrining Kinerja Harga'}</button>
              </form>
            </div>
          )}

          {renderResult()}
        </div>

        {/* RIWAYAT / HISTORY PANEL */}
        <div className="md:col-span-2">
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
            <div className="flex justify-between items-center mb-4 border-b border-[rgba(var(--border),0.5)] pb-3">
              <h3 className="flex items-center gap-2 text-base m-0"><HistoryIcon size={16} /> Riwayat Perhitungan</h3>
              {history.length > 0 && (
                <button onClick={clearHistory} className="text-xs text-[rgb(var(--danger))] bg-transparent hover:bg-[rgba(var(--danger),0.1)] px-2 py-1 rounded transition-colors border-none cursor-pointer">Hapus</button>
              )}
            </div>
            
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {history.length === 0 ? (
                <div className="text-center text-muted text-sm flex flex-col items-center justify-center h-full opacity-50">
                  <Info size={32} className="mb-2 opacity-50" />
                  Belum ada log SCM.
                </div>
              ) : (
                history.map((h, i) => (
                  <div key={i} className="p-3 rounded-lg flex flex-col gap-2" style={{ background: 'rgba(var(--surface-hover), 0.5)', border: '1px solid rgba(var(--border), 0.2)' }}>
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-bold uppercase py-0.5 px-2 rounded tracking-wider bg-[rgba(var(--primary),0.15)] text-[rgb(var(--primary))]">{h.type}</span>
                       <span className="text-xs text-muted">{new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    
                    {h.type === 'HPP' && h.result && (
                       <div className="text-sm font-medium mt-1">
                          HPP: <strong className="text-[rgb(var(--primary))]">{formatRupiah(h.result.parsedUnitPrice)}</strong>
                       </div>
                    )}
                    {h.type === 'EOQ' && h.result && (
                       <div className="text-sm border-t border-[rgba(var(--border),0.5)] pt-2 mt-1 flex justify-between">
                          <span>Qty: <strong>{h.result.eoq}</strong></span>
                          <span>Kali: <strong>{h.result.annualOrders}x</strong></span>
                       </div>
                    )}
                    {h.type === 'SS' && h.result && (
                       <div className="text-sm font-medium mt-1">
                          Limit Cadangan: <strong className="text-[rgb(var(--warning))]">+{h.result.safetyStock} Unit</strong>
                       </div>
                    )}
                    {h.type === 'ROP' && h.result && (
                       <div className="text-sm font-medium mt-1">
                          Alarm Order: <strong className="text-[rgb(var(--danger))]">Sisa {h.result.rop}</strong>
                       </div>
                    )}
                    {h.type === 'BEP' && h.result && (
                       <div className="text-sm mt-1">
                          Titik Impas: <strong>{h.result.bepUnits} pcs ({formatRupiah(h.result.bepRevenue)})</strong>
                       </div>
                    )}
                    {h.type === 'PROFIT' && h.result && (
                       <div className="text-sm border-t border-[rgba(var(--border),0.5)] pt-2 mt-1 flex justify-between">
                          <strong className="text-[rgb(var(--success))]">{formatRupiah(h.result.profit)}</strong>
                          <span className="bg-[rgba(var(--surface-hover),1)] px-2 rounded-full font-mono text-[10px] items-center flex">{h.result.margin}% mg</span>
                       </div>
                    )}
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
