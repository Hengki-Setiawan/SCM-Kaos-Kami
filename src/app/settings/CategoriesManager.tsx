'use client';

import { useState } from 'react';
import { createCategory, deleteCategory } from '../actions/categories';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';

export default function CategoriesManager({ initialCategories }: { initialCategories: any[] }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📁');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return showToast('Nama kategori wajib', 'error');
    setIsAdding(true);
    const res = await createCategory({ name: newName, icon: newIcon });
    setIsAdding(false);
    if (res.success) {
      showToast('Kategori ditambahkan!', 'success');
      setNewName('');
      setNewIcon('📁');
      window.location.reload();
    } else {
      showToast(res.error || 'Gagal', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({ title: '🗑️ Hapus Kategori', message: `Hapus kategori "${name}"?`, confirmText: 'Hapus', danger: true });
    if (!ok) return;
    const res = await deleteCategory(id);
    if (res.success) {
      showToast('Kategori dihapus', 'success');
      setCategories(prev => prev.filter(c => c.id !== id));
    } else {
      showToast(res.error || 'Gagal menghapus', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {categories.map(cat => (
          <div key={cat.id} className="p-3 rounded-lg flex items-center gap-2" style={{ background: 'rgba(var(--surface-hover), 0.3)' }}>
            <span className="text-xl">{cat.icon || '📁'}</span>
            <div style={{ flex: 1 }}>
              <span className="font-semibold text-sm">{cat.name}</span>
              <span className="block text-xs text-muted">{cat.slug}</span>
            </div>
            <button onClick={() => handleDelete(cat.id, cat.name)} className="btn-icon-danger" title="Hapus">✕</button>
          </div>
        ))}
      </div>

      {/* Add Category Inline Form */}
      <div className="flex items-end gap-2 pt-3 border-t" style={{ borderColor: 'rgba(var(--border), 0.4)' }}>
        <div className="flex flex-col gap-1" style={{ width: 50 }}>
          <label className="text-xs text-muted">Ikon</label>
          <input className="input-field" value={newIcon} onChange={e => setNewIcon(e.target.value)} style={{ textAlign: 'center', padding: '0.5rem' }} />
        </div>
        <div className="flex flex-col gap-1" style={{ flex: 1 }}>
          <label className="text-xs text-muted">Nama Kategori</label>
          <input className="input-field" placeholder="Misal: Stiker" value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        </div>
        <button onClick={handleAdd} className="btn btn-primary" disabled={isAdding} style={{ height: 42 }}>
          {isAdding ? '...' : '+ Tambah'}
        </button>
      </div>
    </div>
  );
}
