'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, ShoppingCart, X, Command } from 'lucide-react';

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ products: any[]; orders: any[] }>({ products: [], orders: [] });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      setQuery('');
      setResults({ products: [], orders: [] });
      document.body.style.overflow = 'auto';
    }
  }, [isOpen]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          const json = await res.json();
          if (json.success) setResults(json.data);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults({ products: [], orders: [] });
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (item: any, type: 'product' | 'order') => {
    setIsOpen(false);
    if (type === 'product') router.push(`/stock/${item.id}`);
    if (type === 'order') router.push(`/orders/${item.id}`);
  };

  if (!isOpen) return null;

  const totalResults = results.products.length + results.orders.length;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '1rem',
        paddingTop: '12vh',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="glass-card fadeInUp"
        style={{
          width: '100%',
          maxWidth: '600px',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          background: 'rgba(var(--surface), 0.95)',
          animation: 'fadeInUp 0.3s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input Area */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(var(--border), 0.5)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Search size={20} className="text-muted" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cari produk atau pesanan... (Ctrl+K)"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '1.1rem',
              color: 'rgb(var(--foreground-rgb))',
              fontFamily: 'inherit'
            }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <kbd className="mobile-hidden" style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', background: 'rgba(var(--foreground-rgb), 0.05)', borderRadius: '4px', border: '1px solid rgba(var(--border), 0.5)', color: 'rgb(var(--text-muted))' }}>ESC</kbd>
             <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'rgb(var(--text-muted))' }}><X size={20} /></button>
          </div>
        </div>

        {/* Results Area */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0.5rem' }}>
          {isLoading && <div style={{ padding: '2rem', textAlign: 'center' }} className="text-muted">Mencari...</div>}
          
          {!isLoading && query.length > 0 && totalResults === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center' }} className="text-muted">Tidak ada hasil ditemukan untuk "{query}"</div>
          )}

          {!isLoading && query.length < 2 && (
             <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                <p className="text-muted text-sm mb-4">Mulai ketik untuk mencari secara instan...</p>
                <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                   <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(var(--primary), 0.05)', textAlign: 'left' }}>
                      <Package size={16} style={{ color: 'rgb(var(--primary))', marginBottom: '0.5rem' }} />
                      <span style={{ fontWeight: 700, display: 'block', fontSize: '0.8rem' }}>Produk</span>
                      <span className="text-muted text-xs">Nama, Warna, atau SKU.</span>
                   </div>
                   <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(var(--accent), 0.05)', textAlign: 'left' }}>
                      <ShoppingCart size={16} style={{ color: 'rgb(var(--accent))', marginBottom: '0.5rem' }} />
                      <span style={{ fontWeight: 700, display: 'block', fontSize: '0.8rem' }}>Pesanan</span>
                      <span className="text-muted text-xs">No. Order / Nama Customer.</span>
                   </div>
                </div>
             </div>
          )}

          {totalResults > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {results.products.length > 0 && (
                <>
                  <div style={{ padding: '0.75rem 0.75rem 0.25rem', fontSize: '0.7rem', fontWeight: 700, color: 'rgb(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Produk</div>
                  {results.products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelect(p, 'product')}
                      className="hover-bg"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '12px',
                        border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'all 0.2s', fontFamily: 'inherit'
                      }}
                    >
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(var(--primary), 0.1)', color: 'rgb(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'rgb(var(--foreground-rgb))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem' }} className="text-muted">SKU: {p.sku} • Stok: {p.stock} pcs</div>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {results.orders.length > 0 && (
                <>
                  <div style={{ padding: '1.25rem 0.75rem 0.25rem', fontSize: '0.7rem', fontWeight: 700, color: 'rgb(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pesanan</div>
                  {results.orders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => handleSelect(o, 'order')}
                      className="hover-bg"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '12px',
                        border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'all 0.2s', fontFamily: 'inherit'
                      }}
                    >
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(var(--accent), 0.1)', color: 'rgb(var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingCart size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'rgb(var(--foreground-rgb))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>#{o.orderNumber} - {o.customerName}</div>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase' }} className="text-muted">{o.status}</div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(var(--foreground-rgb), 0.03)', borderTop: '1px solid rgba(var(--border), 0.3)', fontSize: '0.7rem' }} className="text-muted flex justify-between">
           <span>Pintasan: <kbd style={{ padding: '1px 4px', borderRadius: '3px', background: 'rgba(0,0,0,0.05)' }}>ESC</kbd> untuk menutup</span>
           <span>Klik item untuk detail</span>
        </div>
      </div>
    </div>
  );
}
