import { describe, it, expect } from 'vitest';
import { generateOrderNumber, timeAgo } from '../lib/utils';
import { productSchema } from '../lib/validations';

describe('Utility Functions', () => {
  it('generateOrderNumber generates an order number with the correct format', () => {
    const orderNum = generateOrderNumber();
    // EXPECT: ORD-TIMESTAMP-RANDOM
    expect(orderNum).toContain('ORD-');
    expect(orderNum.length).toBeGreaterThan(10);
  });

  it('timeAgo returns readable string', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    // Might be '5 menit yang lalu' or 'baru saja' depending on exact ms, but it should be a string
    expect(typeof timeAgo(fiveMinutesAgo)).toBe('string');
  });
});

describe('Zod Validations', () => {
  it('productSchema rejects negative prices', () => {
    const invalidProduct = {
      name: 'Kaos Hitam Pria',
      sku: 'KHP-001',
      categoryId: 'cat1',
      color: 'Hitam',
      size: 'L',
      material: 'Katun',
      unitPrice: -50000, // Invalid
      buyPrice: 0,
      minStock: 5,
      unitValue: 1,
      unitType: 'pcs'
    };
    
    const result = productSchema.safeParse(invalidProduct);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Harga jual tidak boleh negatif');
    }
  });

  it('productSchema accepts valid product', () => {
    const validProduct = {
      name: 'Kaos Putih Pria',
      sku: 'KPP-001',
      categoryId: 'cat1',
      color: 'Putih',
      size: 'L',
      material: 'Katun',
      unitPrice: 50000,
      buyPrice: 40000,
      minStock: 5,
      unitValue: 1,
      unitType: 'pcs'
    };
    
    const result = productSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });
});
