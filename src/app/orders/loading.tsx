export default function OrdersLoading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div className="flex justify-between items-center">
        <div>
          <div style={{ height: '2rem', width: '14rem', background: 'rgba(var(--foreground-rgb), 0.08)', borderRadius: '8px' }} />
          <div style={{ height: '1rem', width: '18rem', background: 'rgba(var(--foreground-rgb), 0.05)', borderRadius: '6px', marginTop: '0.5rem' }} />
        </div>
        <div style={{ height: '2.5rem', width: '10rem', background: 'rgba(var(--primary), 0.1)', borderRadius: '10px' }} />
      </div>
      <div className="flex gap-2">
        {['Semua','Pending','Processing','Shipped','Completed'].map(t => <div key={t} style={{ height: '2.2rem', width: '5.5rem', background: 'rgba(var(--foreground-rgb), 0.06)', borderRadius: '8px' }} />)}
      </div>
      <div className="glass-card" style={{ padding: 0 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid rgba(var(--border), 0.1)', alignItems: 'center' }}>
            <div style={{ flex: 2, height: '1rem', background: 'rgba(var(--foreground-rgb), 0.07)', borderRadius: '6px' }} />
            <div style={{ flex: 1, height: '1rem', background: 'rgba(var(--foreground-rgb), 0.05)', borderRadius: '6px' }} />
            <div style={{ width: '5rem', height: '1.5rem', background: 'rgba(var(--primary), 0.1)', borderRadius: '999px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
