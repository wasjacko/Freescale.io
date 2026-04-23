// Freescale — App shell + state wiring
const shellStyles = {
  app: { display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', background: 'var(--bg-1)' },
  main: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' },
  content: { flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 24 }
};

const TITLES = {
  today: { t: "Hello, Wacil!", s: "4 connected channels · 17 contacts · See Insights" },
  inbox: { t: 'Inbox', s: 'Manage your communications' },
  tasks: { t: 'Tâches', s: 'Planning auto-généré depuis tes messages' },
  clients: { t: 'Clients', s: 'Vue d\'ensemble' },
  analytics: { t: 'Analytics', s: 'Performance' }
};

function FreescaleApp() {
  const [theme, setTheme] = React.useState(() => {
    try { return localStorage.getItem('freescale.theme') || 'light'; } catch { return 'light'; }
  });
  const [view, setView] = React.useState('today');
  const [activeClient, setActiveClient] = React.useState('acme');
  const [activeMessage, setActiveMessage] = React.useState('m1');
  const [activeSources, setActiveSources] = React.useState(['gmail', 'whatsapp', 'instagram']);
  const data = window.FreescaleData;
  const [clients, setClients] = React.useState(data.clients || []);
  const [messages, setMessages] = React.useState(data.messages || []);
  const [tasks, setTasks] = React.useState(data.todayBrief?.focus || []);
  const [nudges, setNudges] = React.useState(data.todayBrief?.nudges || []);
  
  const unreadCount = messages.filter(m => m.unread).length;
  const [acceptedTasks, setAcceptedTasks] = React.useState([]);
  const [toast, setToast] = React.useState(null);
  const [gmailConnected, setGmailConnected] = React.useState(false);
  const [whatsappConnected, setWhatsappConnected] = React.useState(false);
  const [instagramConnected, setInstagramConnected] = React.useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // ─── Gmail: detect OAuth callback & load emails ───────
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_connected') === 'true') {
      showToast('✅ Gmail connecté avec succès !');
      window.history.replaceState({}, '', window.location.pathname);
      loadGmailMessages();
    } else if (params.get('gmail_error')) {
      showToast('❌ Erreur de connexion Gmail : ' + params.get('gmail_error'));
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      // Check on startup if already connected
      loadGmailMessages();
    }
  }, []);

  async function loadGmailMessages() {
    if (!window.FreescaleGmail) return;
    const status = await FreescaleGmail.getStatus();
    setGmailConnected(status.connected);
    if (!status.connected) return;

    const result = await FreescaleGmail.getMessages(15);
    if (result.error) return;

    const gmailMsgs = result.messages.map((m, i) => FreescaleGmail.toFreescaleMessage(m, i));
    // Merge: put Gmail messages first, then keep existing non-gmail messages
    setMessages(prev => {
      const nonGmail = prev.filter(m => !m.id.startsWith('gmail_'));
      return [...gmailMsgs, ...nonGmail];
    });
    showToast(`📧 ${gmailMsgs.length} emails Gmail chargés`);
  }

  function handleGmailStatusChange(connected) {
    setGmailConnected(connected);
    if (!connected) {
      setMessages(prev => prev.filter(m => !m.id.startsWith('gmail_')));
      showToast('Gmail déconnecté');
    } else {
      loadGmailMessages();
    }
  }

  const handleChannelConnect = (id) => {
    if (id === 'gmail') {
      FreescaleGmail.connect();
      setConnectorOpen(false);
    } else if (id === 'whatsapp' || id === 'instagram') {
       // Start connection process
       showToast(`Initialisation de ${id}...`);
       setConnectorOpen(false);
       
       // Simulate a scan delay
       setTimeout(() => {
          if (id === 'whatsapp') setWhatsappConnected(true);
          if (id === 'instagram') setInstagramConnected(true);
          showToast(`${id.charAt(0).toUpperCase() + id.slice(1)} connecté avec succès !`);
       }, 2500);
    }
  };

  const handleGenerateTasks = () => {
    const generated = [
      { id: 'gen1', title: 'Répondre à Orion Robotics sur Whatsapp', client: 'Orion Robotics', clientColor: '#0EA5E9', due: "Aujourd'hui, 14:00", source: 'whatsapp', from: 'Paul T.', est: '10 min', priority: 'high' },
      { id: 'gen2', title: 'Envoyer moodboard préliminaire', client: 'Lumen Studio', clientColor: '#F97316', due: "Demain, 10:00", source: 'discord', from: 'Marc L.', est: '45 min', priority: 'med' }
    ];
    setTasks(prev => [...generated, ...prev]);
    setMessages(prev => prev.map(m => ({ ...m, unread: false })));
    showToast('Tâches générées et messages marqués lus');
  };

  const handleCompleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    showToast('Tâche terminée !');
  };

  const handleDismissNudge = (id) => {
    setNudges(prev => prev.filter(n => n.id !== id));
    showToast('Alerte traitée');
  };

  const handleAddClient = () => {
    const name = window.prompt('Nom du nouveau contact');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `c${Date.now()}`;
    const initials = trimmed.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const palette = ['#5B5BF0','#F59E0B','#16A349','#E11D48','#0EA5E9','#7C3AED','#DB2777','#059669'];
    const color = palette[clients.length % palette.length];
    const seed = Math.floor(Math.random() * 90);
    const gender = Math.random() > 0.5 ? 'women' : 'men';
    setClients(prev => [{ id, name: trimmed, color, avatar: initials, avatarUrl: `https://randomuser.me/api/portraits/${gender}/${seed}.jpg`, tags: ['Nouveau'], rate: 0, active: true, lastActivity: "à l'instant", unread: 0, value: 0, status: 'ongoing' }, ...prev]);
    showToast(`${trimmed} ajouté aux contacts`);
  };

  const handleSourceToggle = (id) => {
    setActiveSources(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('freescale.theme', theme); } catch {}
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

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');


  let titleBar = TITLES[view];
  if (view === 'inbox') {
    titleBar = { t: 'Inbox unifiée', s: `7 sources connectées · ${unreadCount} non lus` };
  }

  const renderView = () => {
    switch (view) {
      case 'today':     return <TodayView tasks={tasks} nudges={nudges} unreadCount={unreadCount} sources={data.sources} onGenerate={handleGenerateTasks} onComplete={handleCompleteTask} onDismissNudge={handleDismissNudge} messages={messages} brief={data.todayBrief} />;
      case 'inbox':     return <InboxView messages={messages} clients={clients} sources={data.sources}
                                  activeClientId={activeClient}
                                  acceptedTasks={acceptedTasks} onAcceptTask={(id) => { setAcceptedTasks(prev => [...prev, id]); showToast('Tâche ajoutée au planning'); }} onDismissTask={(id) => setAcceptedTasks(prev => [...prev, id + '_dismissed'])} />;
      case 'tasks':     return <TasksView brief={data.todayBrief} acceptedTasks={acceptedTasks} />;
      case 'clients':   return <ClientsView clients={data.clients} />;
      case 'analytics': return <AnalyticsView kpis={data.kpis} />;
      default: return null;
    }
  };

  const [copilotOpen, setCopilotOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [connectorOpen, setConnectorOpen] = React.useState(false);

  return (
    <div style={shellStyles.app}>
      <Sidebar
        active={view} onNav={setView}
        activeClient={activeClient} onClientSelect={(id) => { setActiveClient(id); setView('inbox'); }}
        clients={clients} messages={messages} sources={data.sources}
        gmailConnected={gmailConnected}
        whatsappConnected={whatsappConnected}
        instagramConnected={instagramConnected}
        onOpenSettings={() => setSettingsOpen(true)}
        onAddClient={handleAddClient}
        onConnectChannel={() => setConnectorOpen(true)}
        onOpenHelp={() => showToast('Help Center — bientôt disponible')}
      />
      <div style={shellStyles.main}>
        <TopBar title={titleBar.t} subtitle={titleBar.s} active={view} onNav={setView} unreadCount={unreadCount} />
        <div style={shellStyles.content}>
          {renderView()}
        </div>
      </div>

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
          </div>
        </div>
      )}
      
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} onGmailStatusChange={handleGmailStatusChange} />
      <ChannelConnectorModal isOpen={connectorOpen} onClose={() => setConnectorOpen(false)} onConnect={handleChannelConnect} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<FreescaleApp />);
