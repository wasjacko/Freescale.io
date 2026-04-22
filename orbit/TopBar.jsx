// Orbit — Top bar
const topbarStyles = {
  bar: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
    borderBottom: '1px solid var(--border-1)', background: 'var(--bg-1)', minHeight: 56, flex: 'none'
  },
  title: { fontSize: 16, fontWeight: 600, color: 'var(--fg-0)', letterSpacing: '-0.01em' },
  sub: { fontSize: 12, color: 'var(--fg-2)' },
  right: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center',
    color: 'var(--fg-1)', background: 'var(--bg-2)', border: '1px solid var(--border-1)'
  },
  cmdBtn: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8,
    background: 'var(--bg-2)', border: '1px solid var(--border-1)', color: 'var(--fg-2)', fontSize: 12
  },
  kbd: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)', padding: '2px 5px', borderRadius: 4, background: 'var(--bg-1)', border: '1px solid var(--border-2)' },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
    background: 'var(--fg-0)', color: 'var(--bg-1)', fontSize: 12.5, fontWeight: 600
  },
  pill: {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999,
    background: 'var(--ok-soft)', color: 'var(--ok)', fontSize: 11, fontWeight: 600
  },
  dot: { width: 6, height: 6, borderRadius: 999, background: 'currentColor' }
};

function TopBar({ title, subtitle, onOpenCopilot, copilotOpen }) {
  return (
    <div style={topbarStyles.bar}>
      <div>
        <div style={topbarStyles.title}>{title}</div>
        {subtitle && <div style={topbarStyles.sub}>{subtitle}</div>}
      </div>
      <div style={topbarStyles.right}>
        <span style={topbarStyles.pill}><span style={topbarStyles.dot}></span>Sync actif</span>
        <button style={topbarStyles.cmdBtn}>
          <Icon name="search" size={13} /> Rechercher partout
          <span style={topbarStyles.kbd}>⌘K</span>
        </button>
        <button style={topbarStyles.iconBtn} title="Notifications">
          <Icon name="bell" size={15} />
        </button>
        <button style={{
          ...topbarStyles.primaryBtn,
          background: copilotOpen ? 'var(--accent-soft)' : 'var(--fg-0)',
          color: copilotOpen ? 'var(--accent-ink)' : 'var(--bg-1)'
        }} onClick={onOpenCopilot}>
          <Icon name="sparkles" size={13} /> Copilot
        </button>
      </div>
    </div>
  );
}

window.TopBar = TopBar;
