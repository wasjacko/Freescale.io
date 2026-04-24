const topbarStyles = {
  bar: {
    padding: '16px 32px 8px', flex: 'none', display: 'flex', flexDirection: 'column'
  },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 20, fontWeight: 800, color: '#111', letterSpacing: '-0.02em', marginBottom: 2 },
  sub: { fontSize: 12, color: '#999', fontWeight: 500 },
};

function TopBar({ title, subtitle }) {
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
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg-0)', letterSpacing: '-0.04em', lineHeight: 1 }}>20</div>
          <div style={{ fontSize: 10, color: 'var(--fg-2)', fontWeight: 600, marginTop: 1 }}>Lundi Avril</div>
        </div>
      </div>
    </div>
  );
}

window.TopBar = TopBar;
