export default function AnalysisLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ height: '2rem', width: '16rem', background: 'rgba(var(--foreground-rgb), 0.08)', borderRadius: '8px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[1,2,3].map(i => (
          <div key={i} className="glass-card" style={{ height: '8rem', background: 'rgba(var(--foreground-rgb), 0.03)' }} />
        ))}
      </div>
      <div className="glass-card" style={{ height: '20rem', background: 'rgba(var(--foreground-rgb), 0.02)' }} />
    </div>
  );
}
