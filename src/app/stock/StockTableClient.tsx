'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Plus, Zap, ChevronRight, ChevronDown } from 'lucide-react';
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);

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

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // Grouping Logic
  const getBaseName = (name: string) => {
    // Gunakan word boundary \b agar tidak memotong kata seperti "Skizo" (karena ada 'S')
    return name.replace(/\s+\b(S|M|L|XL|XXL|2XL|3XL|4XL|5XL)\b.*/i, '').trim();
  };

  const groupedProducts = filteredProducts.reduce((acc: any[], p: any) => {
    const baseName = getBaseName(p.name);
    const color = p.color || 'No Color';
    const groupKey = `${p.categoryId}-${baseName}-${color}`;
    
    let group = acc.find(g => g.groupKey === groupKey);
    if (!group) {
      group = {
        groupKey,
        isGroup: true,
        baseName,
        color: p.color,
        categoryId: p.categoryId,
        totalStock: 0,
        variants: [],
        minStockSum: 0,
        isLowStock: false
      };
      acc.push(group);
    }
    
    group.variants.push(p);
    group.totalStock += p.currentStock;
    group.minStockSum += p.minStock;
    if (p.currentStock <= p.minStock && !(p.currentStock === 0 && p.minStock === 0)) group.isLowStock = true;
    
    return acc;
  }, []);

  const sortedGroups = [...groupedProducts].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const valA = key === 'currentStock' ? a.totalStock : a[key];
    const valB = key === 'currentStock' ? b.totalStock : b[key];
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGroups = sortedGroups.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedGroups.length / itemsPerPage);

  const handleSelectGroup = (group: any, checked: boolean) => {
    const variantIds = group.variants.map((v: any) => v.id);
    if (checked) {
      setSelectedIds(Array.from(new Set([...selectedIds, ...variantIds])));
    } else {
      setSelectedIds(selectedIds.filter(id => !variantIds.includes(id)));
    }
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
              className={`btn touch-target no-shrink ${activeCategory === cat.id ? 'btn-primary' : 'btn-outline'}`}
            >
              <span>{cat.icon}</span> <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="glass-card desktop-only-table mobile-hidden" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(var(--border), 0.5)', background: 'rgba(var(--surface-hover), 0.3)' }}>
                <th style={{ padding: '0.85rem 1rem', width: '40px' }}>
                  <input 
                    type="checkbox" 
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allVarIds = currentGroups.flatMap(g => g.variants.map((v: any) => v.id));
                        setSelectedIds(Array.from(new Set([...selectedIds, ...allVarIds])));
                      } else {
                        const allVarIds = currentGroups.flatMap(g => g.variants.map((v: any) => v.id));
                        setSelectedIds(selectedIds.filter(id => !allVarIds.includes(id)));
                      }
                    }}
                    checked={currentGroups.length > 0 && currentGroups.every(g => g.variants.every((v: any) => selectedIds.includes(v.id)))}
                    className="accent-[rgb(var(--primary))]"
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '0.85rem 1rem' }}>Produk & Varian</th>
                <th style={{ padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => handleSort('currentStock')}>
                  Total Stok {sortConfig?.key === 'currentStock' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center' }} className="text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <span style={{ fontSize: '2rem' }}>📦</span>
                      <span>Tidak ada produk ditemukan.</span>
                      <Link href="/stock/new" className="btn btn-primary" style={{ marginTop: '0.5rem', textDecoration: 'none' }}>+ Tambah Produk Pertama</Link>
                    </div>
                  </td>
                </tr>
              ) : (
                currentGroups.map((group) => {
                  const isExpanded = expandedGroups.has(group.groupKey);
                  return (
                    <>
                      {/* Group Header Row */}
                      <tr 
                        key={group.groupKey} 
                        className={`grouped-row ${group.isLowStock ? 'low-stock-row' : ''}`}
                        onClick={() => toggleGroup(group.groupKey)}
                      >
                        <td style={{ padding: '0.85rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={group.variants.every((v: any) => selectedIds.includes(v.id))}
                            onChange={(e) => handleSelectGroup(group, e.target.checked)}
                            className="accent-[rgb(var(--primary))]"
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown size={18} className="text-primary" />
                            ) : (
                              <ChevronRight size={18} className="text-muted" />
                            )}
                            <span style={{ fontWeight: 600 }}>{group.baseName}</span>
                            {group.color && <span className="text-muted" style={{ fontSize: '0.8rem' }}>• {group.color}</span>}
                            <span className="group-badge">{group.variants.length} Varian</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{group.totalStock}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {group.isLowStock ? (
                            <span className="badge badge-warning">Rendah</span>
                          ) : (
                            <span className="badge badge-success">Aman</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <span className="text-xs text-muted">{isExpanded ? 'Tutup' : 'Lihat Produk'}</span>
                        </td>
                      </tr>

                      {/* Variant Rows (Expanded) */}
                      {isExpanded && group.variants.map((product: any) => (
                        <tr key={product.id} className="variant-row">
                          <td style={{ padding: '0.65rem 1rem 0.65rem 2.5rem' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(product.id)}
                              onChange={() => handleSelect(product.id)}
                              className="accent-[rgb(var(--primary))]"
                              style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <div className="variant-info">
                              <Link href={`/stock/${product.id}`} className="product-link" style={{ fontWeight: 600 }}>
                                {product.size} {product.thickness ? `• ${product.thickness}` : ''}
                              </Link>
                              <span className="text-xs text-muted" style={{ display: 'block' }}>{product.sku}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                             <div className="flex items-center gap-2">
                               <input 
                                  type="number" 
                                  defaultValue={product.currentStock}
                                  className="input-field"
                                  style={{ width: '70px', padding: '0.25rem 0.4rem', fontSize: '0.8rem' }}
                                  min="0"
                                  onBlur={(e) => handleStockChange(product.id, parseInt(e.target.value) || 0, product.currentStock)}
                                />
                                 <span className="text-xs text-muted">/ min:</span>
                                 <input 
                                    type="number" 
                                    defaultValue={product.minStock}
                                    className="input-field"
                                    style={{ width: '60px', padding: '0.25rem 0.4rem', fontSize: '0.8rem', marginLeft: '4px' }}
                                    min="0"
                                    onBlur={(e) => handleMinStockChange(product.id, parseInt(e.target.value) || 0, product.minStock)}
                                  />
                             </div>
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            {product.currentStock <= product.minStock && !(product.currentStock === 0 && product.minStock === 0) ? (
                              <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>Rendah</span>
                            ) : (
                              <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>Aman</span>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/stock/${product.id}`} className="btn-ghost" title="Detail">👁️</Link>
                              <button onClick={() => handleDelete(product.id, product.name)} className="btn-icon-danger" title="Hapus">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
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

      {/* Mobile Card List View - Simplified for Grouped */}
      <div className="mobile-card-list desktop-hidden">
        {currentGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-muted gap-2 text-center" style={{ minHeight: '20vh' }}>
            <span className="text-4xl opacity-50 mb-2">📦</span>
            <span className="font-medium text-sm">Tidak ada produk ditemukan</span>
          </div>
        ) : (
          currentGroups.map(group => {
            const isExpanded = expandedGroups.has(group.groupKey);
            return (
              <div key={group.groupKey} className="mobile-card-item" style={{ overflow: 'hidden' }}>
                <div className="flex flex-col gap-2" onClick={() => toggleGroup(group.groupKey)}>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span style={{ fontWeight: 600 }}>{group.baseName}</span>
                      <span className="text-xs text-muted">{group.color} • {group.variants.length} Varian</span>
                    </div>
                    {group.isLowStock ? <span className="badge badge-warning">Rendah</span> : <span className="badge badge-success">Aman</span>}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xl font-bold">{group.totalStock} <span className="text-xs font-normal text-muted">pcs</span></span>
                    <div className="flex items-center gap-1 text-xs text-[rgb(var(--primary))] font-semibold">
                      {isExpanded ? (
                        <>Sembunyikan <ChevronDown size={14} /></>
                      ) : (
                        <>Lihat Varian <ChevronRight size={14} /></>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 flex flex-col gap-4 border-t border-[rgba(var(--border),0.4)]">
                    {group.variants.map((product: any) => (
                      <div key={product.id} className="flex flex-col gap-2 p-2 rounded bg-[rgba(var(--primary),0.02)] border border-[rgba(var(--primary),0.05)]">
                        <div className="flex justify-between">
                          <span className="text-xs font-bold">{product.size} {product.thickness ? `• ${product.thickness}` : ''}</span>
                          <span className="text-xs text-muted">{product.sku}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                           <div className="flex items-center gap-2">
                             <input type="number" defaultValue={product.currentStock} className="input-field" 
                               style={{ padding: '0.4rem', width: '60px', height: '32px' }}
                               onBlur={(e) => handleStockChange(product.id, parseInt(e.target.value) || 0, product.currentStock)} />
                             <span className="text-xs text-muted">/ min:</span>
                             <input type="number" defaultValue={product.minStock} className="input-field" 
                               style={{ padding: '0.4rem', width: '50px', height: '32px', marginLeft: '4px' }}
                               onBlur={(e) => handleMinStockChange(product.id, parseInt(e.target.value) || 0, product.minStock)} />
                           </div>
                           <div className="flex gap-1">
                             <Link href={`/stock/${product.id}`} className="btn-ghost" style={{ padding: 4 }}>👁️</Link>
                             <button onClick={() => handleDelete(product.id, product.name)} className="btn-icon-danger" style={{ padding: 4 }}>🗑️</button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
