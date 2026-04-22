// Orbit — Today dashboard: hero brief + focus list + KPIs + nudges
const todayStyles = {
  wrap: { padding: 24, display: 'flex', flexDirection: 'column', gap: 20 },
  hero: {
    background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 16,
    padding: 22, display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'flex-start',
    position: 'relative', overflow: 'hidden'
  },
  heroGlow: {
    position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%',
    background: 'radial-gradient(closest-side, rgba(91,91,240,0.12), transparent)', pointerEvents: 'none'
  },
  eyebrow: {
    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
    color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10
  },
  heroH1: { fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--fg-0)', margin: '0 0 10px' },
  heroBody: { fontSize: 14.5, color: 'var(--fg-1)', lineHeight: 1.6, maxWidth: 640 },
  heroHighlight: { color: 'var(--accent)', fontWeight: 600, background: 'var(--accent-soft)', padding: '1px 5px', borderRadius: 4 },
  heroStats: { display: 'flex', gap: 24, marginTop: 16 },
  heroStat: { display: 'flex', flexDirection: 'column', gap: 2 },
  heroStatValue: { fontSize: 20, fontWeight: 600, color: 'var(--fg-0)', letterSpacing: '-0.01em' },
  heroStatLabel: { fontSize: 11, color: 'var(--fg-2)', fontWeight: 500 },

  date: { textAlign: 'right' },
  dateDay: { fontSize: 42, fontWeight: 600, lineHeight: 1, color: 'var(--fg-0)', letterSpacing: '-0.02em' },
  dateMonth: { fontSize: 12, color: 'var(--fg-2)', marginTop: 4, textTransform: 'capitalize' },

  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  kpi: {
    background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 12, padding: 16,
    display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden'
  },
  kpiLbl: { fontSize: 11, color: 'var(--fg-2)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 },
  kpiVal: { fontSize: 22, fontWeight: 600, color: 'var(--fg-0)', letterSpacing: '-0.015em' },
  kpiDelta: { fontSize: 11, color: 'var(--ok)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 },
  kpiSpark: { position: 'absolute', right: 12, bottom: 12, opacity: 0.75 },

  grid: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 },

  panel: { background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 14, overflow: 'hidden' },
  panelHead: {
    padding: '14px 18px', borderBottom: '1px solid var(--border-1)',
    display: 'flex', alignItems: 'center', gap: 10
  },
  panelTitle: { fontSize: 14, fontWeight: 600, color: 'var(--fg-0)', display: 'flex', alignItems: 'center', gap: 8 },
  panelPill: {
    padding: '2px 8px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent-ink)',
    fontSize: 11, fontWeight: 600
  },

  taskRow: {
    display: 'grid', gridTemplateColumns: '22px 1fr auto', gap: 12, padding: '12px 18px',
    borderTop: '1px solid var(--border-1)', alignItems: 'center', cursor: 'pointer', transition: 'background 120ms'
  },
  checkbox: {
    width: 18, height: 18, borderRadius: 5, border: '1.5px solid var(--border-3)',
    display: 'grid', placeItems: 'center', flex: 'none'
  },
  taskTitle: { fontSize: 13.5, fontWeight: 500, color: 'var(--fg-0)', marginBottom: 3 },
  taskMeta: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--fg-2)', flexWrap: 'wrap' },
  clientChip: {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px 2px 5px', borderRadius: 999,
    background: 'var(--bg-2)', fontSize: 11, fontWeight: 500, color: 'var(--fg-1)'
  },
  clientDot: { width: 8, height: 8, borderRadius: 2 },
  due: { display: 'inline-flex', alignItems: 'center', gap: 3 },
  prio: {
    padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em'
  },
  estBox: { textAlign: 'right', fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)' },
  billable: { color: 'var(--ok)', fontWeight: 600, fontSize: 11 },

  nudge: {
    padding: '12px 14px', border: '1px solid var(--border-1)', borderRadius: 10, background: 'var(--bg-0)',
    display: 'flex', gap: 10, fontSize: 12, lineHeight: 1.45, marginBottom: 8
  },
  nudgeIcon: { width: 26, height: 26, borderRadius: 6, flex: 'none', display: 'grid', placeItems: 'center' },
  nudgeTitle: { fontWeight: 600, color: 'var(--fg-0)', marginBottom: 2 },
  nudgeBody: { color: 'var(--fg-2)' },
  nudgeAct: { color: 'var(--accent)', fontWeight: 600, fontSize: 11.5, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 3 },
};

function Sparkline({ values, color = 'var(--accent)', width = 68, height = 22 }) {
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

function PriorityBadge({ priority }) {
  const map = {
    high: { bg: 'var(--danger-soft)', fg: 'var(--danger)', label: 'Urgent' },
    med:  { bg: 'var(--warn-soft)',   fg: 'var(--warn)',   label: 'Moyen' },
    low:  { bg: 'var(--bg-2)',        fg: 'var(--fg-2)',   label: 'Low' },
  };
  const m = map[priority] || map.low;
  return <span style={{ ...todayStyles.prio, background: m.bg, color: m.fg }}>{m.label}</span>;
}

function TodayView({ brief, kpis, sources, onOpenTaskExtractor }) {
  const srcMap = Object.fromEntries(sources.map(s => [s.id, s]));

  return (
    <div style={todayStyles.wrap}>
      {/* Hero brief */}
      <div style={todayStyles.hero}>
        <div style={todayStyles.heroGlow}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={todayStyles.eyebrow}><Icon name="sparkles" size={12} /> Brief du copilote · 07:00</div>
          <h1 style={todayStyles.heroH1}>Bonjour Yanis. Voici ta journée.</h1>
          <p style={todayStyles.heroBody}>
            <span style={todayStyles.heroHighlight}>3 tâches urgentes</span>, dont <strong>2 facturables</strong> (5h30 à planifier).
            Une <strong>proposition commerciale</strong> à boucler pour Pelican Labs avant mercredi.
            Emma Rodriguez n'a pas répondu depuis 4 jours — relance douce suggérée.
          </p>
          <div style={todayStyles.heroStats}>
            <div style={todayStyles.heroStat}>
              <div style={todayStyles.heroStatValue}>5h 30</div>
              <div style={todayStyles.heroStatLabel}>À planifier aujourd'hui</div>
            </div>
            <div style={todayStyles.heroStat}>
              <div style={{ ...todayStyles.heroStatValue, color: 'var(--ok)' }}>+ 530 €</div>
              <div style={todayStyles.heroStatLabel}>Revenu potentiel</div>
            </div>
            <div style={todayStyles.heroStat}>
              <div style={todayStyles.heroStatValue}>7</div>
              <div style={todayStyles.heroStatLabel}>Messages non lus</div>
            </div>
          </div>
        </div>
        <div style={todayStyles.date}>
          <div style={todayStyles.dateDay}>20</div>
          <div style={todayStyles.dateMonth}>lundi avril</div>
        </div>
      </div>

      {/* KPI row */}
      <div style={todayStyles.kpiRow}>
        {[
          { k: 'billable', icon: 'clock', color: 'var(--accent)' },
          { k: 'revenue',  icon: 'euro',  color: 'var(--ok)' },
          { k: 'response', icon: 'bolt',  color: 'var(--warn)' },
          { k: 'deals',    icon: 'briefcase', color: 'var(--info)' }
        ].map(({ k, icon, color }) => {
          const d = kpis[k];
          return (
            <div key={k} style={todayStyles.kpi}>
              <div style={todayStyles.kpiLbl}><Icon name={icon} size={12} color={color} /> {d.label}</div>
              <div style={todayStyles.kpiVal}>{d.value}</div>
              <div style={todayStyles.kpiDelta}>
                <Icon name={d.delta.startsWith('+') || d.delta.startsWith('–') && k === 'response' ? 'arrowUp' : 'arrowUp'} size={10} />
                {d.delta}
              </div>
              <div style={todayStyles.kpiSpark}><Sparkline values={d.trend} color={color} /></div>
            </div>
          );
        })}
      </div>

      {/* Main grid: focus + nudges */}
      <div style={todayStyles.grid}>
        <div style={todayStyles.panel}>
          <div style={todayStyles.panelHead}>
            <div style={todayStyles.panelTitle}><Icon name="flame" size={15} color="var(--accent)" /> Focus du jour</div>
            <div style={todayStyles.panelPill}>Priorisé par IA</div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button style={{ padding: '5px 9px', borderRadius: 6, fontSize: 11, color: 'var(--fg-2)', background: 'var(--bg-2)' }}><Icon name="filter" size={11} /> Filtrer</button>
              <button style={{ padding: '5px 9px', borderRadius: 6, fontSize: 11, color: 'var(--fg-2)', background: 'var(--bg-2)' }}><Icon name="more" size={11} /></button>
            </div>
          </div>
          {brief.focus.map(t => {
            const src = srcMap[t.source];
            return (
              <div key={t.id} style={todayStyles.taskRow}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => onOpenTaskExtractor && onOpenTaskExtractor(t)}>
                <div style={todayStyles.checkbox}></div>
                <div style={{ minWidth: 0 }}>
                  <div style={todayStyles.taskTitle}>{t.title}</div>
                  <div style={todayStyles.taskMeta}>
                    <span style={todayStyles.clientChip}>
                      <span style={{ ...todayStyles.clientDot, background: t.clientColor }}></span>
                      {t.client}
                    </span>
                    <span style={todayStyles.due}><Icon name="calendar" size={11} /> {t.due}</span>
                    {src && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--fg-2)' }}>
                        <span style={{ width: 14, height: 14, borderRadius: 3, background: src.soft, color: src.color, display: 'grid', placeItems: 'center' }}>
                          <Icon name={src.glyph} size={9} />
                        </span>
                        {t.from}
                      </span>
                    )}
                    <PriorityBadge priority={t.priority} />
                    {t.deal && <span style={{ ...todayStyles.prio, background: 'var(--info-soft)', color: 'var(--info)' }}>Deal</span>}
                  </div>
                </div>
                <div style={todayStyles.estBox}>
                  <div>{t.est}</div>
                  {t.billable && <div style={todayStyles.billable}>• {t.revenue}€</div>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={todayStyles.panel}>
          <div style={todayStyles.panelHead}>
            <div style={todayStyles.panelTitle}><Icon name="bell" size={15} color="var(--warn)" /> À surveiller</div>
          </div>
          <div style={{ padding: 14 }}>
            {brief.nudges.map(n => {
              const cfg = {
                follow_up: { icon: 'chat',      bg: 'var(--warn-soft)',   fg: 'var(--warn)', title: 'Client silencieux' },
                invoice:   { icon: 'euro',      bg: 'var(--danger-soft)', fg: 'var(--danger)', title: 'Facture en retard' },
                deal:      { icon: 'briefcase', bg: 'var(--info-soft)',   fg: 'var(--info)', title: 'Deal en stagnation' }
              }[n.kind];
              return (
                <div key={n.id} style={todayStyles.nudge}>
                  <div style={{ ...todayStyles.nudgeIcon, background: cfg.bg, color: cfg.fg }}>
                    <Icon name={cfg.icon} size={13} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={todayStyles.nudgeTitle}>{cfg.title} · {n.client}</div>
                    <div style={todayStyles.nudgeBody}>
                      {n.silenceDays ? `Sans nouvelles depuis ${n.silenceDays} jours. ${n.suggestion}` : n.note}
                    </div>
                    <a style={todayStyles.nudgeAct}>Traiter <Icon name="arrowR" size={11} /></a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

window.TodayView = TodayView;
window.Sparkline = Sparkline;
window.PriorityBadge = PriorityBadge;
