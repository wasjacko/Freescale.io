// Freescale — Sidebar (nav + clients list + sources ribbon)
const sidebarStyles = {
  aside: {
    width: 250, flex: 'none', background: 'var(--bg-1)', borderRadius: 24, margin: '16px 0 16px 16px',
    display: 'flex', flexDirection: 'column', height: 'calc(100vh - 32px)', fontSize: 13,
    boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
  },
  dot: { width: 10, height: 10, borderRadius: '50%' },
  brandName: { fontWeight: 800, fontSize: 15, letterSpacing: '-0.03em', color: 'var(--fg-0)', flex: 1 },
  settingsBtn: { color: 'var(--fg-3)', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 4 },

  sourcesRow: { display: 'flex', justifyContent: 'center', gap: 6, padding: '4px 16px 12px', flexWrap: 'nowrap' },
  sourceBtn: {
    width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center',
    transition: 'transform 150ms cubic-bezier(0.2,0.8,0.2,1)', cursor: 'pointer', flex: 'none'
  },
  tabsRow: { display: 'flex', padding: '0 16px', gap: 4, marginBottom: 10 },
  tabPill: { padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center', whiteSpace: 'nowrap' },
  tabActive: { background: '#EAEBEF', color: '#323642' },
  tabInactive: { background: 'transparent', color: '#A0A4AB' },

  search: {
    margin: '0 16px 8px', position: 'relative'
  },
  searchInput: {
    width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8,
    border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#374151', fontSize: 12, fontFamily: 'inherit', fontWeight: 500
  },
  searchIcon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' },
  
  filterRow: { margin: '0 16px 10px', display: 'flex', gap: 6, alignItems: 'center' },
  filterDropdown: { flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: 12, fontWeight: 600, color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  filterAction: { padding: '4px 6px', color: '#9CA3AF', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  divider: { height: 1, background: '#F3F4F6', margin: '0 16px' },

  clientsLabel: {
    fontSize: 11, fontWeight: 600,
    color: 'var(--fg-2)', padding: '16px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  },

  client: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 7, margin: '0 8px',
    cursor: 'pointer'
  },
  avatar: {
    width: 26, height: 26, borderRadius: 6, flex: 'none',
    display: 'grid', placeItems: 'center', color: '#fff', fontSize: 10, fontWeight: 700,
    backgroundSize: 'cover', backgroundPosition: 'center'
  },
  clientName: { fontSize: 12.5, fontWeight: 500, color: 'var(--fg-0)', lineHeight: 1.2 },
  clientMeta: { fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.2, marginTop: 2 },
  unread: {
    marginLeft: 'auto', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
    background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700,
    display: 'grid', placeItems: 'center'
  },
  footer: {
    marginTop: 'auto', padding: '16px 20px 20px', borderTop: 'none',
    display: 'flex', flexDirection: 'column', gap: 16
  },
};

function Sidebar({ active, onNav, activeClient, onClientSelect, sources, clients, activeSources, onSourceToggle, theme, onTheme, onOpenSettings }) {
  return (
    <aside style={sidebarStyles.aside}>
      {/* Header: dots + brand + settings on ONE row */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 16px 12px', gap: 10 }}>
        <div style={sidebarStyles.brandName}>Freescale</div>
        <div style={sidebarStyles.settingsBtn} onClick={onOpenSettings}>
          <Icon name="settings" size={14} />
        </div>
      </div>

      {/* Source icons */}
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
              <Icon name={s.glyph} size={12} />
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={sidebarStyles.tabsRow}>
        <div style={{ ...sidebarStyles.tabPill, ...sidebarStyles.tabActive }}>Actifs</div>
        <div style={{ ...sidebarStyles.tabPill, ...sidebarStyles.tabInactive }}>Archivés</div>
      </div>

      <div style={sidebarStyles.search}>
        <div style={sidebarStyles.searchIcon}><Icon name="search" size={14} /></div>
        <input style={sidebarStyles.searchInput} placeholder={`Search ${clients.length} clients...`} />
      </div>

      <div style={sidebarStyles.filterRow}>
        <div style={sidebarStyles.filterDropdown}>Volume <Icon name="chevron-down" size={12} /></div>
        <div style={sidebarStyles.filterAction}><Icon name="arrow-up" size={14} /></div>
      </div>

      <div style={sidebarStyles.divider}></div>

      <div style={sidebarStyles.clientsLabel}>
        <span>Contacts actifs</span>
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
            <div style={{ ...sidebarStyles.avatar, backgroundImage: `url(${c.avatarUrl})` }}></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={sidebarStyles.clientName}>{c.name}</div>
              <div style={sidebarStyles.clientMeta}>{c.lastActivity}</div>
            </div>
            {c.unread > 0 && <div style={sidebarStyles.unread}>{c.unread}</div>}
          </div>
        ))}
      </div>

      <div style={sidebarStyles.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 6, color: 'var(--fg-3)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          <Icon name="help" size={15} /> <span>Help Center</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-0)', padding: '12px 14px', borderRadius: 16, border: '1px solid var(--border-2)' }}>
          <div style={{ ...sidebarStyles.avatar, backgroundImage: 'url(https://randomuser.me/api/portraits/women/65.jpg)', width: 36, height: 36, borderRadius: 8 }}></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-0)', letterSpacing: '-0.01em' }}>Wacil Corio</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 500 }}>Admin account</div>
          </div>
          <Icon name="chevronL" size={14} color="var(--fg-3)" />
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
