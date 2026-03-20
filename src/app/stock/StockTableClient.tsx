'use client';

import { useState } from 'react';
import { updateStock, updateMinStock } from '../actions/stock';

export default function StockTableClient({ initialProducts, categories }: { initialProducts: any[], categories: any[] }) {
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local state for optimistic UI updates
  const [products, setProducts] = useState(initialProducts);

  const filteredProducts = products.filter(p => {
    const matchesCategory = p.categoryId === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleStockChange = async (productId: string, newValue: number, previousValue: number) => {
    if (newValue === previousValue) return;
    
    // Optimistic update
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, currentStock: newValue } : p
    ));

    const result = await updateStock(productId, newValue, previousValue);
    if (!result.success) {
      // Revert on failure
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, currentStock: previousValue } : p
      ));
      alert(result.error);
    }
  };

  const handleMinStockChange = async (productId: string, newValue: number, previousValue: number) => {
    if (newValue === previousValue) return;
    
    // Optimistic update
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, minStock: newValue } : p
    ));

    const result = await updateMinStock(productId, newValue);
    if (!result.success) {
      // Revert on failure
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, minStock: previousValue } : p
      ));
      alert(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Tabs */}
      <div className="flex gap-4 items-center">
        <input 
          type="text" 
          placeholder="Cari SKU, Nama Produk..." 
          className="input-field" 
          style={{ maxWidth: '300px' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ flex: 1 }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`btn ${activeCategory === cat.id ? 'btn-primary' : 'btn-outline'}`}
              style={{ whiteSpace: 'nowrap' }}
            >
              <span style={{ marginRight: '0.5rem' }}>{cat.icon}</span> {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(var(--border), 0.5)', background: 'rgba(var(--surface-hover), 0.3)' }}>
                <th style={{ padding: '1rem' }}>SKU</th>
                <th style={{ padding: '1rem' }}>Nama Produk</th>
                <th style={{ padding: '1rem' }}>Stok</th>
                <th style={{ padding: '1rem' }}>Min Stok</th>
                <th style={{ padding: '1rem' }}>Harga</th>
                <th style={{ padding: '1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }} className="text-muted">
                    Tidak ada produk ditemukan.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const isLowStock = product.currentStock <= product.minStock;
                  return (
                    <tr key={product.id} style={{ borderBottom: '1px solid rgba(var(--border), 0.2)' }} className="hover-bg">
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }} className="text-muted">{product.sku}</td>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>
                        <div className="flex flex-col">
                          <span>{product.name}</span>
                          {product.color && <span style={{ fontSize: '0.75rem' }} className="text-muted">{product.color} • {product.size}</span>}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <input 
                          type="number" 
                          defaultValue={product.currentStock}
                          className="input-field"
                          style={{ width: '80px', padding: '0.25rem 0.5rem' }}
                          onBlur={(e) => handleStockChange(product.id, parseInt(e.target.value) || 0, product.currentStock)}
                        />
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <input 
                          type="number" 
                          defaultValue={product.minStock}
                          className="input-field"
                          style={{ width: '80px', padding: '0.25rem 0.5rem' }}
                          onBlur={(e) => handleMinStockChange(product.id, parseInt(e.target.value) || 0, product.minStock)}
                        />
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {product.unitPrice ? `Rp ${product.unitPrice.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {isLowStock ? (
                          <span className="badge badge-warning">Rendah</span>
                        ) : (
                          <span className="badge badge-success">Aman</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
