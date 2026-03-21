'use client';

import { useState } from 'react';
import { setTelegramWebhook } from '@/app/actions/telegram';
import { useToast } from '@/components/Toast';
import { Send } from 'lucide-react';

export default function WebhookSetup() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { showToast } = useToast();

  const handleSetup = async () => {
    setLoading(true);
    const res = await setTelegramWebhook();
    setLoading(false);
    
    if (res.success) {
      setStatus('success');
      showToast(res.message || 'Webhook Aktif!', 'success');
    } else {
      setStatus('error');
      showToast(res.error || 'Gagal Setup', 'error');
    }
  };

  return (
    <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(var(--surface-hover), 0.3)' }}>
      <div className="flex flex-col">
        <span className="text-sm font-medium">📱 Telegram Bot Webhook</span>
        <span className="text-[10px] text-muted">Arahkan pesan Telegram ke server ini</span>
      </div>
      <button 
        onClick={handleSetup} 
        disabled={loading || status === 'success'}
        className={`btn text-xs py-1 px-3 flex items-center gap-2 ${status === 'success' ? 'btn-success' : 'btn-primary'}`}
      >
        <Send size={12} />
        {loading ? 'Menghubungkan...' : status === 'success' ? 'Aktif ✅' : 'Set Webhook'}
      </button>
    </div>
  );
}
