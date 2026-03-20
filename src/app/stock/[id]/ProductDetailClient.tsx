'use client';

import { useState } from 'react';
import { updateProductDetails } from '../../actions/product';

export default function ProductDetailClient({ initialProduct, categories, history }: any) {
  const [product, setProduct] = useState(initialProduct);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpdateField = (field: string, value: any) => {
    setProduct({ ...product, [field]: value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'scm_products');

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          handleUpdateField('imageUrl', data.url);
        } else {
          alert('Gagal upload gambar: ' + data.error);
        }
      } catch (err: any) {
        alert('Terdapat kesalahan jaringan saat upload.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const res = await updateProductDetails(product.id, product);
    setIsSaving(false);

    if (res.success) {
      alert('Perubahan berhasil disimpan!');
      setIsEditing(false);
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left Column - Image & Quick Edit */}
      <div className="flex flex-col gap-4 col-span-1">
        <div className="glass-card flex flex-col items-center">
          <div className="w-full h-64 bg-[rgba(var(--surface-hover),0.5)] rounded-xl flex items-center justify-center relative overflow-hidden mb-4">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">📦</span>
            )}
            
            {isEditing && (
              <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                <span>{isUploading ? 'Mengupload...' : 'Klik untuk ganti foto'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
              </label>
            )}
          </div>
          <h2 className="text-center w-full truncate">{product.name}</h2>
          <span className="text-muted text-sm">{product.sku}</span>
          
          <div className="w-full border-t border-[rgba(var(--border),0.5)] mt-4 pt-4 flex justify-between">
             <span className="text-muted text-sm">Stok Gudang</span>
             <span className="font-bold">{product.currentStock} {product.unit}</span>
          </div>
        </div>

        {/* History / Log */}
        <div className="glass-card">
          <h3 className="mb-4 text-sm font-semibold">Log Pergerakan Terakhir</h3>
          <div className="flex flex-col gap-3">
            {history.length === 0 ? <span className="text-muted text-sm">Belum ada riwayat.</span> : 
              history.map((log: any) => (
                <div key={log.id} className="flex justify-between items-start border-b border-[rgba(var(--border),0.2)] pb-2 text-sm">
                  <div className="flex flex-col">
                     <span>{log.type === 'ADJUSTMENT_IN' || log.type === 'CHECK_IN' ? '+' : '-'}{log.quantity}</span>
                     <span className="text-muted text-xs">{log.reason}</span>
                  </div>
                  <span className="text-xs text-muted">
                    {new Date(log.createdAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Right Column - Attributes */}
      <div className="col-span-2 flex flex-col gap-4">
        <div className="glass-card">
          <div className="flex justify-between items-center mb-6">
            <h3>Spesifikasi Produk</h3>
            {!isEditing ? (
              <button className="btn btn-outline" onClick={() => setIsEditing(true)}>✏️ Edit Detail</button>
            ) : (
              <div className="flex gap-2">
                <button className="btn text-muted" onClick={() => { setProduct(initialProduct); setIsEditing(false); }}>Batal</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Nama Produk</label>
              <input type="text" className="input-field" value={product.name} onChange={e => handleUpdateField('name', e.target.value)} disabled={!isEditing} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">SKU</label>
              <input type="text" className="input-field" value={product.sku} onChange={e => handleUpdateField('sku', e.target.value)} disabled={!isEditing} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Kategori</label>
              <select className="input-field" value={product.categoryId} onChange={e => handleUpdateField('categoryId', e.target.value)} disabled={!isEditing}>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Warna</label>
              <input type="text" className="input-field" value={product.color || ''} onChange={e => handleUpdateField('color', e.target.value)} disabled={!isEditing} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Ukuran</label>
              <input type="text" className="input-field" value={product.size || ''} onChange={e => handleUpdateField('size', e.target.value)} disabled={!isEditing} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Bahan Dasar (Material)</label>
              <input type="text" className="input-field" value={product.material || ''} onChange={e => handleUpdateField('material', e.target.value)} disabled={!isEditing} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Ketebalan (ex: 24s/30s)</label>
              <input type="text" className="input-field" value={product.thickness || ''} onChange={e => handleUpdateField('thickness', e.target.value)} disabled={!isEditing} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Tipe Lengan</label>
              <input type="text" className="input-field" value={product.sleeveType || ''} onChange={e => handleUpdateField('sleeveType', e.target.value)} disabled={!isEditing} />
            </div>
          </div>
          
          <div className="border-t border-[rgba(var(--border),0.5)] mt-6 pt-6 grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Harga Beli / Modal (Rp)</label>
              <input type="number" className="input-field" value={product.buyPrice || 0} onChange={e => handleUpdateField('buyPrice', Number(e.target.value))} disabled={!isEditing} />
            </div>
            <div className="flex flex-col gap-1">
               <label className="text-xs text-muted">Harga Jual Satuan (Rp)</label>
               <input type="number" className="input-field" value={product.unitPrice || 0} onChange={e => handleUpdateField('unitPrice', Number(e.target.value))} disabled={!isEditing} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
