import { describe, it, expect } from 'vitest';
import { productSchema, orderSchema } from '../lib/validations';

describe('productSchema', () => {
  it('validates a correct product', () => {
    const result = productSchema.safeParse({
      name: 'Kaos Hitam Polos',
      sku: 'KHP-L-001',
      categoryId: 'cat-123',
      unitType: 'pcs',
      unitValue: 1,
      unitPrice: 85000,
      buyPrice: 45000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = productSchema.safeParse({
      name: '',
      sku: 'TEST-001',
      categoryId: 'cat-1',
      unitType: 'pcs',
      unitValue: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty SKU', () => {
    const result = productSchema.safeParse({
      name: 'Test Product',
      sku: '',
      categoryId: 'cat-1',
      unitType: 'pcs',
      unitValue: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative prices', () => {
    const result = productSchema.safeParse({
      name: 'Test',
      sku: 'T-001',
      categoryId: 'cat-1',
      unitType: 'pcs',
      unitValue: 1,
      unitPrice: -100,
    });
    expect(result.success).toBe(false);
  });

  it('accepts partial schema for updates', () => {
    const result = productSchema.partial().safeParse({
      name: 'Updated Name',
      unitPrice: 90000,
    });
    expect(result.success).toBe(true);
  });
});

describe('orderSchema', () => {
  it('validates correct order', () => {
    const result = orderSchema.safeParse({
      customerName: 'Budi',
      platform: 'shopee',
      items: [
        { productId: 'prod-1', quantity: 2, unitPrice: 85000 }
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects order without customer name', () => {
    const result = orderSchema.safeParse({
      customerName: '',
      platform: 'shopee',
      items: [{ productId: 'p', quantity: 1, unitPrice: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects order without items', () => {
    const result = orderSchema.safeParse({
      customerName: 'Budi',
      platform: 'shopee',
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects item with zero quantity', () => {
    const result = orderSchema.safeParse({
      customerName: 'Test',
      platform: 'tokopedia',
      items: [{ productId: 'p', quantity: 0, unitPrice: 50000 }],
    });
    expect(result.success).toBe(false);
  });
});
