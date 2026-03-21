'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', text: 'Halo Hengki! Ada yang bisa saya bantu hari ini? Anda bisa cek stok, lapor penjualan, atau analisis performa.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    
    // Add user message instantly
    const newMessages = [...messages, { id: Date.now().toString(), role: 'user' as const, text: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          context: messages.map(m => ({ role: m.role, text: m.text }))
        })
      });

      const data = await res.json();
      
      setMessages([...newMessages, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant' as const, 
        text: data.response || 'Terjadi kesalahan pada AI.'
      }]);
    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { id: Date.now().toString(), role: 'assistant' as const, text: 'Koneksi ke AI gagal.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto" style={{ height: 'calc(100vh - 160px)', minHeight: '400px' }}>
      <div className="flex justify-between items-center mobile-hidden">
        <div>
          <h1>AI Assistant</h1>
          <p className="text-muted">Asisten pintar untuk mengelola SCM Kaos Kami.</p>
        </div>
      </div>

      <div className="glass-card flex flex-col" style={{ flex: 1, overflow: 'hidden', padding: 0 }}>
        {/* Messages Wrapper */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map(msg => (
            <div 
              key={msg.id} 
              style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '65%',
                background: msg.role === 'user' ? 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' : 'rgba(var(--surface-hover), 0.8)',
                color: msg.role === 'user' ? 'white' : 'inherit',
                padding: '1rem',
                borderRadius: '12px',
                borderBottomRightRadius: msg.role === 'user' ? '4px' : '12px',
                borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ alignSelf: 'flex-start', padding: '1rem', background: 'rgba(var(--surface-hover), 0.8)', borderRadius: '12px', borderBottomLeftRadius: '4px' }}>
              <span className="text-muted text-sm">AI sedang mengetik...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', borderTop: '1px solid rgba(var(--border), 0.5)', background: 'rgba(var(--surface), 0.9)' }} className="mobile-gap-2">
          <input 
            type="text" 
            className="input-field touch-target" 
            placeholder="Tanya stok, analisa..." 
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isLoading}
            style={{ flex: 1, padding: '0.75rem 1rem' }}
          />
          <button type="submit" className="btn btn-primary touch-target" style={{ padding: '0 1.25rem' }} disabled={isLoading || !input.trim()}>
            Kirim
          </button>
        </form>
      </div>
    </div>
  );
}
