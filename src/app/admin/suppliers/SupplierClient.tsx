'use client';

import { useState } from 'react';
import { Users, Plus, Phone, MapPin, MoreVertical, Trash2, ExternalLink, UserCircle } from 'lucide-react';
import { createSupplier, deleteSupplier, updateSupplier } from '@/app/actions/suppliers';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';

export default function SupplierClient({ initialSuppliers }: { initialSuppliers: any[] }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', contactPerson: '', phone: '', address: '', notes: '' });
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return showToast('Nama wajib diisi', 'error');
    
    const res = await createSupplier(formData);
    if (res.success) {
      showToast('Supplier ditambahkan', 'success');
      setIsModalOpen(false);
      setFormData({ name: '', contactPerson: '', phone: '', address: '', notes: '' });
      // In a real app we'd refresh from server, for now local update
      window.location.reload();
    } else {
      showToast(res.error || 'Gagal menambahkan supplier', 'error');
    }
  };

  const handleDelete = async (s: any) => {
    const ok = await confirm({
      title: 'Hapus Supplier',
      message: `Yakin ingin menghapus ${s.name}?`,
      danger: true
    });
    if (!ok) return;
    
    const res = await deleteSupplier(s.id);
    if (res.success) {
      showToast('Supplier dihapus', 'success');
      setSuppliers(suppliers.filter(x => x.id !== s.id));
    } else {
      showToast(res.error || 'Gagal menghapus supplier', 'error');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="text-primary" /> Database Supplier
          </h1>
          <p className="text-muted">Kelola vendor kain, sablon, dan konveksi rekanan.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={18} /> Tambah Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((s) => (
          <div key={s.id} className="glass-card flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-primary font-bold text-xl">
                  {s.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold leading-none mb-1">{s.name}</h3>
                  <span className="text-[10px] text-muted uppercase tracking-wider">{s.contactPerson || 'No Contact Person'}</span>
                </div>
              </div>
              <button onClick={() => handleDelete(s)} className="text-muted hover:text-danger hover:bg-danger/10 p-2 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            </div>

            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-2 text-xs text-muted">
                <Phone size={14} /> {s.phone || '-'}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <MapPin size={14} /> {s.address || 'Alamat tidak diatur'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
               <div className="p-3 bg-white/5 rounded-xl text-center">
                  <span className="block text-[10px] text-muted mb-1">Total Transaksi</span>
                  <span className="font-bold">{s.totalTransactions}x</span>
               </div>
               <div className="p-3 bg-white/5 rounded-xl text-center">
                  <span className="block text-[10px] text-muted mb-1">Total Belanja</span>
                  <span className="font-bold text-primary">Rp {(s.totalSpend / 1000).toFixed(0)}k</span>
               </div>
            </div>
          </div>
        ))}

        {suppliers.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted border-2 border-dashed border-white/5 rounded-3xl">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p>Belum ada database supplier.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-card animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-6">Tambah Supplier Baru</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-muted block mb-1">Nama Supplier *</label>
                <input 
                  type="text" required className="input-field" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Contoh: PT. Kain Jaya"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted block mb-1">PIC (Orang Luar)</label>
                  <input 
                    type="text" className="input-field" 
                    value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">WhatsApp/Telp</label>
                  <input 
                    type="text" className="input-field" 
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Alamat Gudang</label>
                <textarea 
                  className="input-field" rows={2}
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                ></textarea>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Catatan</label>
                <input 
                  type="text" className="input-field" 
                  value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>
              <div className="flex gap-3 justify-end mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
