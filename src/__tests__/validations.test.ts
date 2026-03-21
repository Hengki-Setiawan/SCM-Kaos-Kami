import { describe, it, expect } from 'vitest';
import { orderSchema, productSchema } from '../lib/validations';

describe('Order Schema Validation', () => {
  it('should reject empty customerName', () => {
    const result = orderSchema.safeParse({
      customerName: '',
      platform: 'shopee',
      items: [{ productId: '123', quantity: 1, unitPrice: 50000 }],
      totalPrice: 50000,
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid order data', () => {
    const result = orderSchema.safeParse({
      customerName: 'Budi',
      platform: 'shopee',
      items: [{ productId: '123', quantity: 2, unitPrice: 50000 }],
      totalPrice: 100000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative totalPrice', () => {
    const result = orderSchema.safeParse({
      customerName: 'Budi',
      platform: 'shopee',
      items: [{ productId: '123', quantity: 1, unitPrice: 50000 }],
      totalPrice: -100,
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty items array', () => {
    const result = orderSchema.safeParse({
      customerName: 'Budi',
      platform: 'shopee',
      items: [],
      totalPrice: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject zero quantity', () => {
    const result = orderSchema.safeParse({
      customerName: 'Budi',
      platform: 'shopee',
      items: [{ productId: '123', quantity: 0, unitPrice: 50000 }],
      totalPrice: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('Product Schema Validation', () => {
  it('should reject empty product name', () => {
    const result = productSchema.safeParse({
      name: '',
      sku: 'KS-001',
      categoryId: '123',
      unitPrice: 50000,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative price', () => {
    const result = productSchema.safeParse({
      name: 'Kaos Hitam',
      sku: 'KS-001',
      categoryId: '123',
      unitPrice: -500,
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid product data', () => {
    const result = productSchema.safeParse({
      name: 'Kaos Hitam L',
      sku: 'KS-HTM-L',
      categoryId: '123',
      unitPrice: 75000,
    });
    expect(result.success).toBe(true);
  });
});
