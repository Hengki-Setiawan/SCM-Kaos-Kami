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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl glass-card relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="flex items-center gap-2"><Zap className="text-yellow-400" /> Smart Variant Generator</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 pr-2 flex flex-col gap-6">
          {/* Base Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-muted block mb-1">Nama Dasar Produk (Contoh: Kaos Polos)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Misal: Kaos Combed 30s"
                value={template.name}
                onChange={e => setTemplate({...template, name: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Base SKU (Prefiks)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Misal: C30S"
                value={template.sku}
                onChange={e => setTemplate({...template, sku: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Kategori</label>
              <select 
                className="input-field"
                value={template.categoryId}
                onChange={e => setTemplate({...template, categoryId: e.target.value})}
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted block mb-1">Harga Beli (Satuan)</label>
              <input 
                type="number" 
                className="input-field" 
                value={template.buyPrice}
                onChange={e => setTemplate({...template, buyPrice: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Harga Jual (Satuan)</label>
              <input 
                type="number" 
                className="input-field" 
                value={template.unitPrice}
                onChange={e => setTemplate({...template, unitPrice: Number(e.target.value)})}
              />
            </div>
          </div>

          <hr className="border-white/5" />

          {/* Variants Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Sizes */}
            <div>
              <label className="font-bold block mb-3 text-sm flex items-center gap-2">📐 Ukuran (Size)</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {sizes.map(s => (
                  <span key={s} className="flex items-center gap-2" style={{ padding: '0.25rem 0.75rem', background: 'rgba(var(--primary), 0.2)', color: 'rgb(var(--primary))', fontSize: '0.75rem', borderRadius: '999px' }}>
                    {s} <button onClick={() => handleRemoveSize(s)} className="text-muted hover:text-danger bg-transparent border-none p-0 flex"><X size={12} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="input-field !py-1 text-sm" 
                  placeholder="Tambah S, M, L..." 
                  value={newSize}
                  onChange={e => setNewSize(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddSize()}
                />
                <button onClick={handleAddSize} className="btn btn-outline !p-1"><Plus size={18} /></button>
              </div>
            </div>

            {/* Colors */}
            <div>
              <label className="font-bold block mb-3 text-sm flex items-center gap-2">🎨 Warna (Color)</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {colors.map(c => (
                  <span key={c} className="flex items-center gap-2" style={{ padding: '0.25rem 0.75rem', background: 'rgba(var(--accent), 0.2)', color: 'rgb(var(--accent))', fontSize: '0.75rem', borderRadius: '999px' }}>
                    {c} <button onClick={() => handleRemoveColor(c)} className="text-muted hover:text-danger bg-transparent border-none p-0 flex"><X size={12} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="input-field !py-1 text-sm" 
                  placeholder="Tambah Hitam, Putih..." 
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddColor()}
                />
                <button onClick={handleAddColor} className="btn btn-outline !p-1"><Plus size={18} /></button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="text-[10px] text-muted">
            Estimasi: <span className="text-white font-bold">{sizes.length * colors.length}</span> varian akan dibuat.
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn btn-outline">Batal</button>
            <button 
              onClick={handleGenerate} 
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? 'Sedang Membuat...' : `Generate ${sizes.length * colors.length} Varian`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
