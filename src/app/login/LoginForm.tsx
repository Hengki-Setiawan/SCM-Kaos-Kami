'use client';

import { useState } from 'react';
import { loginAction } from '../actions/auth';
import { useToast } from '@/components/Toast';

export default function LoginForm() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return showToast('Password wajib diisi', 'error');
    
    setLoading(true);
    try {
      const res = await loginAction(password);
      if (res.success) {
        showToast('Login berhasil!', 'success');
        window.location.href = '/'; // Full refresh to clear cache and update middleware state
      } else {
        showToast(res.error || 'Login gagal', 'error');
        setLoading(false);
      }
    } catch (err) {
      showToast('Terjadi kesalahan network', 'error');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label htmlFor="password" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Password Admin</label>
        <input
          id="password"
          type="password"
          className="input-field"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />
      </div>
      
      <button 
        type="submit" 
        className="btn btn-primary" 
        style={{ marginTop: '0.5rem', height: '44px' }}
        disabled={loading}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
             <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> 
             Memverifikasi...
          </span>
        ) : 'Masuk ke Dashboard'}
      </button>
      
      <div className="text-center mt-4">
        <a href="#" className="text-xs text-muted" onClick={e => { e.preventDefault(); showToast('Hubungi tim IT jika Anda lupa password admin.', 'info')}}>Lupa Password?</a>
      </div>
    </form>
  );
}
