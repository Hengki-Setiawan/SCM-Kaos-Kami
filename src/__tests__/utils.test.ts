import { describe, it, expect } from 'vitest';
import { timeAgo, formatRupiah, generateOrderNumber } from '../lib/utils';

describe('timeAgo', () => {
  it('returns "Baru saja" for dates less than 1 minute ago', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe('Baru saja');
  });

  it('returns minutes ago for dates less than 1 hour', () => {
    const d = new Date(Date.now() - 5 * 60000).toISOString();
    expect(timeAgo(d)).toBe('5 menit lalu');
  });

  it('returns hours ago for dates less than 1 day', () => {
    const d = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(timeAgo(d)).toBe('3 jam lalu');
  });

  it('returns days ago for dates less than 1 week', () => {
    const d = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(timeAgo(d)).toBe('2 hari lalu');
  });

  it('returns formatted date for dates more than 1 week', () => {
    const d = new Date(Date.now() - 14 * 86400000).toISOString();
    const result = timeAgo(d);
    expect(result).not.toContain('lalu');
  });
});

describe('formatRupiah', () => {
  it('formats number into IDR currency', () => {
    expect(formatRupiah(50000)).toContain('50');
  });

  it('handles zero', () => {
    expect(formatRupiah(0)).toContain('0');
  });

  it('handles large numbers', () => {
    const result = formatRupiah(1500000);
    expect(result).toContain('1.500.000');
  });
});

describe('generateOrderNumber', () => {
  it('generates a string starting with ORD-', () => {
    const num = generateOrderNumber();
    expect(num).toMatch(/^ORD-/);
  });

  it('generates unique order numbers', () => {
    const a = generateOrderNumber();
    const b = generateOrderNumber();
    expect(a).not.toBe(b);
  });
});
