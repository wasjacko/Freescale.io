// Orbit — Tasks (kanban), Clients list, Analytics (lightweight), Copilot panel
const viewStyles = {
  wrap: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', minHeight: 0 },
  kanban: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, flex: 1, minHeight: 0 },
  col: { background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  colHead: { padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-1)' },
  colTitle: { fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' },
  colCount: { marginLeft: 'auto', fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)' },
  colBody: { padding: 10, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto', flex: 1 },
  card: { background: 'var(--bg-0)', border: '1px solid var(--border-1)', borderRadius: 10, padding: 12 },
  cardTitle: { fontSize: 12.5, fontWeight: 500, color: 'var(--fg-0)', marginBottom: 8, lineHeight: 1.4 },
  cardMeta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--fg-2)', flexWrap: 'wrap' },

  clientsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, padding: 24 },
  clientCard: { background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 },
  clientHead: { display: 'flex', alignItems: 'center', gap: 12 },
  clientAv: { width: 42, height: 42, borderRadius: 10, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 14, fontWeight: 600 },
  clientStat: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-2)' },
  clientStatV: { color: 'var(--fg-0)', fontWeight: 600 },

  analytics: { padding: 24, display: 'flex', flexDirection: 'column', gap: 18 },
  chartCard: { background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 14, padding: 20 },
  chartHd: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 },
  chartT: { fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' },
  chartS: { fontSize: 11, color: 'var(--fg-2)' },
  chartGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },

  copilot: {
    width: 340, flex: 'none', background: 'var(--bg-1)', borderLeft: '1px solid var(--border-1)',
    display: 'flex', flexDirection: 'column', height: '100%'
  },
  copHead: { padding: '14px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: 10 },
  copBody: { overflow: 'auto', flex: 1 },
  copSection: { padding: '14px 16px', borderBottom: '1px solid var(--border-1)' },
  copLabel: { fontSize: 10.5, fontWeight: 600, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 },
  sugg: { display: 'grid', gridTemplateColumns: '24px 1fr', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-2)', marginBottom: 8, cursor: 'pointer' },
  suggIcon: { width: 24, height: 24, borderRadius: 6, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' },
  suggT: { fontSize: 12.5, color: 'var(--fg-0)', lineHeight: 1.4, fontWeight: 500 },
  suggM: { fontSize: 11, color: 'var(--fg-2)', marginTop: 3 },

  chatBox: { padding: 12, borderTop: '1px solid var(--border-1)' },
  chatField: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-2)', background: 'var(--bg-0)', color: 'var(--fg-0)', fontSize: 13, fontFamily: 'inherit' }
};

const CHIP = (bg, fg) => ({ padding: '2px 7px', borderRadius: 5, fontSize: 10.5, fontWeight: 500, background: bg, color: fg });

function TasksView({ brief, acceptedTasks }) {
  const cols = {
    todo: { title: 'À faire', icon: 'check', color: 'var(--fg-2)', items: brief.focus.filter(f => f.priority !== 'low') },
    doing: { title: 'En cours', icon: 'clock', color: 'var(--accent)', items: [
      { id: 'x1', title: 'Review PR #284 — Acme Corp', client: 'Acme Corp', clientColor: '#111', est: '1h', billable: true },
      { id: 'x2', title: 'Intégration Stripe Connect', client: 'Fable & Co', clientColor: '#333', est: '3h', billable: true }
    ]},
    review: { title: 'En attente client', icon: 'chat', color: 'var(--warn)', items: [
      { id: 'x3', title: 'Validation maquettes v3', client: 'Lumen Studio', clientColor: '#555', due: '2 jours', billable: false },
      { id: 'x4', title: 'Confirmer périmètre MVP', client: 'Pelican Labs', clientColor: '#777', due: 'hier', billable: false, overdue: true }
    ]},
    done: { title: 'Terminé (7j)', icon: 'check', color: 'var(--ok)', items: [
      { id: 'x5', title: 'Migration BDD reporting', client: 'North Park', clientColor: '#222', est: '4h', billable: true, billed: true },
      { id: 'x6', title: 'Design system audit', client: 'Orion', clientColor: '#444', est: '2h30', billable: true, billed: true },
      { id: 'x7', title: 'Call kickoff — Fable', client: 'Fable & Co', clientColor: '#333', est: '30 min', billable: false }
    ]}
  };
  return (
    <div style={viewStyles.wrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--fg-0)', margin: 0, letterSpacing: '-0.01em' }}>Tâches</h2>
        <span style={CHIP('var(--accent-soft)', 'var(--accent-ink)')}>Auto-générées par le copilote</span>
        <button style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 8, background: 'var(--fg-0)', color: 'var(--bg-1)', fontSize: 12.5, fontWeight: 600 }}>
          <Icon name="plus" size={12} /> Nouvelle tâche
        </button>
      </div>
      <div style={viewStyles.kanban}>
        {Object.values(cols).map(col => (
          <div key={col.title} style={viewStyles.col}>
            <div style={viewStyles.colHead}>
              <Icon name={col.icon} size={13} color={col.color} />
              <span style={viewStyles.colTitle}>{col.title}</span>
              <span style={viewStyles.colCount}>{col.items.length}</span>
            </div>
            <div style={viewStyles.colBody}>
              {col.items.map(t => (
                <div key={t.id} style={viewStyles.card}>
                  <div style={viewStyles.cardTitle}>{t.title}</div>
                  <div style={viewStyles.cardMeta}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 2, background: t.clientColor }}></span>
                      {t.client}
                    </span>
                    {t.due && <span>· {t.overdue ? <span style={{ color: 'var(--danger)' }}>{t.due}</span> : t.due}</span>}
                    {t.est && <span>· {t.est}</span>}
                    {t.billable && <span style={CHIP('var(--ok-soft)', 'var(--ok)')}>€</span>}
                    {t.billed && <span style={CHIP('var(--bg-2)', 'var(--fg-2)')}>Facturé</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientsView({ clients = [], messages = [], onOpen, onAdd, onConnectChannel }) {
  const [query, setQuery] = React.useState('');

  // Compute per-client stats from live messages
  const stats = React.useMemo(() => {
    const m = {};
    (messages || []).forEach(msg => {
      if (!msg.clientId) return;
      if (!m[msg.clientId]) m[msg.clientId] = { total: 0, unread: 0, last: null, sources: new Set() };
      m[msg.clientId].total += 1;
      if (msg.unread) m[msg.clientId].unread += 1;
      if (msg.source) m[msg.clientId].sources.add(msg.source);
      if (!m[msg.clientId].last) m[msg.clientId].last = msg.time || '';
    });
    return m;
  }, [messages]);

  const q = query.trim().toLowerCase();
  const filtered = (clients || []).filter(c => !q || (c.name || '').toLowerCase().includes(q));

  // Empty state
  if ((clients || []).length === 0) {
    return (
      <div style={{ padding: 32, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 380 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <Icon name="briefcase" size={22} color="var(--accent)" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-0)', marginBottom: 6 }}>Aucun projet pour l'instant</div>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 18 }}>
              Connecte une messagerie pour créer automatiquement un projet à partir de chaque client, ou ajoute-en un manuellement.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={onConnectChannel}
                style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--fg-0)', color: 'var(--bg-1)', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="link" size={12} /> Connecter un canal
              </button>
              <button onClick={onAdd}
                style={{ padding: '10px 16px', borderRadius: 10, background: 'transparent', color: 'var(--fg-1)', fontSize: 13, fontWeight: 600, border: '1px solid var(--border-2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="plus" size={12} /> Nouveau projet
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 32px 32px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%', overflowY: 'auto' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10, padding: '8px 12px', maxWidth: 360 }}>
          <Icon name="search" size={13} color="var(--fg-3)" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un projet…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--fg-0)', fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-2)', fontWeight: 600 }}>
          {filtered.length} projet{filtered.length > 1 ? 's' : ''}
        </div>
        <button onClick={onAdd}
          style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--fg-0)', color: 'var(--bg-1)', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="plus" size={12} /> Nouveau projet
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {filtered.map(c => {
          const s = stats[c.id] || { total: 0, unread: 0, sources: new Set() };
          const sources = Array.from(s.sources);
          return (
            <div key={c.id}
              onClick={() => onOpen && onOpen(c.id)}
              style={{
                background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 14,
                padding: 16, display: 'flex', flexDirection: 'column', gap: 14,
                cursor: 'pointer', transition: 'border-color 120ms, transform 120ms, box-shadow 120ms'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-1)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {c.avatarUrl
                  ? <img src={c.avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flex: 'none' }} />
                  : <div style={{ width: 40, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 13, fontWeight: 700, background: c.color, flex: 'none' }}>{c.avatar}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-2)', marginTop: 2 }}>
                    {(c.tags || []).join(' · ') || 'Contact'}
                  </div>
                </div>
                {s.unread > 0 && (
                  <span style={{ padding: '3px 8px', borderRadius: 999, background: 'var(--accent)', color: '#fff', fontSize: 10.5, fontWeight: 700 }}>
                    {s.unread}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-2)' }}>
                  <span>Messages</span>
                  <span style={{ color: 'var(--fg-0)', fontWeight: 600 }}>{s.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-2)' }}>
                  <span>Dernière activité</span>
                  <span style={{ color: 'var(--fg-0)', fontWeight: 600 }}>{c.lastActivity || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-2)', alignItems: 'center' }}>
                  <span>Canaux</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {sources.length === 0 && <span style={{ color: 'var(--fg-3)' }}>—</span>}
                    {sources.map(src => (
                      <span key={src} style={{ padding: '1px 7px', borderRadius: 5, fontSize: 10.5, fontWeight: 600, background: 'var(--bg-2)', color: 'var(--fg-1)' }}>{src}</span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); onOpen && onOpen(c.id); }}
                style={{ padding: '8px 10px', borderRadius: 9, background: 'var(--bg-2)', color: 'var(--fg-1)', fontSize: 12, fontWeight: 600, border: '1px solid var(--border-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name="mail" size={11} /> Ouvrir la conversation
              </button>
            </div>
          );
        })}

        {/* Add card */}
        <button
          onClick={onAdd}
          style={{
            background: 'transparent', border: '1px dashed var(--border-2)', borderRadius: 14,
            padding: 16, minHeight: 180, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
            color: 'var(--fg-3)', fontFamily: 'inherit', transition: 'border-color 120ms, color 120ms'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--fg-3)'; }}
        >
          <Icon name="plus" size={18} />
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Nouveau projet</span>
        </button>
      </div>
    </div>
  );
}

function AreaChart({ data, labels, color = 'var(--accent)', height = 180 }) {
  const w = 580, h = height;
  const max = Math.max(...data), min = Math.min(...data);
  const range = (max - min) || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 20) - 10;
    return [x, y];
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ga)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--bg-1)" stroke={color} strokeWidth="1.5" />)}
    </svg>
  );
}

function AnalyticsView({ kpis }) {
  return (
    <div style={viewStyles.analytics}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--fg-0)', margin: 0, letterSpacing: '-0.01em' }}>Analytics</h2>
        <div style={{ fontSize: 12.5, color: 'var(--fg-2)' }}>14 derniers jours · mis à jour il y a 3 min</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { k: 'billable', icon: 'clock', c: 'var(--accent)' },
          { k: 'revenue',  icon: 'euro',  c: 'var(--ok)' },
          { k: 'response', icon: 'bolt',  c: 'var(--warn)' },
          { k: 'deals',    icon: 'briefcase', c: 'var(--info)' },
        ].map(({ k, icon, c }) => {
          const d = kpis[k];
          return (
            <div key={k} style={viewStyles.chartCard}>
              <div style={{ fontSize: 11.5, color: 'var(--fg-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name={icon} size={12} color={c} /> {d.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--fg-0)', letterSpacing: '-0.015em', margin: '6px 0 4px' }}>{d.value}</div>
              <div style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 600 }}>{d.delta}</div>
              <div style={{ marginTop: 10 }}><Sparkline values={d.trend} color={c} width={240} height={36} /></div>
            </div>
          );
        })}
      </div>
      <div style={viewStyles.chartGrid}>
        <div style={viewStyles.chartCard}>
          <div style={viewStyles.chartHd}>
            <span style={viewStyles.chartT}>Heures facturables · 14 derniers jours</span>
            <span style={viewStyles.chartS}>Objectif 30h / semaine</span>
          </div>
          <AreaChart data={[3.5, 4.2, 5.1, 2.8, 6.4, 7.2, 5.9, 4.1, 6.8, 7.5, 8.2, 5.5, 7.8, 8.4]} color="var(--accent)" />
        </div>
        <div style={viewStyles.chartCard}>
          <div style={viewStyles.chartHd}>
            <span style={viewStyles.chartT}>Temps de réponse moyen</span>
            <span style={viewStyles.chartS}>Meilleur que 82% des freelances</span>
          </div>
          <AreaChart data={[185, 175, 162, 160, 155, 148, 140, 142, 138, 135, 130, 128, 132, 125]} color="var(--warn)" />
        </div>
      </div>
    </div>
  );
}

function CopilotPanel({ onClose, suggestions, onCommand }) {
  return (
    <aside style={viewStyles.copilot}>
      <div style={viewStyles.copHead}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--fg-0)', display: 'grid', placeItems: 'center' }}>
          <Icon name="sparkles" size={14} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg-0)' }}>Copilot</div>
          <div style={{ fontSize: 11, color: 'var(--fg-2)' }}>Analyse 7 sources en continu</div>
        </div>
        <button onClick={onClose} style={{ color: 'var(--fg-2)', padding: 5, borderRadius: 6 }}><Icon name="x" size={14} /></button>
      </div>
      <div style={viewStyles.copBody}>
        <div style={viewStyles.copSection}>
          <div style={viewStyles.copLabel}>Suggestions du moment</div>
          {suggestions.map((s, i) => (
            <div key={i} style={viewStyles.sugg} onClick={() => onCommand(s.cmd)}>
              <div style={viewStyles.suggIcon}><Icon name={s.icon} size={12} /></div>
              <div>
                <div style={viewStyles.suggT}>{s.title}</div>
                <div style={viewStyles.suggM}>{s.meta}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={viewStyles.copSection}>
          <div style={viewStyles.copLabel}>Raccourcis</div>
          {[
            { t: 'Résume ma semaine', i: 'file' },
            { t: 'Planifie mes 2 prochaines heures', i: 'calendar' },
            { t: 'Génère la facture d\'avril — Acme', i: 'euro' },
            { t: 'Relance les clients silencieux', i: 'chat' }
          ].map((r, i) => (
            <div key={i} style={viewStyles.sugg}>
              <div style={viewStyles.suggIcon}><Icon name={r.i} size={12} /></div>
              <div><div style={viewStyles.suggT}>{r.t}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div style={viewStyles.chatBox}>
        <input style={viewStyles.chatField} placeholder="Demande au copilote…" />
        <div style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 6, display: 'flex', gap: 8 }}>
          <span>↵ envoyer</span><span>⌘K ouvrir</span>
        </div>
      </div>
    </aside>
  );
}

window.TasksView = TasksView;
window.ClientsView = ClientsView;
window.AnalyticsView = AnalyticsView;
window.CopilotPanel = CopilotPanel;
window.AreaChart = AreaChart;
