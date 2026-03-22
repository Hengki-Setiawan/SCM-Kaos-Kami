/**
 * Smart AI Utilities for SCM Kaos Kami Chatbot
 * Includes: Fuzzy matching, synonym recognition, currency parsing,
 * multi-intent detection, auto-suggestion, and business intelligence.
 */

// ==================== LEVENSHTEIN FUZZY MATCHING ====================
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (t === q) return 1.0;
  if (t.includes(q) || q.includes(t)) return 0.9;

  // Token-based matching (handles word reorder: "hitam kaos" → "kaos hitam")
  const qTokens = q.split(/\s+/);
  const tTokens = t.split(/\s+/);
  let matchedTokens = 0;
  for (const qt of qTokens) {
    if (tTokens.some(tt => tt.includes(qt) || qt.includes(tt) || levenshtein(qt, tt) <= 1)) {
      matchedTokens++;
    }
  }
  const tokenScore = qTokens.length > 0 ? matchedTokens / qTokens.length : 0;
  if (tokenScore >= 0.8) return 0.7 + tokenScore * 0.2;

  // Character-level Levenshtein distance
  const dist = levenshtein(q, t);
  const maxLen = Math.max(q.length, t.length);
  const levScore = maxLen > 0 ? 1 - dist / maxLen : 0;

  return Math.max(tokenScore * 0.8, levScore);
}

export interface FuzzyMatch {
  item: any;
  score: number;
  matchedField: 'name' | 'sku';
}

export function findFuzzyMatches(query: string, products: any[], topN = 3): FuzzyMatch[] {
  const results: FuzzyMatch[] = [];
  for (const p of products) {
    const nameScore = fuzzyScore(query, p.name);
    const skuScore = fuzzyScore(query, p.sku);
    const best = nameScore >= skuScore ? nameScore : skuScore;
    const field = nameScore >= skuScore ? 'name' as const : 'sku' as const;
    results.push({ item: p, score: best, matchedField: field });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, topN);
}

// ==================== SYNONYM & ALIAS RECOGNITION ====================
const ACTION_SYNONYMS: Record<string, string[]> = {
  ADD_STOCK: ['tambah', 'nambah', 'masukin', 'masuk', 'restock', 'restok', 'plus', 'input', 'terima', 'datang'],
  DEDUCT_STOCK: ['kurangi', 'kurangin', 'potong', 'minus', 'keluar', 'jual', 'terjual', 'sold'],
  UPDATE_STOCK: ['ubah stok', 'set stok', 'update stok', 'koreksi stok', 'stok jadi'],
  CHECK_STOCK: ['cek', 'sisa', 'berapa', 'ada berapa', 'stok', 'stock', 'lihat stok', 'cek stok'],
  DELETE_PRODUCT: ['hapus', 'buang', 'ilangin', 'hilangkan', 'delete', 'remove'],
  CREATE_ORDER: ['buat pesanan', 'pesan baru', 'order baru', 'bikin order'],
  PROCESS_ORDER: ['kirim', 'proses', 'pack', 'packing', 'kirim paket'],
  CREATE_PRODUCT: ['buat produk', 'tambah barang baru', 'tambah jenis', 'tambah varian', 'produk baru'],
  LOG_EXPENSE: ['catat biaya', 'beli', 'bayar', 'belanja', 'pengeluaran'],
};

export function detectSynonymAction(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [action, synonyms] of Object.entries(ACTION_SYNONYMS)) {
    for (const syn of synonyms) {
      if (lower.includes(syn)) return action;
    }
  }
  return null;
}

// ==================== INDONESIAN CURRENCY PARSER ====================
export function parseIndonesianCurrency(text: string): number | null {
  const lower = text.toLowerCase().replace(/\./g, '').replace(/,/g, '.');
  
  const patterns: [RegExp, (m: RegExpMatchArray) => number][] = [
    // "Rp 50.000" or "Rp50000" or "50.000"
    [/rp\.?\s*(\d+(?:\.\d+)?)/i, m => parseFloat(m[1])],
    // "2,5jt" or "2.5juta" or "2jt" or "2 juta"
    [/(\d+(?:\.\d+)?)\s*(?:jt|juta|m)\b/i, m => parseFloat(m[1]) * 1_000_000],
    // "50rb" or "50ribu" or "50k"
    [/(\d+(?:\.\d+)?)\s*(?:rb|ribu|k)\b/i, m => parseFloat(m[1]) * 1_000],
    // Just a big number by itself e.g. "500000"
    [/\b(\d{4,})\b/, m => parseFloat(m[1])],
  ];

  for (const [regex, parser] of patterns) {
    const match = lower.match(regex);
    if (match) return parser(match);
  }
  return null;
}

// ==================== MULTI-INTENT DETECTION ====================
export interface DetectedIntent {
  action: string;
  productQuery: string;
  qty: number;
}

export function detectMultiIntent(text: string): DetectedIntent[] {
  const intents: DetectedIntent[] = [];
  // Split by "dan", "terus", ",", "&", "+"  
  const parts = text.split(/\b(?:dan|terus|lalu|kemudian|serta)\b|[,&+]/i).map(p => p.trim()).filter(Boolean);
  
  for (const part of parts) {
    const action = detectSynonymAction(part);
    if (!action) continue;

    // Extract qty 
    const qtyMatch = part.match(/(\d+)\s*(?:pcs|buah|lembar|pc|unit|biji)?/i);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

    // Remove action keywords and qty to get product query
    let productQuery = part;
    for (const syns of Object.values(ACTION_SYNONYMS)) {
      for (const syn of syns) {
        productQuery = productQuery.replace(new RegExp(syn, 'gi'), '');
      }
    }
    productQuery = productQuery.replace(/\d+\s*(?:pcs|buah|lembar|pc|unit|biji)?/gi, '').replace(/stok/gi, '').trim();

    if (productQuery.length > 1) {
      intents.push({ action, productQuery, qty });
    }
  }

  return intents;
}

// ==================== NATURAL DATE PARSER ====================
export function parseNaturalDate(text: string): { start: Date; end: Date; label: string } | null {
  const now = new Date();
  const lower = text.toLowerCase();

  if (lower.includes('hari ini') || lower.includes('today')) {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end, label: 'Hari Ini' };
  }
  if (lower.includes('kemarin') || lower.includes('yesterday')) {
    const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999);
    return { start, end, label: 'Kemarin' };
  }
  if (lower.includes('minggu ini') || lower.includes('this week')) {
    const start = new Date(now); start.setDate(start.getDate() - start.getDay()); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end, label: 'Minggu Ini' };
  }
  if (lower.includes('minggu lalu') || lower.includes('last week')) {
    const start = new Date(now); start.setDate(start.getDate() - start.getDay() - 7); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setDate(end.getDate() - end.getDay() - 1); end.setHours(23, 59, 59, 999);
    return { start, end, label: 'Minggu Lalu' };
  }
  if (lower.includes('bulan ini') || lower.includes('this month')) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end, label: 'Bulan Ini' };
  }
  if (lower.includes('bulan lalu') || lower.includes('last month')) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end, label: 'Bulan Lalu' };
  }

  // "3 hari terakhir", "7 hari terakhir"
  const nDaysMatch = lower.match(/(\d+)\s*hari\s*(?:terakhir|lalu)/);
  if (nDaysMatch) {
    const n = parseInt(nDaysMatch[1]);
    const start = new Date(now); start.setDate(start.getDate() - n); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end, label: `${n} Hari Terakhir` };
  }

  return null;
}

// ==================== BUSINESS INTELLIGENCE ====================
export function predictStockRunout(currentStock: number, movements: { type: string; quantity: number; createdAt: string }[]): { daysLeft: number; avgPerDay: number } | null {
  // Calculate average daily consumption from last 30 days
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentOuts = movements.filter(m =>
    (m.type === 'OUT' || m.type === 'ADJUSTMENT_OUT') &&
    new Date(m.createdAt) >= thirtyDaysAgo
  );
  const totalOut = recentOuts.reduce((a, m) => a + m.quantity, 0);
  const avgPerDay = totalOut / 30;

  if (avgPerDay <= 0) return null;
  const daysLeft = Math.floor(currentStock / avgPerDay);
  return { daysLeft, avgPerDay: Math.round(avgPerDay * 10) / 10 };
}

export function analyzeTrend(movements: { type: string; quantity: number; createdAt: string; productId: string }[], products: any[]): {
  topSellers: { name: string; sold: number }[];
  rising: { name: string; change: number }[];
  falling: { name: string; change: number }[];
} {
  const now = new Date();
  const thisWeekStart = new Date(now); thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekStart = new Date(now); lastWeekStart.setDate(lastWeekStart.getDate() - 14);

  const salesByProduct: Record<string, { thisWeek: number; lastWeek: number }> = {};

  for (const m of movements) {
    if (m.type !== 'OUT') continue;
    const d = new Date(m.createdAt);
    const prod = products.find((p: any) => p.id === m.productId);
    if (!prod) continue;

    if (!salesByProduct[prod.id]) salesByProduct[prod.id] = { thisWeek: 0, lastWeek: 0 };
    if (d >= thisWeekStart) salesByProduct[prod.id].thisWeek += m.quantity;
    else if (d >= lastWeekStart) salesByProduct[prod.id].lastWeek += m.quantity;
  }

  const entries = Object.entries(salesByProduct).map(([id, data]) => {
    const prod = products.find((p: any) => p.id === id);
    const change = data.lastWeek > 0 ? ((data.thisWeek - data.lastWeek) / data.lastWeek) * 100 : (data.thisWeek > 0 ? 100 : 0);
    return { name: prod?.name || 'Unknown', sold: data.thisWeek, change: Math.round(change) };
  });

  return {
    topSellers: entries.sort((a, b) => b.sold - a.sold).slice(0, 5),
    rising: entries.filter(e => e.change > 0).sort((a, b) => b.change - a.change).slice(0, 3),
    falling: entries.filter(e => e.change < 0).sort((a, b) => a.change - b.change).slice(0, 3),
  };
}
