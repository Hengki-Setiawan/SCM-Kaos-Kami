'use client';

import { useState } from 'react';
import { createExpense } from '../actions/expenses';
import { useToast } from '@/components/Toast';

export default function ExpenseForm({ onRefresh }: { onRefresh: () => void }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'operasional',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const categories = [
    { value: 'operasional', label: '🛠️ Operasional' },
    { value: 'gaji', label: '👥 Gaji Karyawan' },
    { value: 'iklan', label: '📢 Iklan / Ads' },
    { value: 'bahanbaku', label: '🧵 Bahan Baku' },
    { value: 'sewa', label: '🏠 Sewa Tempat' },
    { value: 'lainnya', label: '📦 Lain-lain' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createExpense({
      ...formData,
      amount: parseFloat(formData.amount)
    });
    setLoading(false);

    if (res.success) {
      showToast('Pengeluaran berhasil dicatat', 'success');
      setFormData({ ...formData, title: '', amount: '', notes: '' });
      onRefresh();
    } else {
      showToast(res.error || 'Gagal menyimpan', 'error');
    }
  };

  return (
    <div className="glass-card mb-6">
      <h3 className="mb-4">➕ Catat Pengeluaran Baru</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Judul Pengeluaran</label>
          <input 
            type="text" 
            required 
            placeholder="Contoh: Beli lakban 5 roll"
            className="input-field"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Kategori</label>
          <select 
            className="input-field"
            value={formData.category}
            onChange={e => setFormData({...formData, category: e.target.value})}
          >
            {categories.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Nominal (Rp)</label>
          <input 
            type="number" 
            required 
            placeholder="0"
            className="input-field"
            value={formData.amount}
            onChange={e => setFormData({...formData, amount: e.target.value})}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Tanggal</label>
          <input 
            type="date" 
            required 
            className="input-field"
            value={formData.date}
            onChange={e => setFormData({...formData, date: e.target.value})}
          />
        </div>

        <div className="md:col-span-2 flex flex-col gap-1">
          <label className="text-xs text-muted">Catatan Tambahan (Opsional)</label>
          <textarea 
            rows={2}
            className="input-field"
            placeholder="Keterangan lebih detail..."
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </div>

        <div className="md:col-span-2 pt-2">
          <button disabled={loading} className="btn btn-primary w-full">
            {loading ? '⌛ Menyimpan...' : '💾 Simpan Pengeluaran'}
          </button>
        </div>
      </form>
    </div>
  );
}
