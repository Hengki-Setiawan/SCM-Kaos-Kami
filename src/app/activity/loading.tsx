export default function ActivityLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div>
        <div style={{ height: '2rem', width: '14rem', background: 'rgba(var(--foreground-rgb), 0.08)', borderRadius: '8px' }} />
        <div style={{ height: '1rem', width: '24rem', background: 'rgba(var(--foreground-rgb), 0.05)', borderRadius: '6px', marginTop: '0.5rem' }} />
      </div>
      <div className="glass-card" style={{ padding: 0 }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid rgba(var(--border), 0.1)', alignItems: 'center' }}>
            <div style={{ width: '6rem', height: '0.85rem', background: 'rgba(var(--foreground-rgb), 0.06)', borderRadius: '4px' }} />
            <div style={{ flex: 1, height: '1rem', background: 'rgba(var(--foreground-rgb), 0.07)', borderRadius: '6px' }} />
            <div style={{ width: '4rem', height: '1.5rem', background: 'rgba(var(--success), 0.1)', borderRadius: '999px' }} />
            <div style={{ width: '2rem', height: '1rem', background: 'rgba(var(--foreground-rgb), 0.05)', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
