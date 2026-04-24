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

function Sidebar({ active, onNav, activeClient, onClientSelect, clients, messages, sources, onOpenSettings, onAddClient, onOpenHelp, onConnectChannel, onDisconnectGmail, gmailConnected, whatsappConnected, instagramConnected }) {
  const [query, setQuery] = React.useState('');
  const [confirmPrompt, setConfirmPrompt] = React.useState(false);

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
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button onClick={() => onNav('today')}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: active === 'today' ? 'var(--bg-1)' : 'transparent', border: '1px solid', borderColor: active === 'today' ? 'var(--border-2)' : 'transparent', color: active === 'today' ? 'var(--fg-0)' : 'var(--fg-3)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 150ms' }}
            onMouseEnter={e => { if (active !== 'today') e.currentTarget.style.color = 'var(--fg-1)'; }}
            onMouseLeave={e => { if (active !== 'today') e.currentTarget.style.color = 'var(--fg-3)'; }}>
            <Icon name="check" size={14} /> Dashboard
          </button>
          <button onClick={() => onNav('inbox')}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: active === 'inbox' ? 'var(--bg-1)' : 'transparent', border: '1px solid', borderColor: active === 'inbox' ? 'var(--border-2)' : 'transparent', color: active === 'inbox' ? 'var(--fg-0)' : 'var(--fg-3)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 150ms' }}
            onMouseEnter={e => { if (active !== 'inbox') e.currentTarget.style.color = 'var(--fg-1)'; }}
            onMouseLeave={e => { if (active !== 'inbox') e.currentTarget.style.color = 'var(--fg-3)'; }}>
            <Icon name="mail" size={14} /> Inbox
          </button>
        </div>

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
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: 10 }}>
        {query && visibleClients.length === 0 && (
          <div style={{ padding: '20px 18px', fontSize: 12, color: 'var(--fg-3)', textAlign: 'center', lineHeight: 1.6 }}>
            Aucun résultat pour<br /><em style={{ color: 'var(--fg-1)' }}>"{query}"</em>
          </div>
        )}
        {!query && clients.filter(c => c.active).length === 0 && (
          <button
            onClick={onConnectChannel}
            style={{
              flex: 1, margin: '12px 10px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '24px 16px',
              background: 'transparent', border: '1px dashed var(--border-2)',
              borderRadius: 10, cursor: 'pointer', color: 'var(--fg-3)',
              fontFamily: 'inherit', transition: 'all 120ms'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--fg-3)'; }}>
            <Icon name="plus" size={14} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Aucun contact pour l'instant</span>
          </button>
        )}
        {visibleClients.map((c, idx) => {
          const s = stats[c.id] || { unread: 0, tasks: 0 };
          const total = s.unread + s.tasks;
          const hasNotif = total > 0;
          const isActive = activeClient === c.id;

          return (
            <div key={c.id}
              onClick={() => onClientSelect(c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '8px 12px', margin: '2px 8px', borderRadius: 8,
                cursor: 'pointer', transition: 'background 100ms',
                background: isActive ? 'var(--bg-hover)' : 'transparent',
                animation: `slideInRight 0.4s cubic-bezier(0.16,1,0.3,1) ${idx * 0.08}s both`
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>

              {/* Avatar with Channel Badge */}
              <div style={{ position: 'relative', flex: 'none' }}>
                <div style={{ ...sidebarStyles.avatar, backgroundImage: `url(${c.avatarUrl})` }} />
                {c.source && (
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2, width: 14, height: 14,
                    background: '#fff', borderRadius: '50%', border: '1px solid var(--border-1)',
                    display: 'grid', placeItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <img src={`assets/channels/${c.source}.svg`} alt={c.source} width="10" height="10" />
                  </div>
                )}
              </div>

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 13, lineHeight: 1.2,
                    fontWeight: hasNotif ? 700 : 500, color: hasNotif ? 'var(--fg-0)' : 'var(--fg-1)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {c.name}
                  </span>
                  {hasNotif && (
                    <div style={{ 
                      width: 6, height: 6, borderRadius: '50%', 
                      background: s.tasks > 0 ? 'var(--accent)' : 'var(--fg-1)',
                      flex: 'none'
                    }} />
                  )}
                </div>
                {hasNotif && (
                  <div style={{ fontSize: 10.5, color: s.tasks > 0 ? 'var(--accent)' : 'var(--fg-1)', fontWeight: 600, marginTop: 1 }}>
                    {s.tasks > 0 ? (s.tasks > 1 ? `${s.tasks} tâches IA à valider` : `1 tâche IA à valider`) : 'Non lu'}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span style={{ fontSize: 10.5, color: hasNotif ? 'var(--accent)' : 'var(--fg-3)', fontWeight: hasNotif ? 700 : 500, whiteSpace: 'nowrap', flex: 'none' }}>
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
          {(sources || []).map(s => {
            let isConnected = false;
            if (s.id === 'gmail') isConnected = gmailConnected;
            if (s.id === 'whatsapp') isConnected = whatsappConnected;
            if (s.id === 'instagram') isConnected = instagramConnected;
            
            const handleChannelClick = () => {
              if (s.id === 'gmail' && isConnected && onDisconnectGmail) {
                setConfirmPrompt(true);
                return;
              }
              if (!isConnected && onConnectChannel) return onConnectChannel();
              onOpenSettings && onOpenSettings();
            };
            return (
              <div key={s.id} title={isConnected ? `${s.label} — connecté (clic pour déconnecter)` : `Connecter ${s.label}`} onClick={handleChannelClick}
                style={{
                  width: 36, height: 36, cursor: 'pointer',
                  display: 'grid', placeItems: 'center', position: 'relative',
                  opacity: isConnected ? 1 : 0.4, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                <img src={s.logo} alt={s.label} width="36" height="36" style={{ display: 'block' }} />
                <div style={{ 
                  position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, 
                  borderRadius: '50%', background: isConnected ? '#22C55E' : '#D1D5DB',
                  border: '2px solid var(--bg-2)',
                  boxShadow: isConnected ? '0 0 10px rgba(34, 197, 94, 0.5)' : 'none'
                }} />
              </div>
            );
          })}
          <button
            onClick={() => (onConnectChannel ? onConnectChannel() : onOpenSettings && onOpenSettings())}
            title="Connecter un canal"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'transparent', border: '1.5px dashed var(--border-2)',
              color: 'var(--fg-3)', cursor: 'pointer',
              display: 'grid', placeItems: 'center', padding: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-3)'; e.currentTarget.style.borderColor = 'var(--border-2)'; }}>
            <Icon name="plus" size={16} />
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
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>wacil@freescale.io</div>
          </div>
          <button style={{ background: 'none', border: 'none', color: 'var(--fg-2)', cursor: 'pointer', padding: 4 }} onClick={() => onOpenSettings && onOpenSettings()}>
            <Icon name="more-horizontal" size={16} />
          </button>
        </div>
      </div>

      <window.ActionModal 
        isOpen={confirmPrompt} 
        type="confirm" 
        title="Déconnecter Gmail ?" 
        message="Êtes-vous sûr de vouloir déconnecter ce canal ?" 
        confirmText="Déconnecter" 
        cancelText="Annuler" 
        onConfirm={() => { onDisconnectGmail(); setConfirmPrompt(false); }} 
        onCancel={() => setConfirmPrompt(false)} 
      />
    </aside>
  );
}

window.Sidebar = Sidebar;
