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

function ClientMessagesCard({ clientMessages, onAddTask, sectionStatus }) {
  const [validated, setValidated] = React.useState(new Set());
  const [seenTasks, setSeenTasks]   = React.useState(new Set());

  const msgCount = clientMessages.length;
  const firstMsg = clientMessages[0];
  const clients = window.FreescaleData?.clients || [];
  const client  = clients.find(c => c.id === firstMsg.clientId) || {};
  const srcColor = SOURCE_COLORS[firstMsg.source] || '#888';
  const srcGlyph = SOURCE_GLYPHS[firstMsg.source] || 'chat';

  const allTasks = clientMessages.flatMap(m => m.extractedTasks || []);

  const validateOne = (et) => {
    setValidated(prev => {
      const next = new Set(prev);
      next.add(et.id);
      onAddTask(et, client);
      return next;
    });
  };

  const isDone = sectionStatus === 'ready' && validated.size === allTasks.length && allTasks.length > 0;

  return (
    <div style={{
      flex: 'none', width: 320,
      background: isDone ? 'var(--ok-soft)' : 'var(--bg-0)',
      border: `1px solid ${isDone ? 'var(--ok)' : 'var(--border-1)'}`,
      borderRadius: 12, padding: 14,
      display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
      animation: 'cardIn 0.3s both',
    }}>

      {/* En-tête : Client */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: srcColor + '15', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Icon name={srcGlyph} size={13} color={srcColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--fg-0)' }}>
            {client.name || firstMsg.from}
          </div>
          <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>{msgCount} message{msgCount > 1 ? 's' : ''} · {firstMsg.time}</div>
        </div>
        {firstMsg.unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flex: 'none' }} />}
      </div>

      {/* État IDLE : Attente d'analyse */}
      {sectionStatus === 'idle' && (
        <div style={{ padding: '12px', background: 'var(--bg-1)', borderRadius: 10, border: '1px dashed var(--border-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
           <Icon name="clock" size={12} color="var(--fg-3)" />
           <span style={{ fontSize: 11, color: 'var(--fg-3)', fontStyle: 'italic' }}>En attente d'analyse...</span>
        </div>
      )}

      {/* État LOADING : Shimmer */}
      {sectionStatus === 'loading' && (
        <div style={{ height: 120, background: 'var(--bg-2)', borderRadius: 10, animation: 'pulse 1.5s infinite', display: 'grid', placeItems: 'center' }}>
           <Icon name="sparkles" size={20} color="var(--accent)" style={{ opacity: 0.3 }} />
        </div>
      )}

      {/* État READY : Affichage des tâches */}
      {sectionStatus === 'ready' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, animation: 'fadeIn 0.4s' }}>
          {/* Message snippet */}
          <div style={{ fontSize: 11, color: 'var(--fg-2)', background: 'var(--bg-1)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-1)', fontStyle: 'italic' }}>
            "{firstMsg.body.length > 120 ? firstMsg.body.slice(0, 120) + '...' : firstMsg.body}"
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>
            {allTasks.length} action{allTasks.length > 1 ? 's' : ''} détectée{allTasks.length > 1 ? 's' : ''}
          </div>

          {allTasks.map((et, i) => {
            const isSeen = seenTasks.has(et.id);
            const isValidated = validated.has(et.id);
            return (
              <div key={et.id} style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                padding: '10px', borderRadius: 10,
                background: isValidated ? 'var(--ok-soft)' : 'var(--bg-1)',
                border: `1px solid ${isValidated ? 'var(--ok)' : 'var(--border-1)'}`,
                animation: `taskReveal 0.35s ${i * 80}ms both`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--fg-0)', lineHeight: 1.4, textDecoration: isValidated ? 'line-through' : 'none' }}>
                    {isSeen || isValidated ? et.title : "Tâche masquée"}
                  </div>
                  {!isValidated && (
                    <button 
                      onClick={() => setSeenTasks(prev => new Set(prev).add(et.id))}
                      style={{ 
                        display: isSeen ? 'none' : 'flex',
                        padding: '4px 8px', borderRadius: 6, background: 'var(--accent)', color: '#fff', 
                        fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer' 
                      }}>
                      Voir
                    </button>
                  )}
                </div>

                {(isSeen && !isValidated) && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 2, animation: 'fadeIn 0.2s' }}>
                    <button 
                      onClick={() => validateOne(et)}
                      style={{ flex: 1, padding: '6px 0', borderRadius: 6, background: 'var(--ok)', color: '#fff', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                      Valider
                    </button>
                    <button style={{ flex: 1, padding: '6px 0', borderRadius: 6, background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--fg-3)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Écarter
                    </button>
                  </div>
                )}
                {isValidated && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ok)', fontWeight: 600 }}>
                    <Icon name="check" size={12} color="var(--ok)" /> Ajoutée au Kanban
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MessageTasksSection({ messages, onAddTask }) {
  const [status, setStatus] = React.useState('idle'); // idle | loading | ready
  const [loadPct, setLoadPct] = React.useState(0);
  const [phraseIdx, setPhraseIdx] = React.useState(0);
  const [collapsed, setCollapsed] = React.useState(false);

  const msgsWithTasks = (messages || []).filter(m => m.extractedTasks && m.extractedTasks.length > 0);
  
  const groups = {};
  msgsWithTasks.forEach(m => {
    if (!groups[m.clientId]) groups[m.clientId] = [];
    groups[m.clientId].push(m);
  });
  const clientIds = Object.keys(groups);

  const startAnalysis = () => {
    setStatus('loading');
    setLoadPct(0);
    setPhraseIdx(0);
    const steps = [15, 35, 60, 80, 95, 100];
    const delays = [100, 350, 600, 950, 1250, 1600];
    steps.forEach((pct, i) => setTimeout(() => setLoadPct(pct), delays[i]));
    [1, 2, 3].forEach(i => setTimeout(() => setPhraseIdx(i), i * 450));
    setTimeout(() => setStatus('ready'), 1750);
  };

  return (
    <div style={{ flex: 'none', background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-1)', background: 'var(--bg-0)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center' }}>
          <Icon name="sparkles" size={16} color="var(--accent)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 750, color: 'var(--fg-0)' }}>Extraction intelligente</div>
          <div style={{ fontSize: 11, color: 'var(--fg-2)' }}>{clientIds.length} contact{clientIds.length > 1 ? 's' : ''} à analyser</div>
        </div>
        
        {status === 'idle' ? (
          <button onClick={startAnalysis} style={{ 
            padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', 
            fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            Analyser les messages
          </button>
        ) : status === 'loading' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{AI_PHRASES[phraseIdx]}</div>
            <div style={{ width: 100, height: 6, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${loadPct}%`, background: 'var(--accent)', transition: 'width 0.4s' }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ok)', fontSize: 12, fontWeight: 700 }}>
            <Icon name="check" size={14} color="var(--ok)" /> Analyse terminée
          </div>
        )}
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', gap: 12, padding: '16px', overflowX: 'auto', background: 'var(--bg-1)' }}>
          {clientIds.map(cid => (
            <ClientMessagesCard key={cid} clientMessages={groups[cid]} onAddTask={onAddTask} sectionStatus={status} />
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
function TodayView({ tasks, nudges, brief, onComplete, onValidateTask, messages, onConnectChannel, anyChannelConnected }) {
  const focus = brief?.focus || tasks || [];

  const initialCols = {
    todo: [],
    doing: [],
    review: [],
    done: [],
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

  const [taskPrompt, setTaskPrompt] = React.useState({ open: false, colKey: null });

  // Ajout manuel d'une tâche dans une colonne
  const handleAddBlank = (colKey) => {
    setTaskPrompt({ open: true, colKey });
  };

  const handleConfirmTask = (title) => {
    const colKey = taskPrompt.colKey;
    setTaskPrompt({ open: false, colKey: null });
    if (!title || typeof title !== 'string') return;
    const id = 'blank_' + Date.now();
    const newTask = { id, title: title.trim(), client: 'Perso', clientColor: '#6B7280', est: '', billable: false };
    setColItems(prev => ({ ...prev, [colKey]: [...prev[colKey], newTask] }));
  };

  const colDefs = [
    { key: 'todo',   title: 'À faire',          icon: 'check', color: 'var(--fg-2)' },
    { key: 'doing',  title: 'En cours',          icon: 'clock', color: 'var(--accent)' },
    { key: 'review', title: 'En attente client', icon: 'chat',  color: 'var(--warn)' },
    { key: 'done',   title: 'Terminé (7j)',      icon: 'check', color: 'var(--ok)' },
  ];

  const msgsToShow = (messages || []).filter(m => m.extractedTasks && m.extractedTasks.length > 0);

  const hasTasks = colItems.todo.length > 0 || colItems.doing.length > 0 || colItems.review.length > 0 || colItems.done.length > 0;

  return (
    <div style={{ padding: '8px 32px 32px', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Main Left Content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Messages → Tâches */}
          {msgsToShow.length > 0 ? (
            <MessageTasksSection messages={msgsToShow} onAddTask={handleAddFromMessage} />
          ) : (
            <div style={{ flex: 'none', background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                <Icon name="sparkles" size={20} color="var(--accent)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-0)', marginBottom: 2 }}>Extraction IA en attente</div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.4 }}>Connecte ton compte Gmail ou ajoute des contacts. L'IA scannera tes messages et te proposera automatiquement des tâches à valider.</div>
              </div>
              <button onClick={onConnectChannel} style={{ flex: 'none', padding: '9px 16px', borderRadius: 8, background: 'var(--fg-0)', color: 'var(--bg-1)', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'transform 100ms' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                Connecter à un outil
              </button>
            </div>
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
                    background: isOver ? 'var(--accent-soft)' : 'rgba(234, 88, 12, 0.08)',
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
                    <button
                      onClick={() => handleAddBlank(col.key)}
                      style={{
                        marginTop: 2, padding: '9px 10px', borderRadius: 10,
                        background: 'transparent', border: '1px dashed var(--border-2)',
                        color: 'var(--fg-3)', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        fontFamily: 'inherit', transition: 'border-color 120ms, color 120ms'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--fg-3)'; }}>
                      <Icon name="plus" size={12} /> Nouvelle tâche
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar: Copilot Feature */}
        {anyChannelConnected && hasTasks && (
          <div style={{ width: 260, flex: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 14, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ background: 'var(--accent-soft)', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="sparkles" size={14} color="var(--accent)" />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-0)' }}>Copilote IA</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                Le copilote scanne en permanence tes échanges et t'aide à prioriser.
              </div>
              <div style={{ padding: '12px', borderRadius: 10, background: 'var(--bg-0)', display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid var(--border-1)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)', marginTop: 5, flex: 'none' }} />
                  <div style={{ fontSize: 11.5, color: 'var(--fg-1)', lineHeight: 1.4 }}>Projet <strong style={{ color: 'var(--fg-0)' }}>Capucine</strong> prêt à être facturé (2h).</div>
                </div>
                <div style={{ height: 1, background: 'var(--border-1)' }} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warn)', marginTop: 5, flex: 'none' }} />
                  <div style={{ fontSize: 11.5, color: 'var(--fg-1)', lineHeight: 1.4 }}>Aucune date définie pour <strong style={{ color: 'var(--fg-0)' }}>Victor</strong>.</div>
                </div>
              </div>
              <button style={{ padding: '8px 0', borderRadius: 8, background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--fg-2)', fontSize: 11.5, fontWeight: 600, cursor: 'not-allowed', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name="message-square" size={12} /> Discuter avec le Copilote (bientôt)
              </button>
            </div>
          </div>
        )}


      </div>

      {/* Notification progression projet */}
      {notification && <ProjectNotification notif={notification} onClose={() => setNotification(null)} />}

      <window.ActionModal 
        isOpen={taskPrompt?.open} 
        type="prompt" 
        title="Nouvelle tâche" 
        placeholder="Titre de la tâche..." 
        confirmText="Ajouter" 
        onConfirm={handleConfirmTask} 
        onCancel={() => setTaskPrompt({ open: false, colKey: null })} 
      />

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
