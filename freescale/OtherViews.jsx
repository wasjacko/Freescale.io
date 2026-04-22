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
      { id: 'x1', title: 'Review PR #284 — Acme Corp', client: 'Acme Corp', clientColor: '#5B5BF0', est: '1h', billable: true },
      { id: 'x2', title: 'Intégration Stripe Connect', client: 'Fable & Co', clientColor: '#7C3AED', est: '3h', billable: true }
    ]},
    review: { title: 'En attente client', icon: 'chat', color: 'var(--warn)', items: [
      { id: 'x3', title: 'Validation maquettes v3', client: 'Lumen Studio', clientColor: '#F59E0B', due: '2 jours', billable: false },
      { id: 'x4', title: 'Confirmer périmètre MVP', client: 'Pelican Labs', clientColor: '#E11D48', due: 'hier', billable: false, overdue: true }
    ]},
    done: { title: 'Terminé (7j)', icon: 'check', color: 'var(--ok)', items: [
      { id: 'x5', title: 'Migration BDD reporting', client: 'North Park', clientColor: '#16A349', est: '4h', billable: true, billed: true },
      { id: 'x6', title: 'Design system audit', client: 'Orion', clientColor: '#0EA5E9', est: '2h30', billable: true, billed: true },
      { id: 'x7', title: 'Call kickoff — Fable', client: 'Fable & Co', clientColor: '#7C3AED', est: '30 min', billable: false }
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

function ClientsView({ clients }) {
  return (
    <div style={viewStyles.clientsGrid}>
      {clients.map(c => (
        <div key={c.id} style={viewStyles.clientCard}>
          <div style={viewStyles.clientHead}>
            <div style={{ ...viewStyles.clientAv, background: c.color }}>{c.avatar}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>{c.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-2)' }}>{c.tags.join(' · ')}</div>
            </div>
            <span style={c.status === 'deal' ? CHIP('var(--info-soft)', 'var(--info)') : CHIP('var(--ok-soft)', 'var(--ok)')}>{c.status === 'deal' ? 'Deal' : 'Actif'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={viewStyles.clientStat}><span>TJM</span><span style={viewStyles.clientStatV}>{c.rate ? c.rate + '0 €' : '—'}</span></div>
            <div style={viewStyles.clientStat}><span>Revenu 2026</span><span style={viewStyles.clientStatV}>{c.value.toLocaleString('fr-FR')} €</span></div>
            <div style={viewStyles.clientStat}><span>Dernière activité</span><span style={viewStyles.clientStatV}>{c.lastActivity}</span></div>
          </div>
        </div>
      ))}
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
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), #8D6DF6)', display: 'grid', placeItems: 'center' }}>
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
