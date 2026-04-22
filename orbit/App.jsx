// Orbit — App shell + state wiring
const shellStyles = {
  app: { display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', background: 'var(--bg-0)' },
  main: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' },
  content: { flex: 1, overflow: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }
};

const TITLES = {
  today: { t: "Aujourd'hui", s: 'Ton brief matinal, priorisé par le copilote' },
  inbox: { t: 'Inbox unifiée', s: '7 sources connectées · 7 non lus' },
  tasks: { t: 'Tâches', s: 'Planning auto-généré depuis tes messages' },
  clients: { t: 'Clients', s: 'Vue d\'ensemble · 5 actifs, 2 en négociation' },
  analytics: { t: 'Analytics', s: 'Performance des 14 derniers jours' }
};

function OrbitApp() {
  const [theme, setTheme] = React.useState(() => {
    try { return localStorage.getItem('orbit.theme') || 'light'; } catch { return 'light'; }
  });
  const [view, setView] = React.useState('today');
  const [activeClient, setActiveClient] = React.useState(null);
  const [activeMessage, setActiveMessage] = React.useState('m1');
  const [activeSources, setActiveSources] = React.useState(['gmail', 'outlook', 'slack', 'discord', 'whatsapp', 'telegram', 'instagram']);
  const [acceptedTasks, setAcceptedTasks] = React.useState([]);
  const [copilotOpen, setCopilotOpen] = React.useState(true);
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('orbit.theme', theme); } catch {}
  }, [theme]);

  // Edit mode (tweaks) integration
  React.useEffect(() => {
    const handler = (e) => {
      const t = e.data?.type;
      if (t === '__activate_edit_mode') setTweaksOpen(true);
      if (t === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent?.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);

  const data = window.OrbitData;

  const handleAcceptTask = (taskId) => {
    setAcceptedTasks(prev => [...prev, taskId]);
    setToast('Tâche ajoutée au planning');
    setTimeout(() => setToast(null), 2200);
  };
  const handleDismissTask = (taskId) => {
    setAcceptedTasks(prev => [...prev, taskId + '_dismissed']);
  };
  const handleSourceToggle = (id) => {
    setActiveSources(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const copilotSuggestions = [
    { icon: 'sparkles', title: "Sarah (Acme) t'a demandé la facture d'avril dans Slack.", meta: 'Générer + envoyer — 10 sec', cmd: 'invoice_acme' },
    { icon: 'chat',     title: 'Emma Rodriguez silencieuse depuis 4 jours.', meta: 'Rédiger une relance douce', cmd: 'follow_up_emma' },
    { icon: 'briefcase', title: 'Proposition Pelican Labs à envoyer mercredi.', meta: 'Ouvrir le brouillon — 70% prêt', cmd: 'draft_pelican' },
    { icon: 'clock',    title: 'Tu as 5h30 de travail facturable aujourd\'hui.', meta: 'Planifier en 2 blocs focus', cmd: 'plan_day' },
  ];

  let titleBar = TITLES[view];
  if (view === 'inbox') {
    const unread = data.messages.filter(m => m.unread).length;
    titleBar = { t: 'Inbox unifiée', s: `7 sources connectées · ${unread} non lus` };
  }

  const renderView = () => {
    switch (view) {
      case 'today':     return <TodayView brief={data.todayBrief} kpis={data.kpis} sources={data.sources} onOpenTaskExtractor={() => setView('inbox')} />;
      case 'inbox':     return <InboxView messages={data.messages} clients={data.clients} sources={data.sources}
                                  activeMessageId={activeMessage} onSelectMessage={setActiveMessage}
                                  acceptedTasks={acceptedTasks} onAcceptTask={handleAcceptTask} onDismissTask={handleDismissTask} />;
      case 'tasks':     return <TasksView brief={data.todayBrief} acceptedTasks={acceptedTasks} />;
      case 'clients':   return <ClientsView clients={data.clients} />;
      case 'analytics': return <AnalyticsView kpis={data.kpis} />;
      default: return null;
    }
  };

  return (
    <div style={shellStyles.app}>
      <Sidebar
        active={view} onNav={setView}
        activeClient={activeClient} onClientSelect={(id) => { setActiveClient(id); setView('inbox'); }}
        sources={data.sources} activeSources={activeSources} onSourceToggle={handleSourceToggle}
        clients={data.clients}
        theme={theme} onTheme={toggleTheme}
        onOpenSettings={() => setToast('Réglages à venir dans cette maquette')}
      />
      <div style={shellStyles.main}>
        <TopBar title={titleBar.t} subtitle={titleBar.s} onOpenCopilot={() => setCopilotOpen(v => !v)} copilotOpen={copilotOpen} />
        <div style={shellStyles.content}>
          {renderView()}
        </div>
      </div>
      {copilotOpen && <CopilotPanel onClose={() => setCopilotOpen(false)} suggestions={copilotSuggestions} onCommand={(c) => { setToast('Commande exécutée : ' + c); setTimeout(() => setToast(null), 2000); }} />}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--fg-0)', color: 'var(--bg-1)', padding: '10px 16px', borderRadius: 10,
          fontSize: 13, fontWeight: 500, boxShadow: 'var(--shadow-lg)', zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <Icon name="check" size={13} color="var(--ok)" /> {toast}
        </div>
      )}

      {tweaksOpen && (
        <div style={{
          position: 'fixed', right: 20, bottom: 20, width: 240, background: 'var(--bg-1)',
          border: '1px solid var(--border-2)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden'
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-1)', fontWeight: 600, fontSize: 13, color: 'var(--fg-0)' }}>Tweaks</div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-1)' }}>
              <span>Thème</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setTheme('light')} style={{ padding: '4px 10px', borderRadius: 6, background: theme === 'light' ? 'var(--accent-soft)' : 'var(--bg-2)', color: theme === 'light' ? 'var(--accent-ink)' : 'var(--fg-2)', fontSize: 12, fontWeight: 600 }}>Light</button>
                <button onClick={() => setTheme('dark')} style={{ padding: '4px 10px', borderRadius: 6, background: theme === 'dark' ? 'var(--accent-soft)' : 'var(--bg-2)', color: theme === 'dark' ? 'var(--accent-ink)' : 'var(--fg-2)', fontSize: 12, fontWeight: 600 }}>Dark</button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-1)' }}>
              <span>Copilot visible</span>
              <button onClick={() => setCopilotOpen(v => !v)} style={{ width: 36, height: 20, borderRadius: 999, background: copilotOpen ? 'var(--accent)' : 'var(--border-3)', position: 'relative' }}>
                <span style={{ position: 'absolute', top: 2, [copilotOpen ? 'right' : 'left']: 2, width: 16, height: 16, borderRadius: 999, background: '#fff' }}></span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<OrbitApp />);
