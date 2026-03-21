'use client';

import { useState } from 'react';
import { createOrder } from '../../actions/orders';
import { useToast } from '@/components/Toast';

type OrderItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export default function NewOrderForm({ products, initialCustomerName = '', initialPlatform = '' }: { products: any[], initialCustomerName?: string, initialPlatform?: string }) {
  const { showToast } = useToast();
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [platform, setPlatform] = useState(initialPlatform || 'shopee');
  const [items, setItems] = useState<OrderItem[]>([{ productId: '', quantity: 1, unitPrice: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto populate price based on selected product
    if (field === 'productId') {
      const selectedProd = products.find(p => p.id === value);
      if (selectedProd) {
        newItems[index].unitPrice = selectedProd.unitPrice || 0;
      }
    }
    
    setItems(newItems);
  };

  const totalPrice = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) return showToast('Nama pelanggan wajib diisi', 'error');
    if (items.some(i => !i.productId || i.quantity <= 0)) return showToast('Pilih produk dan pastikan jumlah valid', 'error');

    setIsSubmitting(true);
    const res = await createOrder({ customerName, platform, items, totalPrice });
    setIsSubmitting(false);

    if (res.success) {
      showToast('Pesanan berhasil dibuat!', 'success');
      window.location.href = '/orders'; // Redirect ke history order
    } else {
      showToast(res.error || 'Gagal membuat pesanan', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 mobile-col">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Nama Pelanggan / Resi</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Misal: Budi / JNT-12345"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Platform</label>
          <select 
            className="input-field"
            value={platform}
            onChange={e => setPlatform(e.target.value)}
          >
            <option value="shopee">Shopee</option>
            <option value="tiktok">TikTok Shop</option>
            <option value="tokopedia">Tokopedia</option>
            <option value="whatsapp">WhatsApp / Manual</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="border-b border-[rgba(var(--border),0.5)] pb-2">Daftar Produk</h3>
        
        {items.map((item, index) => (
          <div key={index} className="flex gap-4 items-end mobile-col">
            <div className="flex flex-col gap-2" style={{ flex: 2 }}>
              <label className="text-sm font-semibold">Pilih Produk</label>
              <select 
                className="input-field"
                value={item.productId}
                onChange={e => handleItemChange(index, 'productId', e.target.value)}
              >
                <option value="">-- Pilih Produk --</option>
                {products.map(p => {
                  const outOfStock = p.currentStock <= 0;
                  return (
                  <option key={p.id} value={p.id} disabled={outOfStock}>
                    {p.sku} - {p.name} {p.color} {p.size} {outOfStock ? '(HABIS)' : `(${p.currentStock})`}
                  </option>
                )})}
              </select>
            </div>
            <div className="flex flex-col gap-2" style={{ flex: 1 }}>
              <label className="text-sm font-semibold">Jumlah</label>
              <input 
                type="number" 
                min="1"
                className="input-field"
                value={item.quantity}
                onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex flex-col gap-2" style={{ flex: 1 }}>
              <label className="text-sm font-semibold">Harga Satuan</label>
              <input 
                type="number" 
                className="input-field"
                value={item.unitPrice}
                onChange={e => handleItemChange(index, 'unitPrice', parseInt(e.target.value) || 0)}
              />
            </div>
            {items.length > 1 && (
              <button 
                type="button" 
                onClick={() => removeItem(index)}
                className="btn btn-danger" 
                style={{ height: '45px', width: '45px', padding: 0 }}
              >
                🗑️
              </button>
            )}
          </div>
        ))}
        
        <div>
          <button type="button" onClick={addItem} className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
            + Tambah Produk Lain
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 border-t border-[rgba(var(--border),0.5)] pt-4">
        <div className="flex flex-col">
          <span className="text-sm text-muted">Total Harga</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>Rp {totalPrice.toLocaleString('id-ID')}</span>
        </div>
        <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} disabled={isSubmitting}>
          {isSubmitting ? 'Memproses...' : 'Buat Pesanan'}
        </button>
      </div>
    </form>
  );
}
