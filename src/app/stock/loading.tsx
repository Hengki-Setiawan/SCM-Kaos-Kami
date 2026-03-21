export default function StockLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
      {/* Category tabs skeleton */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="glass-card" style={{ width: 100, height: 36, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.4, borderRadius: 8 }} />
        ))}
      </div>
      {/* Table rows skeleton */}
      {[1,2,3,4,5,6,7,8].map(i => (
        <div key={i} className="glass-card" style={{ height: 48, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.3 + (i * 0.05), animationDelay: `${i * 0.05}s` }} />
      ))}
    </div>
  );
}
