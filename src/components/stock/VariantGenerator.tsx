'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { generateProductVariants } from '@/app/actions/product';
import { useToast } from '@/components/Toast';
import { X, Plus, Zap, Layers } from 'lucide-react';

/* =============================================
   Smart Variant Generator — Modal Component
   Uses createPortal to escape parent stacking context.
   All styles are inline or use globals.css classes.
   ============================================= */

export default function VariantGenerator({ categories, onClose }: { categories: any[]; onClose: () => void }) {
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [template, setTemplate] = useState({
    name: '',
    sku: '',
    categoryId: categories[0]?.id || '',
    unitPrice: 0,
    buyPrice: 0,
    minStock: 5,
    material: 'Cotton Combed 30s',
    thickness: '',
    sleeveType: 'Pendek',
    unit: 'pcs'
  });

  const [sizes, setSizes] = useState(['S', 'M', 'L', 'XL']);
  const [newSize, setNewSize] = useState('');

  const [colors, setColors] = useState(['Hitam', 'Putih']);
  const [newColor, setNewColor] = useState('');

  // Mount guard for createPortal (needs DOM)
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden'; // lock body scroll
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  /* ---------- handlers ---------- */
  const handleAddSize = () => {
    const val = newSize.trim().toUpperCase();
    if (val && !sizes.includes(val)) { setSizes([...sizes, val]); setNewSize(''); }
  };
  const handleAddColor = () => {
    const val = newColor.trim();
    const formatted = val.charAt(0).toUpperCase() + val.slice(1);
    if (formatted && !colors.includes(formatted)) { setColors([...colors, formatted]); setNewColor(''); }
  };
  const handleRemoveSize = (s: string) => setSizes(sizes.filter(x => x !== s));
  const handleRemoveColor = (c: string) => setColors(colors.filter(x => x !== c));

  const handleGenerate = async () => {
    if (!template.name || !template.sku) { showToast('Nama dan Base SKU wajib diisi', 'error'); return; }
    if (sizes.length === 0 && colors.length === 0) { showToast('Pilih setidaknya satu ukuran atau warna', 'error'); return; }
    setIsLoading(true);
    const res = await generateProductVariants(template, sizes, colors);
    setIsLoading(false);
    if (res.success) { showToast(`Berhasil membuat ${res.count} varian produk!`, 'success'); onClose(); }
    else { showToast(res.error || 'Gagal generate varian', 'error'); }
  };

  if (!mounted) return null;

  const totalVariants = sizes.length * colors.length;

  /* ============ shared inline style objects ============ */
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.9rem',
    borderRadius: '10px',
    border: '1px solid rgba(var(--border), 0.7)',
    background: 'rgba(var(--surface), 0.5)',
    color: 'rgb(var(--foreground-rgb))',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: 700,
    color: 'rgb(var(--text-muted))',
    marginBottom: '0.35rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  const tagBaseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontWeight: 600,
    padding: '0.35rem 0.65rem',
    borderRadius: '8px',
    fontSize: '0.82rem',
    transition: 'all 0.15s',
    cursor: 'default',
  };

  const tagRemoveBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    opacity: 0.55,
    display: 'flex',
    alignItems: 'center',
    padding: '2px',
    borderRadius: '4px',
    transition: 'all 0.15s',
    color: 'inherit',
  };

  /* ============ RENDER via Portal ============ */
  const content = (
    /* ---- Backdrop ---- */
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'svgFadeIn 0.25s ease-out',
      }}
    >
      {/* ---- Modal Card ---- */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '52rem',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '18px',
          background: 'rgb(var(--surface))',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.25), 0 0 0 1px rgba(var(--border), 0.25)',
          overflow: 'hidden',
          animation: 'svgSlideUp 0.3s ease-out',
        }}
      >
        {/* ---- Gradient accent bar ---- */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, rgb(var(--primary)), rgb(var(--accent)), #ec4899)' }} />

        {/* ---- Header ---- */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(var(--border), 0.4)',
          background: 'rgba(var(--surface-hover), 0.35)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(var(--primary),0.12), rgba(var(--accent),0.12))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgb(var(--primary))',
            }}>
              <Zap size={22} />
            </div>
            <div>
              <h2 style={{
                fontSize: '1.2rem', fontWeight: 800, margin: 0,
                background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Smart Variant Generator
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'rgb(var(--text-muted))', margin: 0, marginTop: '2px' }}>
                Buat banyak varian produk sekaligus dengan cepat.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', background: 'rgba(var(--border), 0.2)',
              color: 'rgb(var(--text-muted))', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--danger), 0.12)'; e.currentTarget.style.color = 'rgb(var(--danger))'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--border), 0.2)'; e.currentTarget.style.color = 'rgb(var(--text-muted))'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ---- Scrollable Body ---- */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

            {/* ==== SECTION 1: Base Information ==== */}
            <section style={{
              padding: '1.25rem',
              borderRadius: '14px',
              border: '1px solid rgba(var(--border), 0.35)',
              background: 'rgba(var(--surface-hover), 0.25)',
            }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgb(var(--primary))' }}>
                <span style={{ background: 'rgba(var(--primary), 0.1)', padding: '5px 8px', borderRadius: '8px', fontSize: '0.9rem' }}>📦</span>
                Informasi Dasar
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Nama */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Nama Dasar Produk</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="Contoh: Kaos Kami Skizo"
                    value={template.name}
                    onChange={e => setTemplate({ ...template, name: e.target.value })}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgb(var(--primary))'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--primary),0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(var(--border),0.7)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                {/* SKU */}
                <div>
                  <label style={labelStyle}>Base SKU (Prefiks)</label>
                  <input
                    style={{ ...inputStyle, textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.05em' }}
                    type="text"
                    placeholder="CTH: S-SKIZO"
                    value={template.sku}
                    onChange={e => setTemplate({ ...template, sku: e.target.value.toUpperCase() })}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgb(var(--primary))'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--primary),0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(var(--border),0.7)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                {/* Kategori */}
                <div>
                  <label style={labelStyle}>Kategori</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={template.categoryId}
                    onChange={e => setTemplate({ ...template, categoryId: e.target.value })}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgb(var(--primary))'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--primary),0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(var(--border),0.7)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                {/* Harga Beli */}
                <div>
                  <label style={labelStyle}>Harga Beli / Modal (Rp)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgb(var(--text-muted))', fontSize: '0.82rem', fontWeight: 500 }}>Rp</span>
                    <input
                      style={{ ...inputStyle, paddingLeft: '2.2rem' }}
                      type="number"
                      placeholder="0"
                      value={template.buyPrice || ''}
                      onChange={e => setTemplate({ ...template, buyPrice: Number(e.target.value) })}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgb(var(--primary))'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--primary),0.1)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(var(--border),0.7)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
                {/* Harga Jual */}
                <div>
                  <label style={labelStyle}>Harga Jual Satuan (Rp)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgb(var(--text-muted))', fontSize: '0.82rem', fontWeight: 500 }}>Rp</span>
                    <input
                      style={{ ...inputStyle, paddingLeft: '2.2rem' }}
                      type="number"
                      placeholder="0"
                      value={template.unitPrice || ''}
                      onChange={e => setTemplate({ ...template, unitPrice: Number(e.target.value) })}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgb(var(--primary))'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--primary),0.1)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(var(--border),0.7)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ==== SECTION 2: Variant Combinations ==== */}
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgb(var(--accent))' }}>
                  <span style={{ background: 'rgba(var(--accent), 0.1)', padding: '5px 8px', borderRadius: '8px', fontSize: '0.9rem' }}>✨</span>
                  Kombinasi Varian
                </h3>
                {totalVariants > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                    background: 'rgba(var(--primary), 0.08)', color: 'rgb(var(--primary))',
                    fontWeight: 700, fontSize: '0.72rem',
                    padding: '0.3rem 0.7rem', borderRadius: '20px',
                    border: '1px solid rgba(var(--primary), 0.15)',
                  }}>
                    <Layers size={13} /> {totalVariants} Varian
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>

                {/* ---- SIZE BLOCK ---- */}
                <div style={{
                  padding: '1.25rem',
                  borderRadius: '14px',
                  border: '1px solid rgba(var(--border), 0.3)',
                  background: 'rgba(var(--surface-hover), 0.2)',
                  transition: 'border-color 0.2s',
                }}>
                  <label style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                    <span>📐 Ukuran (Size)</span>
                    <span className="badge badge-primary">{sizes.length}</span>
                  </label>

                  {/* Tags Area */}
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '0.4rem',
                    minHeight: '42px', marginBottom: '0.75rem',
                    padding: '0.5rem',
                    borderRadius: '10px',
                    background: 'rgba(var(--surface), 0.6)',
                    border: '1px solid rgba(var(--border), 0.25)',
                  }}>
                    {sizes.length === 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'rgb(var(--text-muted))', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
                        Belum ada ukuran ditambahkan
                      </span>
                    )}
                    {sizes.map(s => (
                      <span key={s} style={{
                        ...tagBaseStyle,
                        background: 'rgba(var(--primary), 0.1)',
                        color: 'rgb(var(--primary))',
                        border: '1px solid rgba(var(--primary), 0.2)',
                      }}>
                        {s}
                        <button
                          onClick={() => handleRemoveSize(s)}
                          style={tagRemoveBtnStyle}
                          title={`Hapus ${s}`}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'rgb(var(--danger))'; e.currentTarget.style.background = 'rgba(var(--danger),0.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '0.55'; e.currentTarget.style.color = 'inherit'; e.currentTarget.style.background = 'none'; }}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add size input */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      style={{ ...inputStyle, flex: 1, padding: '0.5rem 0.75rem' }}
                      placeholder="Ketik ukuran lalu Enter..."
                      value={newSize}
                      onChange={e => setNewSize(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSize(); } }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgb(var(--primary))'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--primary),0.1)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(var(--border),0.7)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <button
                      onClick={handleAddSize}
                      disabled={!newSize.trim()}
                      className="btn btn-primary"
                      style={{ padding: '0.5rem', minWidth: '38px', minHeight: '38px', opacity: newSize.trim() ? 1 : 0.45 }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* ---- COLOR BLOCK ---- */}
                <div style={{
                  padding: '1.25rem',
                  borderRadius: '14px',
                  border: '1px solid rgba(var(--border), 0.3)',
                  background: 'rgba(var(--surface-hover), 0.2)',
                  transition: 'border-color 0.2s',
                }}>
                  <label style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                    <span>🎨 Warna (Color)</span>
                    <span style={{
                      background: 'rgba(var(--accent), 0.1)', color: 'rgb(var(--accent))',
                      padding: '0.18rem 0.5rem', borderRadius: '999px',
                      fontSize: '0.72rem', fontWeight: 600,
                    }}>{colors.length}</span>
                  </label>

                  {/* Tags Area */}
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '0.4rem',
                    minHeight: '42px', marginBottom: '0.75rem',
                    padding: '0.5rem',
                    borderRadius: '10px',
                    background: 'rgba(var(--surface), 0.6)',
                    border: '1px solid rgba(var(--border), 0.25)',
                  }}>
                    {colors.length === 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'rgb(var(--text-muted))', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
                        Belum ada warna ditambahkan
                      </span>
                    )}
                    {colors.map(c => (
                      <span key={c} style={{
                        ...tagBaseStyle,
                        background: 'rgba(var(--accent), 0.1)',
                        color: 'rgb(var(--accent))',
                        border: '1px solid rgba(var(--accent), 0.2)',
                      }}>
                        {c}
                        <button
                          onClick={() => handleRemoveColor(c)}
                          style={tagRemoveBtnStyle}
                          title={`Hapus ${c}`}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'rgb(var(--danger))'; e.currentTarget.style.background = 'rgba(var(--danger),0.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '0.55'; e.currentTarget.style.color = 'inherit'; e.currentTarget.style.background = 'none'; }}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add color input */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      style={{ ...inputStyle, flex: 1, padding: '0.5rem 0.75rem' }}
                      placeholder="Ketik warna lalu Enter..."
                      value={newColor}
                      onChange={e => setNewColor(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddColor(); } }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgb(var(--accent))'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--accent),0.1)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(var(--border),0.7)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <button
                      onClick={handleAddColor}
                      disabled={!newColor.trim()}
                      style={{
                        padding: '0.5rem', minWidth: '38px', minHeight: '38px',
                        borderRadius: '10px', border: 'none', cursor: 'pointer',
                        background: newColor.trim()
                          ? 'linear-gradient(135deg, rgb(var(--accent)), #c084fc)'
                          : 'rgba(var(--border), 0.3)',
                        color: newColor.trim() ? '#fff' : 'rgb(var(--text-muted))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: newColor.trim() ? 1 : 0.45,
                        transition: 'all 0.2s',
                      }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* ---- Footer / Action Bar ---- */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          padding: '1rem 1.5rem',
          borderTop: '1px solid rgba(var(--border), 0.4)',
          background: 'rgba(var(--surface-hover), 0.4)',
        }}>
          {/* Estimasi */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(var(--surface), 0.7)', padding: '0.5rem 0.85rem',
            borderRadius: '10px', border: '1px solid rgba(var(--border), 0.5)',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'rgba(var(--primary), 0.1)',
              color: 'rgb(var(--primary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={18} />
            </div>
            <div>
              <p style={{ fontSize: '0.6rem', color: 'rgb(var(--text-muted))', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', margin: 0 }}>
                Estimasi
              </p>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'rgb(var(--foreground-rgb))' }}>
                {totalVariants} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'rgb(var(--text-muted))' }}>Varian</span>
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} className="btn btn-outline" style={{ padding: '0.6rem 1.25rem' }}>
              Batalkan
            </button>
            <button
              onClick={handleGenerate}
              disabled={isLoading || totalVariants === 0}
              className="btn btn-primary"
              style={{
                padding: '0.65rem 1.5rem', fontSize: '0.95rem',
                opacity: (isLoading || totalVariants === 0) ? 0.5 : 1,
                cursor: (isLoading || totalVariants === 0) ? 'not-allowed' : 'pointer',
                boxShadow: totalVariants > 0 ? '0 4px 14px -3px rgba(var(--primary), 0.4)' : 'none',
              }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <svg style={{ animation: 'spin 1s linear infinite', width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" opacity="0.75" />
                  </svg>
                  Sedang Membuat...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Zap size={17} /> Generate Sekarang
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Keyframe animations injected inline */}
      <style>{`
        @keyframes svgFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes svgSlideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}
