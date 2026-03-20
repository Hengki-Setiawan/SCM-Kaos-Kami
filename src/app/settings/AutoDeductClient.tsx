'use client';

import { useState } from 'react';
import { saveAutoDeductRule } from '../actions/settings';

type AutoDeductItem = {
  productId: string;
  quantity: number;
};

export default function AutoDeductClient({ 
  initialItems, 
  availableProducts,
  ruleId
}: { 
  initialItems: AutoDeductItem[]; 
  availableProducts: any[];
  ruleId: string | undefined;
}) {
  const [items, setItems] = useState<AutoDeductItem[]>(
    initialItems.length > 0 ? initialItems : [{ productId: '', quantity: 1 }]
  );
  const [isSaving, setIsSaving] = useState(false);

  const addItem = () => setItems([...items, { productId: '', quantity: 1 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleUpdate = (index: number, field: keyof AutoDeductItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSave = async () => {
    // Filter out empty rows
    const validItems = items.filter(i => i.productId && i.quantity > 0);
    
    setIsSaving(true);
    const res = await saveAutoDeductRule(ruleId, validItems);
    setIsSaving(false);

    if (res.success) {
      alert('Aturan berhasil disimpan!');
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, index) => (
        <div key={index} className="flex gap-4 items-end bg-[rgba(var(--surface-hover),0.3)] p-4 rounded-xl">
          <div className="flex flex-col gap-2" style={{ flex: 2 }}>
            <label className="text-sm font-semibold">Pilih Packaging / Bahan</label>
            <select 
              className="input-field"
              value={item.productId}
              onChange={e => handleUpdate(index, 'productId', e.target.value)}
            >
              <option value="">-- Pilih Produk --</option>
              {availableProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name} (Sisa: {p.currentStock})
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-2" style={{ flex: 1 }}>
            <label className="text-sm font-semibold">Jumlah Potong</label>
            <input 
              type="number" 
              min="1"
              className="input-field"
              value={item.quantity}
              onChange={e => handleUpdate(index, 'quantity', parseInt(e.target.value) || 0)}
            />
          </div>

          <button 
            type="button" 
            onClick={() => removeItem(index)}
            className="btn btn-danger" 
            style={{ height: '45px', width: '45px', padding: 0 }}
            title="Hapus baris ini"
          >
            🗑️
          </button>
        </div>
      ))}

      <div className="flex justify-between items-center mt-4">
        <button type="button" onClick={addItem} className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
          + Tambah Tipe Bahan Lain
        </button>

        <button 
          type="button" 
          onClick={handleSave} 
          className="btn btn-primary" 
          disabled={isSaving}
          style={{ padding: '0.75rem 2rem' }}
        >
          {isSaving ? 'Menyimpan...' : 'Simpan Aturan'}
        </button>
      </div>
    </div>
  );
}
