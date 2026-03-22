export default function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
      {/* Financial cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card" style={{ height: 80, borderLeft: '4px solid rgba(var(--border), 0.3)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
              <div style={{ width: '60%', height: 12, borderRadius: 6, background: 'rgba(var(--foreground-rgb), 0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ width: '40%', height: 24, borderRadius: 6, background: 'rgba(var(--foreground-rgb), 0.08)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.2s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Stat cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(var(--foreground-rgb), 0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: '50%', height: 12, borderRadius: 6, background: 'rgba(var(--foreground-rgb), 0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
              <div style={{ width: '35%', height: 28, borderRadius: 6, background: 'rgba(var(--foreground-rgb), 0.08)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.3s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Sidebar skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ width: '45%', height: 16, borderRadius: 6, background: 'rgba(var(--foreground-rgb), 0.06)', animation: 'pulse 1.5s ease-in-out infinite', marginBottom: '1.5rem' }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180 }}>
            {[65, 40, 80, 55, 70, 45, 90].map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%' }}>
                <div style={{ flex: 1, height: `${h}%`, borderRadius: '2px 2px 0 0', background: 'rgba(var(--primary), 0.1)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
                <div style={{ flex: 1, height: `${h * 0.6}%`, borderRadius: '2px 2px 0 0', background: 'rgba(var(--danger), 0.08)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1 + 0.05}s` }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-card" style={{ height: 100, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.4 }} />
          <div className="glass-card" style={{ height: 100, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.35, animationDelay: '0.2s' }} />
          <div className="glass-card" style={{ height: 80, animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.3, animationDelay: '0.4s' }} />
        </div>
      </div>

      {/* Activity list skeleton */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ width: '40%', height: 16, borderRadius: 6, background: 'rgba(var(--foreground-rgb), 0.06)', animation: 'pulse 1.5s ease-in-out infinite', marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 12, border: '1px solid rgba(var(--border), 0.2)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(var(--foreground-rgb), 0.06)', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ width: '70%', height: 12, borderRadius: 6, background: 'rgba(var(--foreground-rgb), 0.06)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
                <div style={{ width: '40%', height: 10, borderRadius: 6, background: 'rgba(var(--foreground-rgb), 0.04)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1 + 0.1}s` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
