'use client';

import { deleteExpense } from '../actions/expenses';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';

export default function ExpenseList({ expenses }: { expenses: any[] }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const categories: Record<string, string> = {
    operasional: '🛠️ Operasional',
    gaji: '👥 Gaji',
    iklan: '📢 Iklan',
    bahanbaku: '🧵 Bahan Baku',
    sewa: '🏠 Sewa',
    lainnya: '📦 Lainnya',
  };

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: '🗑️ Hapus Pengeluaran',
      message: `Yakin ingin menghapus catatan "${title}"?`,
      confirmText: 'Hapus',
      danger: true
    });
    if (!ok) return;

    const res = await deleteExpense(id);
    if (res.success) {
      showToast('Berhasil dihapus', 'success');
    } else {
      showToast(res.error || 'Gagal hapus', 'error');
    }
  };

  const totalAmount = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="glass-card">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg">📜 Riwayat Pengeluaran</h3>
        <div className="text-right">
          <span className="text-xs text-muted block italic">Total Terdaftar</span>
          <span className="text-xl font-bold text-[rgb(var(--danger))]">
            - Rp {new Intl.NumberFormat('id-ID').format(totalAmount)}
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(var(--border), 0.3)' }}>
              <th style={{ padding: '0.85rem' }}>Tanggal</th>
              <th style={{ padding: '0.85rem' }}>Judul / Kategori</th>
              <th style={{ padding: '0.85rem' }}>Nominal</th>
              <th style={{ padding: '0.85rem', textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center' }} className="text-muted italic">
                  Belum ada catatan pengeluaran.
                </td>
              </tr>
            ) : (
              expenses.map(exp => (
                <tr key={exp.id} className="zebra-row" style={{ borderBottom: '1px solid rgba(var(--border), 0.1)' }}>
                  <td style={{ padding: '0.85rem', fontSize: '0.85rem' }}>
                    {exp.date}
                  </td>
                  <td style={{ padding: '0.85rem' }}>
                    <div className="flex flex-col">
                      <span className="font-semibold">{exp.title}</span>
                      <span className="text-xs text-muted uppercase tracking-wider">
                        {categories[exp.category] || exp.category}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem', fontWeight: 700, color: 'rgb(var(--danger))' }}>
                    Rp {new Intl.NumberFormat('id-ID').format(exp.amount)}
                  </td>
                  <td style={{ padding: '0.85rem', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleDelete(exp.id, exp.title)}
                      className="btn-icon-danger"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
