'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Plus, Zap } from 'lucide-react';
import { updateStock, updateMinStock } from '../actions/stock';
import { deleteProduct, deleteProductsBulk } from '../actions/product';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import VariantGenerator from '@/components/stock/VariantGenerator';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

export default function StockTableClient({ initialProducts, categories }: { initialProducts: any[], categories: any[] }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  
  const { data: serverProducts } = useSWR('/api/stock', fetcher, {
    fallbackData: initialProducts,
    refreshInterval: 15000, // F8: reduced from 5s to 15s
  });

  const [products, setProducts] = useState(initialProducts);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    if (serverProducts) setProducts(serverProducts);
  }, [serverProducts]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredProducts = products.filter((p: any) => {
    const matchesCategory = p.categoryId === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

  // Handle Select All based on CURRENT page items
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSelections = currentItems.map(p => p.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...newSelections])));
    } else {
      const currentIds = currentItems.map(p => p.id);
      setSelectedIds(selectedIds.filter(id => !currentIds.includes(id)));
    }
  };

  const handleSelect = (productId: string) => {
    if (selectedIds.includes(productId)) {
      setSelectedIds(selectedIds.filter(id => id !== productId));
    } else {
      setSelectedIds([...selectedIds, productId]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirm({
      title: '🗑️ Hapus Bulk',
      message: `Yakin ingin menghapus ${selectedIds.length} produk terpilih? Semua produk dan riwayatnya akan terhapus permanen.`,
      confirmText: 'Hapus Semua',
      danger: true,
    });
    if (!ok) return;

    const res = await deleteProductsBulk(selectedIds);
    if (res.success) {
      showToast(`${selectedIds.length} produk dihapus`, 'success');
      setProducts(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
    } else {
      showToast(res.error || 'Gagal menghapus produk massal', 'error');
    }
  };

  const handleStockChange = async (productId: string, newValue: number, previousValue: number) => {
    if (newValue === previousValue) return;
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, currentStock: newValue } : p));
    const result = await updateStock(productId, newValue, previousValue);
    if (!result.success) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, currentStock: previousValue } : p));
      showToast(result.error || 'Gagal update stok', 'error');
    }
  };

  const handleMinStockChange = async (productId: string, newValue: number, previousValue: number) => {
    if (newValue === previousValue) return;
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, minStock: newValue } : p));
    const result = await updateMinStock(productId, newValue);
    if (!result.success) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, minStock: previousValue } : p));
      showToast(result.error || 'Gagal update min stok', 'error');
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    const ok = await confirm({
      title: '🗑️ Hapus Produk',
      message: `Yakin ingin menghapus "${productName}"? Semua data riwayat stok produk ini juga akan terhapus. Aksi ini tidak bisa dibatalkan.`,
      confirmText: 'Hapus Permanen',
      danger: true,
    });
    if (!ok) return;
    const res = await deleteProduct(productId);
    if (res.success) {
      showToast('Produk berhasil dihapus', 'success');
      setProducts(prev => prev.filter(p => p.id !== productId));
    } else {
      showToast(res.error || 'Gagal menghapus', 'error');
    }
  };

  const handleExportCSV = () => {
    const sanitize = (str: string) => str ? str.toString().replace(/^[=+\-@]/, "'$&") : '';
    const headers = ['SKU', 'Nama Produk', 'Warna', 'Ukuran', 'Stok Aktual', 'Min Stok', 'Harga Jual (Rp)'];
    const rows = filteredProducts.map(p => [
      sanitize(p.sku), `"${sanitize(p.name)}"`, sanitize(p.color || ''), sanitize(p.size || ''), p.currentStock, p.minStock, p.unitPrice || 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Stok_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Berhasil download CSV', 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end mobile-col gap-4">
          <div className="flex flex-col flex-1 w-full gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative" title="Live Sync Active">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[rgb(var(--success))] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[rgb(var(--success))]"></span>
              </span>
              <span className="text-xs text-muted">Auto-sync aktif (15 dtk)</span>
            </div>
            <input 
              type="text" 
              placeholder="Cari SKU, Nama Produk..." 
              className="input-field touch-target" 
              style={{ width: '100%' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <button onClick={handleBulkDelete} className="btn touch-target flex-shrink-0" style={{ background: 'rgba(var(--danger), 0.1)', color: 'rgb(var(--danger))', border: '1px solid rgba(var(--danger), 0.3)' }}>
                🗑️ Hapus {selectedIds.length}
              </button>
            )}
            <button onClick={() => setIsVariantModalOpen(true)} className="btn btn-outline touch-target" style={{ borderStyle: 'dashed', borderColor: 'rgb(var(--primary))', color: 'rgb(var(--primary))' }}>
              <Zap size={16} /> Bulk Varian
            </button>
            <button onClick={handleExportCSV} className="btn btn-outline touch-target flex-shrink-0">
              📊 Export CSV
            </button>
            <Link href="/stock/new" className="btn btn-primary touch-target">
              <Plus size={16} /> Produk Baru
            </Link>
          </div>
        </div>

        {isVariantModalOpen && (
          <VariantGenerator 
            categories={categories} 
            onClose={() => {
              setIsVariantModalOpen(false);
              window.location.reload();
            }} 
          />
        )}
        <div className="flex gap-2 overflow-x-auto pb-2 mobile-scroll-x" style={{ flex: 1 }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`btn touch-target ${activeCategory === cat.id ? 'btn-primary' : 'btn-outline'}`}
              style={{ whiteSpace: 'nowrap' }}
            >
              <span style={{ marginRight: '0.5rem' }}>{cat.icon}</span> {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table View — A4: with actions, links, zebra striping */}
      <div className="glass-card desktop-only-table mobile-hidden" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(var(--border), 0.5)', background: 'rgba(var(--surface-hover), 0.3)' }}>
                <th style={{ padding: '0.85rem 1rem', width: '40px' }}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={currentItems.length > 0 && currentItems.every(p => selectedIds.includes(p.id))}
                    className="accent-[rgb(var(--primary))]"
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => handleSort('sku')}>
                  SKU {sortConfig?.key === 'sku' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={{ padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                  Nama Produk {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={{ padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => handleSort('currentStock')}>
                  Stok {sortConfig?.key === 'currentStock' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={{ padding: '0.85rem 1rem' }}>Min Stok</th>
                <th style={{ padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => handleSort('unitPrice')}>
                  Harga {sortConfig?.key === 'unitPrice' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center' }} className="text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <span style={{ fontSize: '2rem' }}>📦</span>
                      <span>Tidak ada produk ditemukan.</span>
                      <Link href="/stock/new" className="btn btn-primary" style={{ marginTop: '0.5rem', textDecoration: 'none' }}>+ Tambah Produk Pertama</Link>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((product, idx) => {
                  const isLowStock = product.currentStock <= product.minStock;
                  return (
                    <tr key={product.id} className={`zebra-row ${isLowStock ? 'low-stock-row' : ''} ${selectedIds.includes(product.id) ? 'bg-[rgba(var(--primary),0.05)]' : ''}`}
                      style={{ borderBottom: '1px solid rgba(var(--border), 0.15)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(product.id)}
                          onChange={() => handleSelect(product.id)}
                          className="accent-[rgb(var(--primary))]"
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem' }} className="text-muted">{product.sku}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <Link href={`/stock/${product.id}`} className="product-link">
                          <div className="flex flex-col">
                            <span>{product.name}</span>
                            {product.color && <span style={{ fontSize: '0.72rem' }} className="text-muted">{product.color} • {product.size}</span>}
                          </div>
                        </Link>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <input 
                          type="number" 
                          defaultValue={product.currentStock}
                          className="input-field"
                          style={{ width: '90px', padding: '0.3rem 0.5rem' }}
                          min="0"
                          onBlur={(e) => handleStockChange(product.id, parseInt(e.target.value) || 0, product.currentStock)}
                        />
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <input 
                          type="number" 
                          defaultValue={product.minStock}
                          className="input-field"
                          style={{ width: '80px', padding: '0.3rem 0.5rem' }}
                          min="0"
                          onBlur={(e) => handleMinStockChange(product.id, parseInt(e.target.value) || 0, product.minStock)}
                        />
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {product.unitPrice ? `Rp ${product.unitPrice.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isLowStock ? (
                          <span className="badge badge-warning">Rendah</span>
                        ) : (
                          <span className="badge badge-success">Aman</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/stock/${product.id}`} className="btn-ghost" title="Detail" style={{ textDecoration: 'none' }}>👁️</Link>
                          <button onClick={() => handleDelete(product.id, product.name)} className="btn-icon-danger" title="Hapus">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t" style={{ borderColor: 'rgba(var(--border), 0.4)' }}>
            <span className="text-sm text-muted">Halaman {currentPage} dari {totalPages}</span>
            <div className="flex gap-2">
              <button className="btn btn-outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '0.4rem 0.8rem' }}>←</button>
              <button className="btn btn-outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '0.4rem 0.8rem' }}>→</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card List View */}
      <div className="mobile-card-list desktop-hidden">
        {currentItems.length === 0 ? (
          <div className="text-center text-muted p-4">
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📦</span>
            Tidak ada produk ditemukan.
          </div>
        ) : (
          currentItems.map(product => {
            const isLowStock = product.currentStock <= product.minStock;
            return (
              <div key={product.id} className={`mobile-card-item ${selectedIds.includes(product.id) ? 'border-[rgb(var(--primary))]' : ''}`} style={isLowStock ? { borderColor: 'rgba(var(--danger), 0.3)' } : {}}>
                <div className="flex gap-3 relative">
                  <div className="pt-1">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(product.id)}
                      onChange={() => handleSelect(product.id)}
                      className="accent-[rgb(var(--primary))]"
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>
                  <div className="flex justify-between items-start flex-1">
                    <Link href={`/stock/${product.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                      <div className="flex flex-col">
                        <span style={{ fontWeight: 600 }}>{product.name}</span>
                        <span style={{ fontSize: '0.75rem' }} className="text-muted">{product.sku}</span>
                        {product.color && <span style={{ fontSize: '0.75rem' }} className="text-muted mt-1">{product.color} • {product.size}</span>}
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      {isLowStock ? <span className="badge badge-warning">Rendah</span> : <span className="badge badge-success">Aman</span>}
                      <button onClick={() => handleDelete(product.id, product.name)} className="btn-icon-danger">🗑️</button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-4 mt-2 pt-3" style={{ borderTop: '1px solid rgba(var(--border), 0.3)' }}>
                  <div className="flex flex-col gap-1 w-full">
                    <span style={{ fontSize: '0.75rem' }} className="text-muted">Stok Aktual / Min</span>
                    <div className="flex items-center gap-2">
                       <input type="number" defaultValue={product.currentStock} className="input-field touch-target"
                         style={{ padding: '0.5rem', flex: 1 }} min="0"
                         onBlur={(e) => handleStockChange(product.id, parseInt(e.target.value) || 0, product.currentStock)} />
                       <span style={{ opacity: 0.5 }}>/</span>
                       <input type="number" defaultValue={product.minStock} className="input-field touch-target"
                         style={{ padding: '0.5rem', width: '70px' }} min="0"
                         onBlur={(e) => handleMinStockChange(product.id, parseInt(e.target.value) || 0, product.minStock)} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
