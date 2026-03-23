'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { generateProductVariants } from '@/app/actions/product';
import { useToast } from '@/components/Toast';
import { X, Plus, Trash2, Zap, Layers, Sparkles } from 'lucide-react';

export default function VariantGenerator({ categories, onClose }: { categories: any[]; onClose: () => void }) {
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
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

  useEffect(() => {
    setMounted(true);
    // Add escape key listener
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300); // Wait for animation
  };

  const handleAddSize = () => {
    if (newSize.trim() && !sizes.includes(newSize.trim().toUpperCase())) {
      setSizes([...sizes, newSize.trim().toUpperCase()]);
      setNewSize('');
    }
  };

  const handleAddColor = () => {
    if (newColor.trim() && !colors.includes(newColor.trim())) {
      // capitalize first letter for consistency
      const formattedColor = newColor.trim().charAt(0).toUpperCase() + newColor.trim().slice(1);
      setColors([...colors, formattedColor]);
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
      handleClose();
    } else {
      showToast(res.error || 'Gagal generate varian', 'error');
    }
  };

  if (!mounted) return null;

  const totalVariants = sizes.length * colors.length;

  return createPortal(
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Modal Container */}
      <div 
        className={`w-full relative flex flex-col shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all duration-300 transform ${isClosing ? 'scale-95 translate-y-4' : 'scale-100 translate-y-0'}`} 
        style={{ maxWidth: '48rem', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Sparkles size={20} className={totalVariants > 0 ? "animate-pulse" : ""} />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                Smart Variant Generator
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Buat ratusan varian SKU otomatis dalam hitungan detik.</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6 custom-scrollbar pb-8">
          <div className="flex flex-col gap-8">
            
            {/* Section 1: Base Info */}
            <section>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs">📦</span> 
                Informasi Dasar Master Produk
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1.5 uppercase tracking-wider">Nama Dasar Produk</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" 
                    placeholder="Contoh: Kaos Polos Premium"
                    value={template.name}
                    onChange={e => setTemplate({...template, name: e.target.value})}
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Format hasil: [Nama Dasar] - [Warna] [Ukuran]</p>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1.5 uppercase tracking-wider">Base SKU (Prefiks)</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none uppercase font-mono tracking-wide" 
                    placeholder="CTH: KPS-PRM"
                    value={template.sku}
                    onChange={e => setTemplate({...template, sku: e.target.value.toUpperCase()})}
                  />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1.5 uppercase tracking-wider">Kategori</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none appearance-none"
                    value={template.categoryId}
                    onChange={e => setTemplate({...template, categoryId: e.target.value})}
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1.5 uppercase tracking-wider">Harga Beli / Modal (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
                    <input 
                      type="number" 
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" 
                      value={template.buyPrice || ''}
                      placeholder="0"
                      onChange={e => setTemplate({...template, buyPrice: Number(e.target.value)})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1.5 uppercase tracking-wider">Harga Jual Satuan (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
                    <input 
                      type="number" 
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium text-indigo-700 dark:text-indigo-400" 
                      value={template.unitPrice || ''}
                      placeholder="0"
                      onChange={e => setTemplate({...template, unitPrice: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Combinations */}
            <section>
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <span className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-xs">✨</span> 
                  Matriks Kombinasi Varian
                 </h3>
                 <div className="px-3 py-1 flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-bold border border-indigo-100 dark:border-indigo-800/50">
                    <Layers size={14} /> {totalVariants} Varian Dihasilkan
                 </div>
               </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Sizes Block */}
                <div className="relative p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-700/50 transition-colors">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/20 transition-colors"></div>
                  
                  <label className="font-bold flex items-center justify-between text-sm mb-4 relative z-10">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">📐 Ukuran (Size)</span>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded text-xs font-bold">{sizes.length}</span>
                  </label>
                  
                  <div className="flex flex-wrap gap-2 mb-5 min-h-[44px] relative z-10 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    {sizes.length === 0 && <span className="text-xs text-slate-400 italic flex items-center my-auto px-1">Belum ada ukuran, tambahkan di bawah 👇</span>}
                    {sizes.map(s => (
                      <span 
                        key={s} 
                        className="group/tag inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold px-2.5 py-1.5 rounded-md border border-indigo-200 dark:border-indigo-800/60 shadow-sm text-sm"
                      >
                        {s} 
                        <button 
                          onClick={() => handleRemoveSize(s)} 
                          className="opacity-60 hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded p-0.5 transition-all"
                          title={`Hapus ukuran ${s}`}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 relative z-10">
                    <input 
                      type="text" 
                      className="flex-1 px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none shadow-sm" 
                      placeholder="Ketik ukuran lalu Enter..." 
                      value={newSize}
                      onChange={e => setNewSize(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSize();
                        }
                      }}
                    />
                    <button 
                      onClick={handleAddSize} 
                      disabled={!newSize.trim()}
                      className="px-3 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-700 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      title="Tambah Ukuran"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* Colors Block */}
                <div className="relative p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden group hover:border-purple-300 dark:hover:border-purple-700/50 transition-colors">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 dark:bg-purple-900/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/20 transition-colors"></div>
                  
                  <label className="font-bold flex items-center justify-between text-sm mb-4 relative z-10">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">🎨 Warna (Color)</span>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded text-xs font-bold">{colors.length}</span>
                  </label>
                  
                  <div className="flex flex-wrap gap-2 mb-5 min-h-[44px] relative z-10 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    {colors.length === 0 && <span className="text-xs text-slate-400 italic flex items-center my-auto px-1">Belum ada warna, tambahkan di bawah 👇</span>}
                    {colors.map(c => (
                      <span 
                        key={c} 
                        className="group/tag inline-flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold px-2.5 py-1.5 rounded-md border border-purple-200 dark:border-purple-800/60 shadow-sm text-sm"
                      >
                        {c} 
                        <button 
                          onClick={() => handleRemoveColor(c)} 
                          className="opacity-60 hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded p-0.5 transition-all"
                          title={`Hapus warna ${c}`}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 relative z-10">
                    <input 
                      type="text" 
                      className="flex-1 px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none shadow-sm" 
                      placeholder="Ketik warna lalu Enter..." 
                      value={newColor}
                      onChange={e => setNewColor(e.target.value)}
                      onKeyDown={e => {
                         if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddColor();
                        }
                      }}
                    />
                    <button 
                      onClick={handleAddColor} 
                      disabled={!newColor.trim()}
                      className="px-3 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-slate-700 dark:text-purple-400 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      title="Tambah Warna"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Footer / Action Bar */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
          
          <div className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            Pastikan data sudah benar sebelum mendownload!
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={handleClose} 
              className="px-5 py-2.5 rounded-lg font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex-1 sm:flex-none border border-transparent"
            >
              Batalkan
            </button>
            <button 
              onClick={handleGenerate} 
              disabled={isLoading || totalVariants === 0}
              className={`px-6 py-2.5 rounded-lg font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none ${isLoading || totalVariants === 0 ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5'}`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses...
                </>
              ) : (
                <>
                  <Zap size={18} /> 
                  Generate {totalVariants} Varian
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
