// Freescale — Sidebar (classic flat, Linear-inspired)
const sidebarStyles = {
  aside: {
    width: 272, flex: 'none',
    background: 'var(--bg-2)',
    borderRight: '1px solid var(--border-1)',
    display: 'flex', flexDirection: 'column',
    height: '100vh', fontSize: 13, overflow: 'hidden'
  },
  avatar: {
    width: 34, height: 34, borderRadius: 8, flex: 'none',
    backgroundSize: 'cover', backgroundPosition: 'center', display: 'block'
  },
  footer: {
    marginTop: 'auto',
    borderTop: '1px solid var(--border-1)',
    padding: '12px 16px 16px',
  }
};

function Sidebar({ active, onNav, activeClient, onClientSelect, clients, messages, sources, onOpenSettings, onAddClient, onOpenHelp, onConnectChannel }) {
  const [query, setQuery] = React.useState('');

  // Compute total notifications per client (unread msgs + tasks)
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

  // Recency score for sorting
  const recencyScore = (label = '') => {
    const l = label.toLowerCase();
    if (l.includes("instant")) return 0;
    const num = parseInt((l.match(/\d+/) || ['0'])[0], 10);
    if (l.includes('min')) return num;
    if (l.includes('hier')) return 24 * 60;
    if (/\d+\s*h/.test(l)) return num * 60;
    if (/\d+\s*j/.test(l)) return num * 24 * 60;
    return 99999;
  };

  const visibleClients = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = clients.filter(c => c.active);
    if (q) list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.tags || []).some(t => t.toLowerCase().includes(q))
    );
    return [...list].sort((a, b) => recencyScore(a.lastActivity) - recencyScore(b.lastActivity));
  }, [clients, query, stats]);

  return (
    <aside style={sidebarStyles.aside}>

      {/* Brand */}
      <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.03em', color: 'var(--fg-0)' }}>Freescale</span>
      </div>

      {/* Search + Add */}
      <div style={{ padding: '0 12px 12px' }}>
        <div style={{
          position: 'relative', display: 'flex', alignItems: 'center',
          background: 'var(--bg-1)', borderRadius: 8,
          border: '1px solid var(--border-1)',
          transition: 'border-color 120ms, box-shadow 120ms'
        }}>
          <span style={{ display: 'flex', padding: '0 8px 0 10px', color: 'var(--fg-3)' }}>
            <Icon name="search" size={13} />
          </span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher"
            style={{
              flex: 1, minWidth: 0, height: 32, padding: 0,
              border: 'none', outline: 'none', background: 'transparent',
              color: 'var(--fg-0)', fontSize: 13, fontFamily: 'inherit', fontWeight: 500
            }}
          />
          {query ? (
            <button onClick={() => setQuery('')}
              style={{ display: 'flex', padding: 6, marginRight: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', borderRadius: 4 }}>
              <Icon name="x" size={12} />
            </button>
          ) : (
            <button onClick={onAddClient} title="Ajouter un contact"
              style={{ display: 'flex', padding: 6, marginRight: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', borderRadius: 4 }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-3)'; e.currentTarget.style.background = 'none'; }}>
              <Icon name="plus" size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Client list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {query && visibleClients.length === 0 && (
          <div style={{ padding: '20px 18px', fontSize: 12, color: 'var(--fg-3)', textAlign: 'center', lineHeight: 1.6 }}>
            Aucun résultat pour<br /><em style={{ color: 'var(--fg-1)' }}>"{query}"</em>
          </div>
        )}
        {visibleClients.map(c => {
          const s = stats[c.id] || { unread: 0, tasks: 0 };
          const total = s.unread + s.tasks;
          const hasNotif = total > 0;
          const isActive = activeClient === c.id;

          return (
            <div key={c.id}
              onClick={() => onClientSelect(c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '8px 12px', margin: '1px 6px', borderRadius: 8,
                cursor: 'pointer', transition: 'background 100ms',
                background: isActive ? 'var(--bg-hover)' : 'transparent'
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>

              {/* Avatar */}
              <div style={{ ...sidebarStyles.avatar, backgroundImage: `url(${c.avatarUrl})` }} />

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: 13, lineHeight: 1.2, display: 'block',
                  fontWeight: 500, color: 'var(--fg-1)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {c.name}
                </span>
              </div>

              {/* Timestamp */}
              <span style={{ fontSize: 10.5, color: 'var(--fg-3)', fontWeight: 500, whiteSpace: 'nowrap', flex: 'none' }}>
                {c.lastActivity.replace('il y a ', '')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Connected channels */}
      <div style={{ padding: '16px 16px 14px', borderTop: '1px solid var(--border-1)', marginTop: 8 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-3)', marginBottom: 10 }}>
          Canaux connectés
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {(sources || []).map(s => (
            <div key={s.id} title={s.label}
              style={{
                width: 44, height: 44, cursor: 'pointer',
                display: 'grid', placeItems: 'center'
              }}>
              <img src={s.logo} alt={s.label} width="44" height="44" style={{ display: 'block' }} />
            </div>
          ))}
          <button
            onClick={() => (onConnectChannel ? onConnectChannel() : onOpenSettings && onOpenSettings())}
            title="Connecter un canal"
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'transparent', border: '1.5px dashed var(--border-2)',
              color: 'var(--fg-3)', cursor: 'pointer',
              display: 'grid', placeItems: 'center', padding: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-3)'; e.currentTarget.style.borderColor = 'var(--border-2)'; }}>
            <Icon name="plus" size={18} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={sidebarStyles.footer}>
        <button
          onClick={onOpenHelp}
          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 4px', marginBottom: 10, color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 500, borderRadius: 6, width: '100%' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg-1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-3)'; }}>
          <Icon name="help" size={14} /> Help Center
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...sidebarStyles.avatar,
            backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD6A5"/><stop offset="1" stop-color="#FDA4AF"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><circle cx="32" cy="26" r="10" fill="#FFF1E6" stroke="#3F2A1D" stroke-width="2"/><path d="M22 24c0-7 5-12 10-12s10 5 10 12c-2-2-6-3-10-3s-8 1-10 3z" fill="#3F2A1D"/><circle cx="28.5" cy="27" r="1.4" fill="#3F2A1D"/><circle cx="35.5" cy="27" r="1.4" fill="#3F2A1D"/><path d="M29 31.5c1 1 2 1.5 3 1.5s2-.5 3-1.5" fill="none" stroke="#3F2A1D" stroke-width="1.6" stroke-linecap="round"/><path d="M14 58c2-8 9-14 18-14s16 6 18 14" fill="#6D93F0"/></svg>')}") `, backgroundColor: '#F3F4F6', backgroundSize: 'cover', cursor: 'pointer' }}
            onClick={() => onOpenSettings && onOpenSettings()} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-0)', letterSpacing: '-0.01em' }}>Wacil Corio</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Admin</div>
          </div>
          <button onClick={onOpenSettings} title="Paramètres"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', display: 'flex', padding: 4, borderRadius: 6 }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg-0)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-3)'; e.currentTarget.style.background = 'none'; }}>
            <Icon name="settings" size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
