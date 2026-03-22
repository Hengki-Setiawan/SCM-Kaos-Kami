'use client';

import { useState } from 'react';
import { updateProductDetails, deleteProduct } from '../../actions/product';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import Image from 'next/image';
import Link from 'next/link';

export default function ProductDetailClient({ initialProduct, categories, history }: any) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
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
          showToast('Gagal upload gambar: ' + data.error, 'error');
        }
      } catch (err: any) {
        showToast('Terdapat kesalahan jaringan saat upload.', 'error');
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
      showToast('Perubahan berhasil disimpan!', 'success');
      setIsEditing(false);
    } else {
      showToast(res.error || 'Gagal menyimpan', 'error');
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: '🗑️ Hapus Produk', message: `Hapus "${product.name}" secara permanen?`, confirmText: 'Hapus', danger: true });
    if (!ok) return;
    const res = await deleteProduct(product.id);
    if (res.success) { showToast('Produk dihapus', 'success'); window.location.href = '/stock'; }
    else showToast(res.error || 'Gagal menghapus', 'error');
  };

  return (
    <div className="product-detail-grid">
      {/* Left Column - Image & Quick Edit */}
      <div className="flex flex-col gap-4" style={{ gridColumn: 'span 1' }}>
        <div className="glass-card flex flex-col items-center">
          <div className="product-img-container">
            {product.imageUrl ? (
              <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 300px" />
            ) : (
              <span className="text-6xl">📦</span>
            )}
            
            {isEditing && (
              <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                <span>{isUploading ? 'Mengupload...' : 'Klik untuk ganti foto'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
              </label>
            )}
          </div>
          <h2 className="text-center w-full" style={{ wordBreak: 'break-word', lineHeight: 1.3 }}>{product.name}</h2>
          <span className="text-muted text-sm" style={{ wordBreak: 'break-all' }}>{product.sku}</span>
          
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
      <div className="flex flex-col gap-4">
        <div className="glass-card">
          <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>Spesifikasi Produk</h3>
            {!isEditing ? (
              <div className="flex gap-2">
                <button className="btn btn-outline" onClick={() => setIsEditing(true)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', minHeight: '36px' }}>✏️ Edit</button>
                <button className="btn-icon-danger" onClick={handleDelete} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: '36px' }}>🗑️ Hapus</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button className="btn text-muted" onClick={() => { setProduct(initialProduct); setIsEditing(false); }}>Batal</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            )}
          </div>

          <div className="product-spec-grid">
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
          
          <div className="border-t border-[rgba(var(--border),0.5)] mt-6 pt-6 product-spec-grid">
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
