// Freescale — Sidebar (nav + clients list)
const sidebarStyles = {
  aside: {
    width: 290, flex: 'none', background: 'var(--bg-1)', borderRadius: 24, margin: '16px 0 16px 16px',
    display: 'flex', flexDirection: 'column', height: 'calc(100vh - 32px)', fontSize: 13,
    boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
  },
  brandName: { fontWeight: 800, fontSize: 16, letterSpacing: '-0.03em', color: 'var(--fg-0)', flex: 1 },
  settingsBtn: { color: 'var(--fg-3)', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 4 },

  search: { margin: '4px 16px 10px', position: 'relative' },
  searchInput: {
    width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10,
    border: '1px solid var(--border-2)', background: 'var(--bg-2)', color: 'var(--fg-1)',
    fontSize: 12.5, fontFamily: 'inherit', fontWeight: 500, boxSizing: 'border-box'
  },
  searchIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)' },

  filterRow: { margin: '0 16px 10px', display: 'flex', gap: 6, alignItems: 'center' },
  filterDropdown: {
    flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border-2)',
    background: 'var(--bg-1)', fontSize: 12, fontWeight: 600, color: 'var(--fg-1)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
  },
  filterAction: { padding: '4px 6px', color: 'var(--fg-3)', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  divider: { height: 1, background: 'var(--border-1)', margin: '0 16px' },

  clientsLabel: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--fg-3)', padding: '14px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  },

  client: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, margin: '2px 8px',
    cursor: 'pointer', transition: 'background 120ms'
  },
  avatar: {
    width: 32, height: 32, borderRadius: 8, flex: 'none',
    display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 700,
    backgroundSize: 'cover', backgroundPosition: 'center'
  },
  clientName: { fontSize: 13, fontWeight: 600, color: 'var(--fg-0)', lineHeight: 1.25 },
  clientMeta: { fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.2, marginTop: 2 },

  badgeRow: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', marginLeft: 'auto' },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999,
    fontSize: 10.5, fontWeight: 700, lineHeight: 1.3, whiteSpace: 'nowrap'
  },
  badgeMsg: { background: '#E0ECFF', color: '#1D4ED8' },
  badgeTask: { background: '#FFEAD5', color: '#C2410C' },

  footer: {
    marginTop: 'auto', padding: '16px 20px 20px', borderTop: 'none',
    display: 'flex', flexDirection: 'column', gap: 16
  },
};

function Sidebar({ active, onNav, activeClient, onClientSelect, clients, messages, theme, onTheme, onOpenSettings }) {
  // Compute messages & tasks count per client
  const stats = React.useMemo(() => {
    const acc = {};
    (messages || []).forEach(m => {
      const s = acc[m.clientId] || { unread: 0, tasks: 0 };
      if (m.unread) s.unread += 1;
      s.tasks += (m.extractedTasks?.length || 0);
      acc[m.clientId] = s;
    });
    return acc;
  }, [messages]);

  return (
    <aside style={sidebarStyles.aside}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '18px 20px 14px', gap: 10 }}>
        <div style={sidebarStyles.brandName}>Freescale</div>
        <div style={sidebarStyles.settingsBtn} onClick={onOpenSettings}>
          <Icon name="settings" size={15} />
        </div>
      </div>

      <div style={sidebarStyles.search}>
        <div style={sidebarStyles.searchIcon}><Icon name="search" size={14} /></div>
        <input style={sidebarStyles.searchInput} placeholder={`Rechercher parmi ${clients.length} contacts…`} />
      </div>

      <div style={sidebarStyles.filterRow}>
        <div style={sidebarStyles.filterDropdown}>Volume <Icon name="chevronDown" size={12} /></div>
        <div style={sidebarStyles.filterAction}><Icon name="arrowUp" size={14} /></div>
      </div>

      <div style={sidebarStyles.divider}></div>

      <div style={sidebarStyles.clientsLabel}>
        <span>Contacts actifs</span>
        <button style={{ color: 'var(--fg-3)', cursor: 'pointer' }}><Icon name="plus" size={12} /></button>
      </div>

      <div style={{ overflow: 'auto', paddingBottom: 8 }}>
        {clients.filter(c => c.active).map(c => {
          const s = stats[c.id] || { unread: 0, tasks: 0 };
          const isActive = activeClient === c.id;
          return (
            <div key={c.id}
              onClick={() => onClientSelect(c.id)}
              style={{
                ...sidebarStyles.client,
                background: isActive ? 'var(--bg-hover)' : 'transparent'
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
              <div style={{ ...sidebarStyles.avatar, backgroundImage: `url(${c.avatarUrl})` }}></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={sidebarStyles.clientName}>{c.name}</div>
                <div style={sidebarStyles.clientMeta}>{c.lastActivity}</div>
              </div>
              {(s.unread > 0 || s.tasks > 0) && (
                <div style={sidebarStyles.badgeRow}>
                  {s.unread > 0 && (
                    <span style={{ ...sidebarStyles.badge, ...sidebarStyles.badgeMsg }} title={`${s.unread} message${s.unread > 1 ? 's' : ''} non lu${s.unread > 1 ? 's' : ''}`}>
                      <Icon name="chat" size={10} /> {s.unread}
                    </span>
                  )}
                  {s.tasks > 0 && (
                    <span style={{ ...sidebarStyles.badge, ...sidebarStyles.badgeTask }} title={`${s.tasks} tâche${s.tasks > 1 ? 's' : ''} détectée${s.tasks > 1 ? 's' : ''}`}>
                      <Icon name="check" size={10} /> {s.tasks}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
