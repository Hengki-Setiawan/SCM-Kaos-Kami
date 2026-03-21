import { describe, it, expect } from 'vitest';
import { formatRupiah, generateOrderNumber, formatRelativeTime } from '../lib/utils';

describe('formatRupiah', () => {
  it('should format number to Indonesian Rupiah', () => {
    expect(formatRupiah(50000)).toBe('Rp 50.000');
  });

  it('should format zero', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
  });

  it('should format large numbers', () => {
    expect(formatRupiah(1500000)).toBe('Rp 1.500.000');
  });

  it('should handle negative numbers', () => {
    const result = formatRupiah(-50000);
    expect(result).toContain('50.000');
  });
});

describe('generateOrderNumber', () => {
  it('should start with ORD-', () => {
    const orderNum = generateOrderNumber();
    expect(orderNum.startsWith('ORD-')).toBe(true);
  });

  it('should generate unique numbers', () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      set.add(generateOrderNumber());
    }
    // At least 95% should be unique (allowing for rare timestamp collisions)
    expect(set.size).toBeGreaterThan(90);
  });
});

describe('formatRelativeTime', () => {
  it('should return "Baru saja" for recent timestamps', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('Baru saja');
  });

  it('should return minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toContain('menit');
  });

  it('should return hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toContain('jam');
  });
});
