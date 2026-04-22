// Orbit — Sidebar (nav + clients list + sources ribbon)
const sidebarStyles = {
  aside: {
    width: 244, flex: 'none', background: 'var(--bg-1)', borderRight: '1px solid var(--border-1)',
    display: 'flex', flexDirection: 'column', height: '100%', fontSize: 13
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px',
    borderBottom: '1px solid var(--border-1)'
  },
  logoMark: {
    width: 24, height: 24, borderRadius: 6,
    background: 'linear-gradient(135deg, var(--accent) 0%, #8D6DF6 100%)',
    display: 'grid', placeItems: 'center', color: '#fff', fontSize: 13, fontWeight: 700
  },
  brandName: { fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em', color: 'var(--fg-0)', flex: 1 },
  themeBtn: { width: 26, height: 26, borderRadius: 6, display: 'grid', placeItems: 'center', color: 'var(--fg-2)' },

  sourcesRow: { display: 'flex', flexWrap: 'wrap', gap: 6, padding: '12px 14px', borderBottom: '1px solid var(--border-1)' },
  sourceBtn: {
    width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center',
    transition: 'transform 150ms cubic-bezier(0.2,0.8,0.2,1)'
  },

  nav: { padding: '10px 8px', borderBottom: '1px solid var(--border-1)' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 7,
    width: '100%', textAlign: 'left', color: 'var(--fg-1)', fontSize: 13, fontWeight: 500,
    transition: 'background 120ms ease'
  },
  navCount: {
    marginLeft: 'auto', fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)',
    background: 'var(--bg-2)', padding: '1px 6px', borderRadius: 4
  },

  search: {
    margin: '10px 12px 6px', position: 'relative'
  },
  searchInput: {
    width: '100%', padding: '7px 10px 7px 30px', borderRadius: 7, border: '1px solid var(--border-2)',
    background: 'var(--bg-0)', color: 'var(--fg-0)', fontSize: 12.5, fontFamily: 'inherit'
  },
  searchIcon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)' },

  clientsLabel: {
    fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
    color: 'var(--fg-3)', padding: '12px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  },

  client: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 7, margin: '0 8px',
    cursor: 'pointer'
  },
  avatar: {
    width: 26, height: 26, borderRadius: 6, flex: 'none',
    display: 'grid', placeItems: 'center', color: '#fff', fontSize: 10, fontWeight: 700
  },
  clientName: { fontSize: 12.5, fontWeight: 500, color: 'var(--fg-0)', lineHeight: 1.2 },
  clientMeta: { fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.2, marginTop: 2 },
  unread: {
    marginLeft: 'auto', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
    background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700,
    display: 'grid', placeItems: 'center'
  },
  footer: {
    marginTop: 'auto', padding: '10px 14px', borderTop: '1px solid var(--border-1)',
    display: 'flex', alignItems: 'center', gap: 10
  },
};

function Sidebar({ active, onNav, activeClient, onClientSelect, sources, clients, activeSources, onSourceToggle, onTheme, theme, onOpenSettings }) {
  return (
    <aside style={sidebarStyles.aside}>
      <div style={sidebarStyles.brand}>
        <div style={sidebarStyles.logoMark}>◐</div>
        <div style={sidebarStyles.brandName}>Orbit</div>
        <button style={sidebarStyles.themeBtn} onClick={onTheme} title="Basculer light/dark">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
        </button>
        <button style={sidebarStyles.themeBtn} onClick={onOpenSettings} title="Réglages">
          <Icon name="settings" size={14} />
        </button>
      </div>

      <div style={sidebarStyles.sourcesRow}>
        {sources.map(s => {
          const on = activeSources.includes(s.id);
          return (
            <button key={s.id}
              onClick={() => onSourceToggle(s.id)}
              title={s.label + (on ? ' (actif)' : ' (inactif)')}
              style={{
                ...sidebarStyles.sourceBtn,
                background: on ? s.soft : 'var(--bg-2)',
                opacity: on ? 1 : 0.55,
                color: on ? s.color : 'var(--fg-3)'
              }}>
              <Icon name={s.glyph} size={13} />
            </button>
          );
        })}
      </div>

      <div style={sidebarStyles.nav}>
        {[
          { id: 'today', label: "Aujourd'hui", icon: 'sparkles' },
          { id: 'inbox', label: 'Inbox unifiée', icon: 'inbox', count: 7 },
          { id: 'tasks', label: 'Tâches', icon: 'check', count: 12 },
          { id: 'clients', label: 'Clients', icon: 'users' },
          { id: 'analytics', label: 'Analytics', icon: 'chart' },
        ].map(item => (
          <button key={item.id}
            onClick={() => onNav(item.id)}
            style={{
              ...sidebarStyles.navItem,
              background: active === item.id ? 'var(--accent-soft)' : 'transparent',
              color: active === item.id ? 'var(--accent-ink)' : 'var(--fg-1)'
            }}
            onMouseEnter={e => { if (active !== item.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (active !== item.id) e.currentTarget.style.background = 'transparent'; }}>
            <Icon name={item.icon} size={15} />
            <span>{item.label}</span>
            {item.count && <span style={sidebarStyles.navCount}>{item.count}</span>}
          </button>
        ))}
      </div>

      <div style={sidebarStyles.search}>
        <div style={sidebarStyles.searchIcon}><Icon name="search" size={13} /></div>
        <input style={sidebarStyles.searchInput} placeholder="Rechercher un client, message…" />
      </div>

      <div style={sidebarStyles.clientsLabel}>
        <span>Clients actifs</span>
        <button style={{ color: 'var(--fg-3)' }}><Icon name="plus" size={12} /></button>
      </div>

      <div style={{ overflow: 'auto', paddingBottom: 8 }}>
        {clients.filter(c => c.active).map(c => (
          <div key={c.id}
            onClick={() => onClientSelect(c.id)}
            style={{
              ...sidebarStyles.client,
              background: activeClient === c.id ? 'var(--bg-hover)' : 'transparent'
            }}
            onMouseEnter={e => { if (activeClient !== c.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (activeClient !== c.id) e.currentTarget.style.background = 'transparent'; }}>
            <div style={{ ...sidebarStyles.avatar, background: c.color }}>{c.avatar}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={sidebarStyles.clientName}>{c.name}</div>
              <div style={sidebarStyles.clientMeta}>{c.lastActivity}</div>
            </div>
            {c.unread > 0 && <div style={sidebarStyles.unread}>{c.unread}</div>}
          </div>
        ))}
      </div>

      <div style={sidebarStyles.footer}>
        <div style={{ ...sidebarStyles.avatar, background: '#0B0D12', width: 22, height: 22, fontSize: 9 }}>YM</div>
        <div style={{ flex: 1, fontSize: 12, color: 'var(--fg-1)' }}>Yanis M.</div>
        <span style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>Pro</span>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
