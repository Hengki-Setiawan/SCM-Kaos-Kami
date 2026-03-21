export default function ChatLoading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse" style={{ maxWidth: 900, margin: '0 auto', width: '100%', height: '70vh' }}>
      <div style={{ height: '2rem', width: '10rem', background: 'rgba(var(--foreground-rgb), 0.08)', borderRadius: '8px' }} />
      <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
            <div style={{ width: `${40 + i * 10}%`, height: '3rem', background: i % 2 === 0 ? 'rgba(var(--primary), 0.08)' : 'rgba(var(--foreground-rgb), 0.05)', borderRadius: '12px' }} />
          </div>
        ))}
      </div>
      <div style={{ height: '3rem', background: 'rgba(var(--foreground-rgb), 0.04)', borderRadius: '12px' }} />
    </div>
  );
}
