'use client';

import { useState } from 'react';
import { generateProductVariants } from '@/app/actions/product';
import { useToast } from '@/components/Toast';
import { X, Plus, Trash2, Zap } from 'lucide-react';

export default function VariantGenerator({ categories, onClose }: { categories: any[]; onClose: () => void }) {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [template, setTemplate] = useState({
    name: '',
    sku: '',
    categoryId: categories[0]?.id || '',
    unitPrice: 0,
    buyPrice: 0,
    minStock: 5,
    material: 'Cotton Combed 30s',
    thickness: '',
    sleeveType: 'Pendek',
    unit: 'pcs'
  });

  const [sizes, setSizes] = useState(['S', 'M', 'L', 'XL']);
  const [newSize, setNewSize] = useState('');
  
  const [colors, setColors] = useState(['Hitam', 'Putih']);
  const [newColor, setNewColor] = useState('');

  const handleAddSize = () => {
    if (newSize && !sizes.includes(newSize)) {
      setSizes([...sizes, newSize.toUpperCase()]);
      setNewSize('');
    }
  };

  const handleAddColor = () => {
    if (newColor && !colors.includes(newColor)) {
      setColors([...colors, newColor]);
      setNewColor('');
    }
  };

  const handleRemoveSize = (s: string) => setSizes(sizes.filter(x => x !== s));
  const handleRemoveColor = (c: string) => setColors(colors.filter(x => x !== c));

  const handleGenerate = async () => {
    if (!template.name || !template.sku) {
      showToast('Nama dan Base SKU wajib diisi', 'error');
      return;
    }
    if (sizes.length === 0 && colors.length === 0) {
      showToast('Pilih setidaknya satu ukuran atau warna', 'error');
      return;
    }

    setIsLoading(true);
    const res = await generateProductVariants(template, sizes, colors);
    setIsLoading(false);

    if (res.success) {
      showToast(`Berhasil membuat ${res.count} varian produk!`, 'success');
      onClose();
    } else {
      showToast(res.error || 'Gagal generate varian', 'error');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
    >
      {/* Modal Container */}
      <div 
        className="w-full glass-card relative flex flex-col shadow-2xl border border-[rgba(var(--primary),0.2)]" 
        style={{ maxWidth: '48rem', maxHeight: '90vh', backgroundColor: 'rgb(var(--surface))' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-[rgba(var(--border),0.4)]">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--accent))]">
              <Zap style={{ color: '#facc15' }} size={24} /> 
              Smart Variant Generator
            </h2>
            <p className="text-xs text-muted mt-1">Buat banyak varian produk sekaligus dengan cepat.</p>
          </div>
          <button 
            onClick={onClose} 
            className="btn-ghost hover:bg-[rgba(var(--danger),0.1)] hover:text-[rgb(var(--danger))] transition-colors rounded-full p-2"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 pr-4 flex flex-col gap-8 custom-scrollbar">
          
          {/* Section 1: Base Info */}
          <section className="bg-[rgba(var(--surface-hover),0.3)] p-5 rounded-xl border border-[rgba(var(--border),0.3)]">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-[rgb(var(--primary))]">
              <span className="bg-[rgba(var(--primary),0.1)] p-1.5 rounded-md">📦</span> Informasi Dasar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-muted block mb-1.5 uppercase tracking-wider">Nama Dasar Produk</label>
                <input 
                  type="text" 
                  className="input-field bg-[rgba(var(--surface),0.8)] focus:bg-white transition-colors" 
                  placeholder="Contoh: Kaos Kami Skizo"
                  value={template.name}
                  onChange={e => setTemplate({...template, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted block mb-1.5 uppercase tracking-wider">Base SKU (Prefiks)</label>
                <input 
                  type="text" 
                  className="input-field bg-[rgba(var(--surface),0.8)] focus:bg-white transition-colors uppercase font-mono" 
                  placeholder="CTH: S-SKIZO"
                  value={template.sku}
                  onChange={e => setTemplate({...template, sku: e.target.value.toUpperCase()})}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted block mb-1.5 uppercase tracking-wider">Kategori</label>
                <select 
                  className="input-field bg-[rgba(var(--surface),0.8)] focus:bg-white transition-colors"
                  value={template.categoryId}
                  onChange={e => setTemplate({...template, categoryId: e.target.value})}
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted block mb-1.5 uppercase tracking-wider">Harga Beli / Modal (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">Rp</span>
                  <input 
                    type="number" 
                    className="input-field pl-9 bg-[rgba(var(--surface),0.8)] focus:bg-white transition-colors" 
                    value={template.buyPrice || ''}
                    placeholder="0"
                    onChange={e => setTemplate({...template, buyPrice: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted block mb-1.5 uppercase tracking-wider">Harga Jual Satuan (Rp)</label>
                <div className="relative">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">Rp</span>
                  <input 
                    type="number" 
                    className="input-field pl-9 bg-[rgba(var(--surface),0.8)] focus:bg-white transition-colors" 
                    value={template.unitPrice || ''}
                    placeholder="0"
                    onChange={e => setTemplate({...template, unitPrice: Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Variants */}
          <section>
             <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-[rgb(var(--accent))]">
              <span className="bg-[rgba(var(--accent),0.1)] p-1.5 rounded-md">✨</span> Kombinasi Varian
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Sizes Block */}
              <div className="bg-[rgba(var(--surface-hover),0.2)] p-4 rounded-xl border border-[rgba(var(--border),0.2)] hover:border-[rgba(var(--primary),0.3)] transition-colors">
                <label className="font-bold block mb-4 text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">📐 Ukuran (Size)</span>
                  <span className="badge badge-primary">{sizes.length}</span>
                </label>
                
                <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
                  {sizes.length === 0 && <span className="text-xs text-muted italic flex items-center">Belum ada ukuran ditambahkan</span>}
                  {sizes.map(s => (
                    <span 
                      key={s} 
                      className="group flex items-center gap-1.5 bg-[rgba(var(--primary),0.1)] text-[rgb(var(--primary))] font-semibold px-3 py-1.5 rounded-lg border border-[rgba(var(--primary),0.2)] transition-all hover:bg-[rgba(var(--primary),0.15)] shadow-sm"
                    >
                      {s} 
                      <button 
                        onClick={() => handleRemoveSize(s)} 
                        className="opacity-50 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-all"
                        title="Hapus"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                
                <div className="flex gap-2 relative">
                  <input 
                    type="text" 
                    className="input-field !py-2 text-sm shadow-sm pr-10" 
                    placeholder="Ketik ukuran lalu Enter..." 
                    value={newSize}
                    onChange={e => setNewSize(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSize()}
                  />
                  <button 
                    onClick={handleAddSize} 
                    disabled={!newSize.trim()}
                    className="absolute right-1 top-1 bottom-1 btn btn-primary !p-1.5 !rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Tambah"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Colors Block */}
              <div className="bg-[rgba(var(--surface-hover),0.2)] p-4 rounded-xl border border-[rgba(var(--border),0.2)] hover:border-[rgba(var(--accent),0.3)] transition-colors">
                <label className="font-bold block mb-4 text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">🎨 Warna (Color)</span>
                   <span className="badge" style={{ background: 'rgba(var(--accent),0.1)', color: 'rgb(var(--accent))' }}>{colors.length}</span>
                </label>
                
                <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
                  {colors.length === 0 && <span className="text-xs text-muted italic flex items-center">Belum ada warna ditambahkan</span>}
                  {colors.map(c => (
                    <span 
                      key={c} 
                      className="group flex items-center gap-1.5 bg-[rgba(var(--accent),0.1)] text-[rgb(var(--accent))] font-semibold px-3 py-1.5 rounded-lg border border-[rgba(var(--accent),0.2)] transition-all hover:bg-[rgba(var(--accent),0.15)] shadow-sm"
                    >
                      {c} 
                      <button 
                        onClick={() => handleRemoveColor(c)} 
                        className="opacity-50 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-all"
                        title="Hapus"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                
                <div className="flex gap-2 relative">
                  <input 
                    type="text" 
                    className="input-field !py-2 text-sm shadow-sm pr-10" 
                    placeholder="Ketik warna lalu Enter..." 
                    value={newColor}
                    onChange={e => setNewColor(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddColor()}
                  />
                  <button 
                    onClick={handleAddColor} 
                    disabled={!newColor.trim()}
                    className="absolute right-1 top-1 bottom-1 btn !p-1.5 !rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
                     style={{ background: 'linear-gradient(135deg, rgb(var(--accent)), #c084fc)' }}
                    title="Tambah"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Footer / Action Bar */}
        <div className="mt-6 pt-5 border-t border-[rgba(var(--border),0.5)] bg-[rgba(var(--surface-hover),0.5)] -mx-6 -mb-6 p-6 rounded-b-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-lg border border-[rgba(var(--border),0.6)] shadow-inner w-full sm:w-auto">
             <div className="p-2 bg-[rgba(var(--primary),0.1)] rounded-md text-[rgb(var(--primary))]">
               <Zap size={20} className={sizes.length * colors.length > 0 ? "animate-pulse" : ""} />
             </div>
             <div>
               <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Estimasi Pembuatan</p>
               <p className="text-lg font-bold text-[rgb(var(--foreground-rgb))]">
                 {sizes.length * colors.length} <span className="text-sm font-medium text-muted">Varian Produk</span>
               </p>
             </div>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={onClose} className="btn btn-outline flex-1 sm:flex-none">Batalkan</button>
            <button 
              onClick={handleGenerate} 
              disabled={isLoading || sizes.length * colors.length === 0}
              className="btn btn-primary flex-1 sm:flex-none shadow-lg hover:shadow-xl transition-all"
              style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">Sedang Membuat...</span>
              ) : (
                <span className="flex items-center gap-2"><Plus size={18} /> Generate Sekarang</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
