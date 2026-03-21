export default function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
      {/* Stat cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="glass-card" style={{ height: 100, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.5 }} />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="glass-card" style={{ height: 300, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.4 }} />
    </div>
  );
}
