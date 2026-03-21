export default function HistoryLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      <div className="glass-card" style={{ width: 250, height: 32, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.4 }} />
      {[1,2,3,4,5,6,7,8,9,10].map(i => (
        <div key={i} className="glass-card" style={{ height: 40, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.25 + (i * 0.05), animationDelay: `${i * 0.04}s` }} />
      ))}
    </div>
  );
}
