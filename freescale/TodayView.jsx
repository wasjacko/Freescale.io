// Freescale — TodayView : messages→tâches + kanban 4 colonnes + archives

const CHIP = (bg, fg) => ({ padding: '2px 7px', borderRadius: 5, fontSize: 10.5, fontWeight: 500, background: bg, color: fg });

function PriorityBadge({ priority }) {
  const map = {
    high: { bg: 'var(--danger-soft)', fg: 'var(--danger)', label: 'Urgent' },
    med:  { bg: 'var(--warn-soft)',   fg: 'var(--warn)',   label: 'Moyen' },
    low:  { bg: 'var(--bg-2)',        fg: 'var(--fg-2)',   label: 'Low' },
  };
  const m = map[priority] || map.low;
  return <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: m.bg, color: m.fg }}>{m.label}</span>;
}

// ─── KanbanCard ──────────────────────────────────────────────────────────────
function KanbanCard({ task, onValidate, onArchive, onDragStart, onDragEnd, isDragging }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-0)', border: '1px solid var(--border-1)', borderRadius: 10, padding: '10px 12px',
        position: 'relative', transition: 'box-shadow 120ms, opacity 200ms',
        boxShadow: hovered && !isDragging ? '0 2px 10px rgba(0,0,0,0.08)' : 'none',
        opacity: isDragging ? 0.35 : 1, cursor: 'grab',
      }}>

      {/* Actions — toujours visibles */}
      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
        {/* Archive */}
        <button
          onClick={(e) => { e.stopPropagation(); onArchive(task); }}
          title="Archiver la tâche"
          style={{
            width: 20, height: 20, borderRadius: 5,
            background: hovered ? 'var(--bg-2)' : 'transparent',
            border: hovered ? '1px solid var(--border-1)' : '1px solid transparent',
            cursor: 'pointer', display: 'grid', placeItems: 'center',
            transition: 'background 150ms, opacity 150ms',
            opacity: hovered ? 1 : 0.35,
          }}>
          <Icon name="archive" size={10} color="var(--fg-3)" />
        </button>
        {/* Valider */}
        <button
          onClick={(e) => { e.stopPropagation(); onValidate(task); }}
          title="Valider la tâche"
          style={{
            width: 20, height: 20, borderRadius: '50%',
            background: hovered ? 'var(--ok)' : 'var(--bg-2)',
            border: hovered ? 'none' : '1.5px solid var(--border-1)',
            cursor: 'pointer', display: 'grid', placeItems: 'center',
            transition: 'background 150ms, border 150ms, transform 100ms',
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
            boxShadow: hovered ? '0 2px 6px rgba(22,163,74,0.3)' : 'none',
          }}>
          <Icon name="check" size={10} color={hovered ? '#fff' : 'var(--fg-3)'} />
        </button>
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg-0)', marginBottom: 7, lineHeight: 1.4, paddingRight: 48 }}>
        {task.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--fg-2)', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: task.clientColor, display: 'inline-block' }}></span>
          {task.client}
        </span>
        {task.due && <span>· {task.overdue ? <span style={{ color: 'var(--danger)' }}>{task.due}</span> : task.due}</span>}
        {task.est && <span>· {task.est}</span>}
        {task.billable && <span style={CHIP('var(--ok-soft)', 'var(--ok)')}>€</span>}
        {task.billed && <span style={CHIP('var(--bg-2)', 'var(--fg-2)')}>Facturé</span>}
      </div>
    </div>
  );
}

// ─── Notification progression projet ─────────────────────────────────────────
function ProjectNotification({ notif, onClose }) {
  const pct = notif.total > 0 ? Math.round((notif.done / notif.total) * 100) : 0;
  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16, zIndex: 50,
      background: 'var(--bg-1)', border: '1px solid var(--border-1)',
      borderRadius: 14, padding: '14px 16px', width: 230,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: notif.clientColor, flex: 'none' }}></span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg-0)', flex: 1 }}>{notif.client}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--fg-3)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--fg-2)', marginBottom: 8 }}>
        <span style={{ color: 'var(--ok)', fontWeight: 700 }}>{notif.done}</span> / {notif.total} tâches terminées
      </div>
      <div style={{ background: 'var(--bg-2)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, background: pct === 100 ? 'var(--ok)' : 'var(--accent)', width: `${pct}%`, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 5, textAlign: 'right' }}>{pct}% avancement</div>
    </div>
  );
}

// ─── Section Messages → Tâches ───────────────────────────────────────────────
const SOURCE_COLORS = { gmail: '#EA4335', outlook: '#0078D4', slack: '#4A154B', discord: '#5865F2', whatsapp: '#25D366', telegram: '#2AABEE', instagram: '#E1306C' };
const SOURCE_GLYPHS = { gmail: 'mail', outlook: 'mail', slack: 'hash', discord: 'chat', whatsapp: 'whatsapp', telegram: 'send', instagram: 'camera' };

// Simule les phrases que l'IA "dit" pendant le chargement
const AI_PHRASES = [
  'Analyse du contexte…',
  'Détection des actions…',
  'Estimation des durées…',
  'Tâches prêtes ✓',
];

function MessageCard({ msg, onAddTask }) {
  const [status, setStatus]       = React.useState('idle');   // idle | loading | ready | done
  const [loadPct, setLoadPct]     = React.useState(0);
  const [phraseIdx, setPhraseIdx] = React.useState(0);
  const [validated, setValidated] = React.useState(new Set());

  const clients = window.FreescaleData?.clients || [];
  const client  = clients.find(c => c.id === msg.clientId) || {};
  const srcColor = SOURCE_COLORS[msg.source] || '#888';
  const srcGlyph = SOURCE_GLYPHS[msg.source] || 'chat';

  const startLoading = () => {
    setStatus('loading');
    setLoadPct(0);
    setPhraseIdx(0);

    // barre de progression sur 1.6s par paliers
    const steps = [15, 35, 60, 80, 95, 100];
    const delays = [100, 350, 600, 950, 1250, 1600];
    steps.forEach((pct, i) => setTimeout(() => setLoadPct(pct), delays[i]));

    // phrases qui défilent
    [1, 2, 3].forEach(i => setTimeout(() => setPhraseIdx(i), i * 450));

    // fin du chargement
    setTimeout(() => setStatus('ready'), 1750);
  };

  const validateOne = (et) => {
    setValidated(prev => {
      const next = new Set(prev);
      next.add(et.id);
      onAddTask(et, client);
      if (next.size === msg.extractedTasks.length) {
        setTimeout(() => setStatus('done'), 500);
      }
      return next;
    });
  };

  const validateAll = () => {
    const all = new Set(msg.extractedTasks.map(t => t.id));
    setValidated(all);
    msg.extractedTasks.forEach(et => onAddTask(et, client));
    setTimeout(() => setStatus('done'), 600);
  };

  return (
    <div style={{
      flex: 'none', width: 236,
      background: status === 'done' ? 'var(--ok-soft)' : 'var(--bg-0)',
      border: `1px solid ${status === 'done' ? 'var(--ok)' : 'var(--border-1)'}`,
      borderRadius: 12, padding: 14,
      display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'background 0.4s, border 0.4s',
      animation: 'cardIn 0.3s cubic-bezier(0.16,1,0.3,1) both',
    }}>

      {/* En-tête message */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: srcColor + '15', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Icon name={srcGlyph} size={13} color={srcColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.from}</div>
          <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>{msg.source} · {msg.time}</div>
        </div>
        {msg.unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flex: 'none' }} />}
      </div>

      {/* Corps du message */}
      <div style={{
        fontSize: 11.5, color: 'var(--fg-2)', lineHeight: 1.5, fontStyle: 'italic',
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        "{msg.body}"
      </div>

      {/* ── État IDLE : bouton CTA ── */}
      {status === 'idle' && (
        <button onClick={startLoading} style={{
          width: '100%', padding: '9px 0', borderRadius: 8,
          background: 'var(--fg-0)', color: 'var(--bg-1)',
          border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          transition: 'opacity 150ms',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          <Icon name="sparkles" size={13} color="var(--bg-1)" /> Transformer en tâche
        </button>
      )}

      {/* ── État LOADING : jauge animée ── */}
      {status === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, minHeight: 16 }}>
            <Icon name="sparkles" size={11} color="var(--accent)" />
            <span style={{ animation: 'fadePhrase 0.3s ease' }} key={phraseIdx}>{AI_PHRASES[phraseIdx]}</span>
          </div>
          <div style={{ background: 'var(--bg-2)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: 'linear-gradient(90deg, var(--accent), #f97316)',
              width: `${loadPct}%`,
              transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: '0 0 8px rgba(234,88,12,0.4)',
            }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--fg-3)', textAlign: 'right' }}>{loadPct}%</div>
        </div>
      )}

      {/* ── État READY : tâches à valider ── */}
      {status === 'ready' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            {msg.extractedTasks.length} tâche{msg.extractedTasks.length > 1 ? 's' : ''} suggérée{msg.extractedTasks.length > 1 ? 's' : ''}
          </div>
          {msg.extractedTasks.map((et, i) => {
            const isValidated = validated.has(et.id);
            return (
              <div key={et.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '8px 10px', borderRadius: 8,
                background: isValidated ? 'var(--ok-soft)' : 'var(--bg-1)',
                border: `1px solid ${isValidated ? 'var(--ok)' : 'var(--border-1)'}`,
                transition: 'background 0.3s, border 0.3s, opacity 0.3s',
                opacity: isValidated ? 0.65 : 1,
                animation: `taskReveal 0.35s cubic-bezier(0.16,1,0.3,1) ${i * 160}ms both`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-0)', lineHeight: 1.4, textDecoration: isValidated ? 'line-through' : 'none' }}>
                    {et.title}
                  </div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                    {et.est && <span style={CHIP('var(--bg-2)', 'var(--fg-3)')}>{et.est}</span>}
                    {et.billable && <span style={CHIP('var(--ok-soft)', 'var(--ok)')}>€</span>}
                  </div>
                </div>
                {!isValidated ? (
                  <button onClick={() => validateOne(et)} style={{
                    padding: '4px 9px', borderRadius: 6, border: 'none',
                    background: 'var(--ok)', color: '#fff',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 4, flex: 'none',
                    transition: 'transform 100ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    <Icon name="check" size={10} color="#fff" /> Valider
                  </button>
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--ok)', display: 'grid', placeItems: 'center', flex: 'none', animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
                    <Icon name="check" size={12} color="#fff" />
                  </div>
                )}
              </div>
            );
          })}
          {validated.size < msg.extractedTasks.length && (
            <button onClick={validateAll} style={{
              width: '100%', marginTop: 2, padding: '8px 0', borderRadius: 8,
              background: 'var(--accent)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              animation: `taskReveal 0.35s cubic-bezier(0.16,1,0.3,1) ${msg.extractedTasks.length * 160 + 80}ms both`,
            }}>
              <Icon name="check" size={12} color="#fff" /> Tout valider ({msg.extractedTasks.length - validated.size})
            </button>
          )}
        </div>
      )}

      {/* ── État DONE ── */}
      {status === 'done' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--ok-soft)', animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ok)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Icon name="check" size={12} color="#fff" />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ok)' }}>{msg.extractedTasks.length} tâche{msg.extractedTasks.length > 1 ? 's' : ''} ajoutée{msg.extractedTasks.length > 1 ? 's' : ''} au kanban</span>
        </div>
      )}
    </div>
  );
}

function MessageTasksSection({ messages, onAddTask }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const msgsToShow = messages.filter(m => m.extractedTasks && m.extractedTasks.length > 0);

  return (
    <div style={{ flex: 'none', background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 14, overflow: 'hidden' }}>
      <div onClick={() => setCollapsed(c => !c)}
        style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: collapsed ? 'none' : '1px solid var(--border-1)' }}>
        <Icon name="message-square" size={13} color="var(--accent)" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>Messages → Tâches</span>
        <span style={CHIP('var(--accent-soft)', 'var(--accent-ink)')}>{msgsToShow.length} nouveau{msgsToShow.length > 1 ? 'x' : ''}</span>
        <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={13} color="var(--fg-3)" style={{ marginLeft: 'auto' }} />
      </div>
      {!collapsed && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 14px', overflowX: 'auto', paddingBottom: 14 }}>
          {msgsToShow.map(msg => (
            <MessageCard key={msg.id} msg={msg} onAddTask={onAddTask} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Archives Panel ───────────────────────────────────────────────────────────
function ArchivesPanel({ archived, onClose, onRestore }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(2px)',
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: 360, height: '100%', background: 'var(--bg-1)', borderLeft: '1px solid var(--border-1)',
        display: 'flex', flexDirection: 'column', animation: 'slideRight 0.25s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="archive" size={15} color="var(--fg-2)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-0)', flex: 1 }}>Archives</span>
          <span style={CHIP('var(--bg-2)', 'var(--fg-2)')}>{archived.length}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--fg-3)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {archived.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--fg-3)', fontSize: 13, marginTop: 40 }}>Aucune tâche archivée</div>
          )}
          {archived.map(t => (
            <div key={t.id + '_arch'} style={{ background: 'var(--bg-0)', border: '1px solid var(--border-1)', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg-1)', marginBottom: 5, lineHeight: 1.4 }}>{t.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--fg-3)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: t.clientColor, display: 'inline-block' }}></span>
                  {t.client}
                  {t.est && <span>· {t.est}</span>}
                </div>
              </div>
              <button
                onClick={() => onRestore(t)}
                title="Remettre dans À faire"
                style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg-2)', border: '1px solid var(--border-1)', color: 'var(--fg-2)', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Restaurer
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TodayView ────────────────────────────────────────────────────────────────
function TodayView({ tasks, nudges, brief, onComplete, onValidateTask, messages }) {
  const focus = brief?.focus || tasks || [];

  const initialCols = {
    todo: focus.filter(f => f.priority === 'high' || f.priority === 'med'),
    doing: [
      { id: 'x1', title: 'Review PR #284 — Acme Corp',  client: 'Acme Corp',    clientColor: '#5B5BF0', est: '1h',     billable: true },
      { id: 'x2', title: 'Intégration Stripe Connect',  client: 'Fable & Co',   clientColor: '#7C3AED', est: '3h',     billable: true },
    ],
    review: [
      { id: 'x3', title: 'Validation maquettes v3',     client: 'Lumen Studio', clientColor: '#F59E0B', due: '2 jours', billable: false },
      { id: 'x4', title: 'Confirmer périmètre MVP',     client: 'Pelican Labs',  clientColor: '#E11D48', due: 'hier',    billable: false, overdue: true },
    ],
    done: [
      { id: 'x5', title: 'Migration BDD reporting',     client: 'North Park',   clientColor: '#16A349', est: '4h',     billable: true, billed: true },
      { id: 'x6', title: 'Design system audit',         client: 'Orion',        clientColor: '#0EA5E9', est: '2h30',   billable: true, billed: true },
      { id: 'x7', title: 'Call kickoff — Fable',        client: 'Fable & Co',   clientColor: '#7C3AED', est: '30 min', billable: false },
    ],
  };

  const [colItems, setColItems]       = React.useState(initialCols);
  const [archived, setArchived]       = React.useState([]);
  const [showArchives, setShowArchives] = React.useState(false);
  const [dragState, setDragState]     = React.useState(null);
  const [dragOver, setDragOver]       = React.useState(null);
  const [notification, setNotification] = React.useState(null);
  const [addToast, setAddToast]       = React.useState(null);

  const triggerProgress = (task, currentCols) => {
    const all = Object.values(currentCols).flat();
    const clientTasks = all.filter(t => t.client === task.client);
    const doneCount = currentCols.done.filter(t => t.client === task.client).length;
    setNotification({ client: task.client, clientColor: task.clientColor, done: doneCount, total: clientTasks.length });
    setTimeout(() => setNotification(null), 4500);
  };

  const handleValidate = (task, fromCol) => {
    setColItems(prev => {
      const next = { ...prev };
      next[fromCol] = prev[fromCol].filter(t => t.id !== task.id);
      if (!prev.done.some(t => t.id === task.id)) {
        next.done = [{ ...task }, ...prev.done];
      }
      // trigger progress with next state values
      const clientTasks = Object.values(next).flat().filter(t => t.client === task.client);
      const doneCount = next.done.filter(t => t.client === task.client).length;
      setTimeout(() => {
        setNotification({ client: task.client, clientColor: task.clientColor, done: doneCount, total: clientTasks.length });
        setTimeout(() => setNotification(null), 4500);
      }, 0);
      return next;
    });
    if (onValidateTask) onValidateTask(task);
    if (onComplete) onComplete(task.id);
  };

  const handleArchive = (task, fromCol) => {
    setColItems(prev => {
      const next = { ...prev };
      next[fromCol] = prev[fromCol].filter(t => t.id !== task.id);
      return next;
    });
    setArchived(prev => [task, ...prev]);
  };

  const handleRestore = (task) => {
    setArchived(prev => prev.filter(t => t.id !== task.id));
    setColItems(prev => ({ ...prev, todo: [task, ...prev.todo] }));
  };

  const handleArchiveAll = () => {
    setArchived(prev => [...colItems.done, ...prev]);
    setColItems(prev => ({ ...prev, done: [] }));
  };

  // Ajoute une tâche issue d'un message dans la colonne "À faire"
  const handleAddFromMessage = (extractedTask, client) => {
    const newTask = {
      id: extractedTask.id + '_k',
      title: extractedTask.title,
      client: client.name || 'Client',
      clientColor: client.color || '#888',
      due: extractedTask.due,
      est: extractedTask.est,
      billable: extractedTask.billable,
    };
    setColItems(prev => {
      if (prev.todo.some(t => t.id === newTask.id)) return prev;
      return { ...prev, todo: [newTask, ...prev.todo] };
    });
    setAddToast({ title: newTask.title, client: newTask.client, clientColor: newTask.clientColor });
    setTimeout(() => setAddToast(null), 3200);
  };

  // Drag & drop
  const handleDragStart = (e, task, fromCol) => {
    setDragState({ task, fromCol });
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOver !== colKey) setDragOver(colKey);
  };
  const handleDrop = (e, toCol) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragState) return;
    const { task, fromCol } = dragState;
    setDragState(null);
    if (fromCol === toCol) return;
    setColItems(prev => {
      const next = { ...prev };
      next[fromCol] = prev[fromCol].filter(t => t.id !== task.id);
      if (!prev[toCol].some(t => t.id === task.id)) next[toCol] = [...prev[toCol], { ...task }];
      if (toCol === 'done') {
        const clientTasks = Object.values(next).flat().filter(t => t.client === task.client);
        const doneCount = next.done.filter(t => t.client === task.client).length;
        setTimeout(() => {
          setNotification({ client: task.client, clientColor: task.clientColor, done: doneCount, total: clientTasks.length });
          setTimeout(() => setNotification(null), 4500);
        }, 0);
        if (onValidateTask) onValidateTask(task);
        if (onComplete) onComplete(task.id);
      }
      return next;
    });
  };
  const handleDragLeave = (e, colKey) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(prev => prev === colKey ? null : prev);
  };
  const handleDragEnd = () => { setDragState(null); setDragOver(null); };

  const colDefs = [
    { key: 'todo',   title: 'À faire',          icon: 'check', color: 'var(--fg-2)' },
    { key: 'doing',  title: 'En cours',          icon: 'clock', color: 'var(--accent)' },
    { key: 'review', title: 'En attente client', icon: 'chat',  color: 'var(--warn)' },
    { key: 'done',   title: 'Terminé (7j)',      icon: 'check', color: 'var(--ok)' },
  ];

  const msgsToShow = (messages || []).filter(m => m.extractedTasks && m.extractedTasks.length > 0);

  return (
    <div style={{ padding: '8px 32px 32px', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-0)', margin: 0, letterSpacing: '-0.01em' }}>Tâches</h2>
        <span style={CHIP('var(--accent-soft)', 'var(--accent-ink)')}>Auto-générées par le copilote</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowArchives(true)}
            style={{ padding: '7px 12px', borderRadius: 9, background: 'var(--bg-2)', color: 'var(--fg-1)', fontSize: 12.5, fontWeight: 600, border: '1px solid var(--border-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="archive" size={12} /> Archives {archived.length > 0 && <span style={{ background: 'var(--fg-0)', color: 'var(--bg-1)', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{archived.length}</span>}
          </button>
          <button style={{ padding: '7px 14px', borderRadius: 9, background: 'var(--fg-0)', color: 'var(--bg-1)', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="plus" size={12} /> Nouvelle tâche
          </button>
        </div>
      </div>

      {/* Messages → Tâches */}
      {msgsToShow.length > 0 && (
        <MessageTasksSection messages={msgsToShow} onAddTask={handleAddFromMessage} />
      )}

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, minHeight: 480 }}>
        {colDefs.map(col => {
          const items = colItems[col.key];
          const isOver = dragOver === col.key;
          return (
            <div key={col.key}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDrop={(e) => handleDrop(e, col.key)}
              onDragLeave={(e) => handleDragLeave(e, col.key)}
              style={{
                background: isOver ? 'var(--accent-soft)' : 'var(--bg-1)',
                border: isOver ? '2px dashed var(--accent)' : '1px solid var(--border-1)',
                borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                transition: 'background 150ms, border 150ms',
              }}>
              <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${isOver ? 'var(--accent)' : 'var(--border-1)'}` }}>
                <Icon name={col.icon} size={13} color={col.color} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>{col.title}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)' }}>{items.length}</span>
                {col.key === 'done' && items.length > 0 && (
                  <button onClick={handleArchiveAll} title="Archiver toutes les tâches terminées"
                    style={{ marginLeft: 4, padding: '2px 7px', borderRadius: 5, fontSize: 10.5, fontWeight: 600, background: 'var(--bg-2)', color: 'var(--fg-2)', border: '1px solid var(--border-1)', cursor: 'pointer' }}>
                    Archiver tout
                  </button>
                )}
              </div>
              <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(t => (
                  <KanbanCard key={t.id} task={t}
                    onValidate={(task) => handleValidate(task, col.key)}
                    onArchive={(task) => handleArchive(task, col.key)}
                    onDragStart={(e, task) => handleDragStart(e, task, col.key)}
                    onDragEnd={handleDragEnd}
                    isDragging={dragState?.task?.id === t.id}
                  />
                ))}
                {isOver && dragState && dragState.fromCol !== col.key && (
                  <div style={{ height: 44, borderRadius: 10, border: '2px dashed var(--accent)', opacity: 0.4 }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notification progression projet */}
      {notification && <ProjectNotification notif={notification} onClose={() => setNotification(null)} />}

      {/* Toast ajout kanban */}
      {addToast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--fg-0)', color: 'var(--bg-1)',
          padding: '11px 18px', borderRadius: 12,
          fontSize: 13, fontWeight: 500, zIndex: 200,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
          whiteSpace: 'nowrap',
        }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--ok)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Icon name="check" size={11} color="#fff" />
          </div>
          <span>
            <span style={{ fontWeight: 700 }}>{addToast.title.length > 36 ? addToast.title.slice(0, 36) + '…' : addToast.title}</span>
            {' '}ajoutée à <span style={{ color: 'var(--ok)', fontWeight: 700 }}>À faire</span>
          </span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: addToast.clientColor, flex: 'none', marginLeft: 2 }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{addToast.client}</span>
        </div>
      )}

      {/* Archives panel */}
      {showArchives && (
        <ArchivesPanel archived={archived} onClose={() => setShowArchives(false)} onRestore={handleRestore} />
      )}

      <style>{`
        @keyframes slideUp    { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideRight { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }
        @keyframes taskReveal { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes cardIn     { from { opacity:0; transform:scale(0.97) }      to { opacity:1; transform:scale(1) } }
        @keyframes popIn      { from { opacity:0; transform:scale(0.6) }       to { opacity:1; transform:scale(1) } }
        @keyframes fadePhrase { from { opacity:0 } to { opacity:1 } }
      `}</style>
    </div>
  );
}

window.TodayView = TodayView;
window.PriorityBadge = PriorityBadge;
