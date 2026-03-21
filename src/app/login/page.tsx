import LoginForm from './LoginForm';
import { Package } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login — Kaos Kami SCM',
  description: 'Login ke Sistem Manajemen Supply Chain Kaos Kami',
};

export default function LoginPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--background-start-rgb)', // Uses the CSS var
      padding: '1rem'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem', borderTop: '4px solid rgb(var(--primary))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Package size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Kaos Kami SCM</h1>
          <p className="text-muted text-sm text-center">Silakan masukkan password admin untuk masuk ke sistem.</p>
        </div>
        
        <LoginForm />
      </div>
    </div>
  );
}
