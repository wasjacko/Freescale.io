const topbarStyles = {
  bar: {
    padding: '32px 40px 16px', flex: 'none', display: 'flex', flexDirection: 'column', gap: 24
  },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 24, fontWeight: 800, color: '#111', letterSpacing: '-0.02em', marginBottom: 4 },
  sub: { fontSize: 13, color: '#999', fontWeight: 500 },
  
  filterRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  filterPills: { display: 'flex', gap: 4, background: '#EEE', padding: 4, borderRadius: 10 },
  fPill: { padding: '6px 12px', fontSize: 11, fontWeight: 700, color: '#888', borderRadius: 8 },
  fPillActive: { background: '#FFF', color: '#111', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  
  navPills: { display: 'flex', gap: 8 },
  nPill: { padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#999', borderRadius: 8 },
  nPillActive: { background: '#F0F0F0', color: '#111' },
};

function TopBar({ title, subtitle, active, onNav, unreadCount }) {
  const [filter, setFilter] = React.useState('Aujourd\'hui');
  return (
    <div style={topbarStyles.bar}>
      <div style={topbarStyles.headerRow}>
        <div>
          <div style={topbarStyles.title}>{title}</div>
          {subtitle && (
            <div style={topbarStyles.sub}>
              {subtitle.includes('See Insights') ? (
                <>
                  {subtitle.split('See Insights')[0]}
                  <span style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>See Insights <Icon name="arrow-right" size={12} /></span>
                </>
              ) : subtitle}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', marginTop: 4 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--fg-0)', letterSpacing: '-0.04em', lineHeight: 1 }}>20</div>
          <div style={{ fontSize: 10, color: 'var(--fg-2)', fontWeight: 600, marginTop: 1 }}>Lundi Avril</div>
        </div>
      </div>
      <div style={topbarStyles.filterRow}>
        <div style={topbarStyles.navPills}>
          {[
            { id: 'today', label: 'Dashboard' },
            { id: 'clients', label: 'Mes projets' }
          ].map(item => (
            <button key={item.id} onClick={() => onNav(item.id)} style={{ ...topbarStyles.nPill, ...(active === item.id ? topbarStyles.nPillActive : {}) }}>
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={topbarStyles.filterPills}>
            {['Aujourd\'hui', '7d', '30d', '1y', 'All', 'Custom'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ ...topbarStyles.fPill, ...(f === filter ? topbarStyles.fPillActive : {}) }}>{f}</button>
            ))}
          </div>
          <button style={topbarStyles.bellBtn}>
            <Icon name="bell" size={16} />
            {unreadCount > 0 && <span style={topbarStyles.bellDot}>{unreadCount}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

window.TopBar = TopBar;
