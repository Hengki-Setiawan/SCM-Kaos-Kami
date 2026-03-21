export default function OrdersLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="glass-card" style={{ width: 200, height: 32, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.4 }} />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="glass-card" style={{ width: 120, height: 36, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.4, borderRadius: 8 }} />
          <div className="glass-card" style={{ width: 120, height: 36, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.4, borderRadius: 8 }} />
        </div>
      </div>
      {/* Order cards skeleton */}
      {[1,2,3,4,5].map(i => (
        <div key={i} className="glass-card" style={{ height: 80, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.3 + (i * 0.08), animationDelay: `${i * 0.05}s` }} />
      ))}
    </div>
  );
}
