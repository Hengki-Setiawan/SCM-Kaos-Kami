'use client';

import { useState } from 'react';
import { createProduct } from '../../actions/product';
import { useToast } from '@/components/Toast';

export default function NewProductForm({ categories }: { categories: any[] }) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', sku: '', categoryId: categories[0]?.id || '', color: '', size: '',
    material: '', thickness: '', sleeveType: '', unit: 'pcs',
    unitPrice: 0, buyPrice: 0, minStock: 5,
  });

  const update = (field: string, value: any) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast('Nama produk wajib diisi', 'error');
    if (!form.sku.trim()) return showToast('SKU wajib diisi', 'error');

    setIsSubmitting(true);
    const res = await createProduct(form);
    setIsSubmitting(false);

    if (res.success) {
      showToast('Produk berhasil ditambahkan!', 'success');
      window.location.href = '/stock';
    } else {
      showToast(res.error || 'Gagal menambahkan produk', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Nama Produk *</label>
          <input className="input-field" placeholder="Kaos CoolDry Hitam" value={form.name} onChange={e => update('name', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">SKU *</label>
          <input className="input-field" placeholder="CL-HTM-PDK-L" value={form.sku} onChange={e => update('sku', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Kategori *</label>
          <select className="input-field" value={form.categoryId} onChange={e => update('categoryId', e.target.value)}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Warna</label>
          <input className="input-field" placeholder="Hitam" value={form.color} onChange={e => update('color', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Ukuran</label>
          <input className="input-field" placeholder="L / XL / All Size" value={form.size} onChange={e => update('size', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Bahan</label>
          <input className="input-field" placeholder="Cotton Combed 30s" value={form.material} onChange={e => update('material', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Ketebalan</label>
          <input className="input-field" placeholder="24s / 30s" value={form.thickness} onChange={e => update('thickness', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Tipe Lengan</label>
          <input className="input-field" placeholder="Pendek / Panjang" value={form.sleeveType} onChange={e => update('sleeveType', e.target.value)} />
        </div>
      </div>

      <div className="border-t pt-4" style={{ borderColor: 'rgba(var(--border), 0.5)' }}>
        <h3 className="mb-4">💰 Harga & Stok</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Harga Beli / Modal (Rp)</label>
            <input type="number" className="input-field" value={form.buyPrice} onChange={e => update('buyPrice', Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Harga Jual Satuan (Rp)</label>
            <input type="number" className="input-field" value={form.unitPrice} onChange={e => update('unitPrice', Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Minimum Stok</label>
            <input type="number" className="input-field" value={form.minStock} onChange={e => update('minStock', Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Satuan</label>
            <select className="input-field" value={form.unit} onChange={e => update('unit', e.target.value)}>
              <option value="pcs">pcs</option>
              <option value="lembar">lembar</option>
              <option value="roll">roll</option>
              <option value="meter">meter</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'rgba(var(--border), 0.5)' }}>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '0.75rem 2rem' }}>
          {isSubmitting ? 'Menyimpan...' : '✅ Simpan Produk Baru'}
        </button>
      </div>
    </form>
  );
}
