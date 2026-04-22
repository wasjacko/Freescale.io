const todayStyles = {
  wrap: { padding: '8px 32px 32px', display: 'flex', flexDirection: 'column', gap: 24, height: '100%', overflow: 'hidden' },
  
  // Next Best Moves (Minimalist Stack)
  movesStack: { display: 'flex', flexDirection: 'column', gap: 1, background: '#ECECEF', borderRadius: 16, overflow: 'hidden', border: '1px solid #ECECEF', marginBottom: 8 },
  moveRow: { 
    padding: '12px 20px', background: '#fff', 
    display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'all 0.2s'
  },
  moveIcon: { width: 32, height: 32, borderRadius: 8, background: '#F9FAFB', display: 'grid', placeItems: 'center', flex: 'none' },
  moveContent: { flex: 1, display: 'flex', alignItems: 'center', gap: 20 },
  moveLabel: { fontSize: 10, fontWeight: 800, color: '#999', textTransform: 'uppercase', width: 100, flex: 'none' },
  moveInfo: { flex: 1, minWidth: 0 },
  moveTitle: { fontSize: 14, fontWeight: 700, color: '#111' },
  moveImpact: { fontSize: 12, color: '#AAA', display: 'flex', alignItems: 'center', gap: 6 },
  moveScore: { fontSize: 11, fontWeight: 700, color: '#111', background: '#F3F4F6', padding: '2px 8px', borderRadius: 6 },
  moveActionTip: { fontSize: 11, fontWeight: 700, color: 'var(--accent)', opacity: 0, transition: 'all 0.2s' },

  // Kanban Card Container (The Workspace)
  kanbanCard: {
    background: '#FFFFFF', borderRadius: 24, padding: '32px', 
    border: '1px solid #ECECEF', display: 'flex', flexDirection: 'column', gap: 24,
    flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.02)'
  },
  kanbanHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 40 },
  kanbanInfo: { flex: 1 },
  kanbanTitle: { fontSize: 18, fontWeight: 800, color: '#111', marginBottom: 4 },
  kanbanSub: { fontSize: 13, color: '#999', lineHeight: 1.5 },

  // Scan Banner
  scanBanner: {
    background: '#F9FAFB', borderRadius: 12, padding: '12px 16px',
    display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12,
    border: '1px solid #EEE'
  },
  scanProgress: { flex: 1, height: 4, background: '#EEE', borderRadius: 2, overflow: 'hidden' },
  scanBar: { height: '100%', background: '#111' },

  // Kanban Board
  boardWrap: { flex: 1, display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 20 },
  projectCol: {
    width: 280, flex: 'none', background: 'transparent', 
    display: 'flex', flexDirection: 'column', gap: 16
  },
  colHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' },
  colTitle: { fontSize: 13, fontWeight: 700, color: '#111', display: 'flex', alignItems: 'center', gap: 8 },
  colCount: { fontSize: 11, fontWeight: 700, color: '#999', background: '#F0F0F0', padding: '2px 8px', borderRadius: 6 },

  // Task Cards
  taskCard: {
    background: '#FFF', borderRadius: 16, padding: 16, border: '1px solid #ECECEF',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: 12,
    cursor: 'pointer', transition: 'all 0.2s ease'
  },
  taskTitle: { fontSize: 13, fontWeight: 600, color: '#222', lineHeight: 1.4 },
  taskMeta: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#999' },
  sourceIcon: { width: 18, height: 18, borderRadius: 4, display: 'grid', placeItems: 'center' },
  prio: { padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }
};

function PriorityBadge({ priority }) {
  const map = {
    high: { bg: 'var(--danger-soft)', fg: 'var(--danger)', label: 'Urgent' },
    med:  { bg: 'var(--warn-soft)',   fg: 'var(--warn)',   label: 'Moyen' },
    low:  { bg: 'var(--bg-2)',        fg: 'var(--fg-2)',   label: 'Low' },
  };
  const m = map[priority] || map.low;
  return <span style={{ ...todayStyles.prio, background: m.bg, color: m.fg }}>{m.label}</span>;
}

function TodayView({ tasks, onComplete }) {
  const [scanning, setScanning] = React.useState(false);
  const [scanStep, setScanStep] = React.useState(0);

  const steps = [
    "Connexion aux canaux sécurisée...",
    "Analyse de 42 nouveaux messages...",
    "Extraction des tâches prioritaires...",
    "Mise à jour de l'Espace de travail..."
  ];

  const srcMap = {
    slack: { glyph: 'message-circle', color: '#4A154B', soft: '#F3E8F3' },
    gmail: { glyph: 'mail', color: '#D93025', soft: '#FCE8E6' },
    notion: { glyph: 'file-text', color: '#000000', soft: '#F3F3F3' }
  };

  const handleScan = () => {
    setScanning(true);
    setScanStep(0);
    const interval = setInterval(() => {
      setScanStep(s => {
        if (s >= steps.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            setScanning(false);
            if (onGenerate) onGenerate();
          }, 1000);
          return s;
        }
        return s + 1;
      });
    }, 1000);
  };

  // Group tasks by project (client)
  const projects = {};
  tasks.forEach(t => {
     if (!projects[t.client]) projects[t.client] = [];
     projects[t.client].push(t);
  });

  return (
    <div style={{ ...todayStyles.wrap, overflowY: 'auto', height: '100%' }}>

      {/* Next Best Moves (Minimalist Stack) */}
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
           <Icon name="sparkles" size={12} color="var(--accent)" /> Smart Actions (Priorité IA)
        </div>
        <div style={todayStyles.movesStack}>
          {[
            { id: 'm1', icon: 'mail', label: 'Communication', title: 'Répondre à Lucas', color: 'var(--accent)', action: 'Répondre', reason: 'Délai < 2h', score: '98%', impact: 'Client VIP' },
            { id: 'm2', icon: 'file-text', label: 'Finance', title: 'Facturer Freescale v2', color: '#10B981', action: 'Facturer', reason: 'J+1 Livraison', score: '92%', impact: 'Cashflow' },
            { id: 'm3', icon: 'message-circle', label: 'Réseau', title: 'Relancer #design', color: '#8B5CF6', action: 'Envoyer', reason: 'Inactif 3j', score: '85%', impact: 'Visibilité' }
          ].map((m, i) => (
            <div key={i} style={todayStyles.moveRow} onMouseEnter={e => {
                e.currentTarget.style.background = '#F9FAFB';
                e.currentTarget.querySelector('.action-tip').style.opacity = 1;
            }} onMouseLeave={e => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.querySelector('.action-tip').style.opacity = 0;
            }}>
              <div style={todayStyles.moveIcon}><Icon name={m.icon} size={16} color={m.color} /></div>
              <div style={todayStyles.moveContent}>
                <div style={todayStyles.moveLabel}>{m.label}</div>
                <div style={todayStyles.moveInfo}>
                   <div style={todayStyles.moveTitle}>{m.title}</div>
                   <div style={todayStyles.moveImpact}>
                      <span style={{ fontWeight: 600, color: '#666' }}>{m.reason}</span>
                      <span style={{ opacity: 0.5 }}>•</span>
                      <span>{m.impact}</span>
                   </div>
                </div>
                <div style={todayStyles.moveScore}>{m.score}</div>
                <div className="action-tip" style={todayStyles.moveActionTip}>{m.action} →</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Subtle Visual Link */}
        <div style={{ position: 'absolute', bottom: -16, left: 32, width: 2, height: 16, borderLeft: '1px solid #ECECEF' }}></div>
      </div>

      {/* Focused Workstation Card */}
      <div style={todayStyles.kanbanCard}>
        
        <div style={todayStyles.kanbanHeader}>
           <div style={todayStyles.kanbanInfo}>
              <div style={todayStyles.kanbanTitle}>Espace de travail</div>
              <div style={todayStyles.kanbanSub}>
                 Dernière analyse effectuée il y a 5 min.
              </div>
           </div>
           <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
             <button 
               onClick={handleScan} 
               disabled={scanning}
               style={{ 
                 padding: '10px 20px', borderRadius: 12, background: '#111', color: '#fff', 
                 fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, 
                 cursor: 'pointer', border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                 transition: 'all 0.2s'
               }}
               onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
               onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
             >
               <Icon name="sparkles" size={14} />
               {scanning ? 'Analyse IA...' : 'Scanner les messages'}
             </button>
             <button style={{ padding: '10px 14px', borderRadius: 12, background: '#F3F4F6', border: 'none', cursor: 'pointer' }}>
               <Icon name="plus" size={14} color="#111" />
             </button>
           </div>
        </div>

        {/* Scan Banner (In-line) */}
        {scanning && (
          <div style={todayStyles.scanBanner}>
             <Icon name="sparkles" size={16} color="var(--accent)" />
             <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', flex: 1 }}>
                {steps[scanStep]}
             </div>
             <div style={todayStyles.scanProgress}>
                <div style={{ ...todayStyles.scanBar, width: `${(scanStep + 1) * 25}%` }} />
             </div>
             <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', marginLeft: 12 }}>
                {(scanStep + 1) * 25}%
             </div>
          </div>
        )}

        {/* Kanban Board */}
        <div style={{ ...todayStyles.boardWrap, overflowX: 'auto', paddingBottom: 32 }}>
          {Object.entries(projects).map(([name, pTasks], index) => {
            const progress = name === 'Lucas' ? 75 : (name === 'Orion' ? 40 : (name === 'Acme Corp' ? 90 : 15));
            const clientColor = pTasks[0]?.clientColor || '#666';
            
            return (
              <div key={name} style={{ 
                ...todayStyles.projectCol, 
                background: `${clientColor}08`, 
                padding: '20px', 
                borderRadius: 20, 
                border: '1px solid #ECECEF',
                borderLeft: index > 0 ? '1px solid #EEE' : '1px solid #ECECEF'
              }}>
                <div style={{ ...todayStyles.colHead, flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={todayStyles.colTitle}>
                        <div style={{ width: 24, height: 24, background: clientColor, borderRadius: 6, display: 'grid', placeItems: 'center' }}>
                            <Icon name="briefcase" size={12} color="#FFF" />
                        </div>
                        {name}
                      </div>
                      <div style={todayStyles.colCount}>{pTasks.length}</div>
                    </div>
                    {/* Progress Bar for the Project */}
                    <div style={{ height: 4, background: '#DDD', borderRadius: 2, position: 'relative' }}>
                       <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: clientColor, borderRadius: 2 }} />
                    </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: '500px' }}>
                {pTasks.map(t => {
                    const s = srcMap[t.source];
                    return (
                      <div key={t.id} className="task-card" style={todayStyles.taskCard} onMouseEnter={e => {
                          e.currentTarget.style.borderColor = clientColor;
                          e.currentTarget.style.boxShadow = `0 4px 12px ${clientColor}15`;
                          e.currentTarget.querySelector('.task-actions').style.opacity = 1;
                      }} onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#ECECEF';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
                          e.currentTarget.querySelector('.task-actions').style.opacity = 0;
                      }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={todayStyles.taskTitle}>{t.title}</div>
                          </div>
                          
                          <div className="task-actions" style={{ display: 'flex', gap: 6, opacity: 0, transition: 'all 0.2s', marginTop: -4 }}>
                             <button onClick={(e) => { e.stopPropagation(); onComplete(t.id); }} style={{ padding: '6px 12px', background: '#111', color: '#FFF', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>Complété</button>
                             <button style={{ padding: '6px 12px', background: '#F3F4F6', color: '#111', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>Répondre</button>
                          </div>

                          <div style={todayStyles.taskMeta}>
                            <div style={{ ...todayStyles.sourceIcon, background: s?.soft || '#EEE', color: s?.color || '#999' }}>
                                <Icon name={s?.glyph || 'message-square'} size={10} />
                            </div>
                            <span>{t.due}</span>
                            <div style={{ marginLeft: 'auto' }}>
                              <PriorityBadge priority={t.priority} />
                            </div>
                          </div>
                      </div>
                    );
                })}
              </div>
            </div>
            );
          })}
          
          {/* Nouveau Projet */}
          <div style={{ ...todayStyles.projectCol, minWidth: 240, background: 'transparent', border: '2px dashed #E5E7EB', opacity: 0.5, justifyContent: 'center', alignItems: 'center', cursor: 'pointer', borderRadius: 20 }}>
             <Icon name="plus" size={24} color="#999" />
             <div style={{ fontSize: 13, marginTop: 8, fontWeight: 600, color: '#999' }}>Nouveau projet</div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.TodayView = TodayView;
window.PriorityBadge = PriorityBadge;
