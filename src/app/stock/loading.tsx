export default function StockLoading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div className="flex justify-between items-center">
        <div>
          <div style={{ height: '2rem', width: '12rem', background: 'rgba(var(--foreground-rgb), 0.08)', borderRadius: '8px' }} />
          <div style={{ height: '1rem', width: '20rem', background: 'rgba(var(--foreground-rgb), 0.05)', borderRadius: '6px', marginTop: '0.5rem' }} />
        </div>
        <div style={{ height: '2.5rem', width: '10rem', background: 'rgba(var(--primary), 0.1)', borderRadius: '10px' }} />
      </div>
      <div className="flex gap-2">
        {[1,2,3,4].map(i => <div key={i} style={{ height: '2.5rem', width: '6rem', background: 'rgba(var(--foreground-rgb), 0.06)', borderRadius: '8px' }} />)}
      </div>
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid rgba(var(--border), 0.1)' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '3px', background: 'rgba(var(--foreground-rgb), 0.08)' }} />
            <div style={{ flex: 1, height: '1rem', background: 'rgba(var(--foreground-rgb), 0.06)', borderRadius: '6px' }} />
            <div style={{ width: '5rem', height: '1rem', background: 'rgba(var(--foreground-rgb), 0.06)', borderRadius: '6px' }} />
            <div style={{ width: '4rem', height: '1.5rem', background: 'rgba(var(--primary), 0.08)', borderRadius: '999px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
