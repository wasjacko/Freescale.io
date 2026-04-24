// Freescale — App shell + state wiring
const shellStyles = {
  app: { display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', background: 'var(--bg-1)' },
  main: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' },
  content: { flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 24 }
};

function ActionModal({ isOpen, type, title, message, placeholder, confirmText, cancelText, onConfirm, onCancel }) {
  if (!isOpen) return null;
  const [val, setVal] = React.useState('');
  React.useEffect(() => { if (isOpen) setVal(''); }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (type === 'prompt' && !val.trim()) return;
    onConfirm(type === 'prompt' ? val.trim() : true);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <form onSubmit={handleSubmit} style={{ background: 'var(--bg-1)', borderRadius: 16, width: 340, padding: 20, boxShadow: 'var(--shadow-xl)', animation: 'popIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-0)', marginBottom: 8 }}>{title}</div>
        {message && <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 16, lineHeight: 1.4 }}>{message}</div>}
        {type === 'prompt' && (
          <input
            autoFocus
            type="text"
            placeholder={placeholder}
            value={val}
            onChange={e => setVal(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--bg-0)', color: 'var(--fg-0)', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
          />
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: type === 'prompt' ? 0 : 16 }}>
          <button type="button" onClick={onCancel} style={{ padding: '8px 14px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--fg-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {cancelText || 'Annuler'}
          </button>
          <button type="submit" style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {confirmText || 'Confirmer'}
          </button>
        </div>
      </form>
    </div>
  );
}
window.ActionModal = ActionModal;

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
  const [activeClient, setActiveClient] = React.useState(null);
  const [activeMessage, setActiveMessage] = React.useState(null);
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

  // Conversation cache (full threads per client), + current user's Gmail address
  const [conversations, setConversations] = React.useState({}); // { [clientId]: [msg, ...] }
  const [conversationsLoading, setConversationsLoading] = React.useState({}); // { [clientId]: bool }
  const [myGmail, setMyGmail] = React.useState('');

  // ── Contact scan modal (shown right after Gmail connect) ─
  // phase: null | 'scanning' | 'review' | 'empty' | 'error'
  const [scanPhase, setScanPhase]   = React.useState(null);
  const [scanSenders, setScanSenders] = React.useState([]); // for animation
  const [scanResults, setScanResults] = React.useState([]); // AI results
  const pendingMessagesRef = React.useRef([]); // raw gmail msgs held until user validates

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // ─── Gmail: detect OAuth callback & auto-trigger scan ───────
  // The scan modal must open whenever:
  //   1. We just returned from OAuth (?gmail_connected=true in URL)
  //   2. OR backend is already connected (token still valid) and UI is empty — catches cache-stripped redirects
  React.useEffect(() => {
    console.log('[Freescale] boot useEffect (Simulated)');
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_connected') === 'true') {
      showToast('✅ Connexion réussie !');
      window.history.replaceState({}, '', window.location.pathname);
      setGmailConnected(true);
      loadGmailMessages();
    }
  }, []);

  async function handleConnectGmail() {
    setConnectorOpen(false);
    showToast('🚀 Connexion à Gmail...');
    setTimeout(() => {
      setGmailConnected(true);
      loadGmailMessages();
    }, 1200);
  }

  async function loadGmailMessages() {
    console.log('[Freescale] loadGmailMessages() SIMULATED');
    setScanPhase('scanning');
    setScanSenders([]);
    setScanResults([]);

    await new Promise(r => setTimeout(r, 1000));

    const mockSenders = [
      { name: 'Victor Durand', email: 'victor@durand.com', subjects: ['Nouveau projet React'], count: 1 },
      { name: 'Capucine Lefebvre', email: 'capucine@agency.fr', subjects: ['Devis site vitrine'], count: 2 },
      { name: 'Thomas Martin', email: 'thomas.m@start.io', subjects: ['Update Roadmap'], count: 5 },
      { name: 'Amazon', email: 'order-update@amazon.fr', subjects: ['Votre commande'], count: 1 },
      { name: 'LinkedIn', email: 'notifications@linkedin.com', subjects: ['Nouveaux messages'], count: 10 },
      { name: 'Matilda Rossi', email: 'matilda@design.it', subjects: ['Assets Figma'], count: 3 }
    ];
    setScanSenders(mockSenders);

    // AI Scan simulation
    await new Promise(r => setTimeout(r, 4500));

    const results = mockSenders.map(s => {
       let cat = 'other';
       if (['Victor','Capucine','Thomas','Matilda'].some(n => s.name.includes(n))) cat = 'client';
       if (['Amazon','LinkedIn'].some(n => s.name.includes(n))) cat = 'promo';
       return { ...s, category: cat, confidence: 0.95 };
    });

    // Populate pending messages for validation
    pendingMessagesRef.current = mockSenders.map(s => {
      let extractedTasks = [];
      let body = "Bonjour, j'aimerais qu'on discute de la suite du projet.";
      if (s.name.includes('Victor')) {
        body = "Salut ! L'équipe a validé les maquettes. Peux-tu intégrer les retours sur la home et lancer le module de paiement ?";
        extractedTasks = [
          { id: 'sim_t1', title: 'Intégrer retours home page', est: '2h', billable: true },
          { id: 'sim_t2', title: 'Initier module paiement', est: '1j', billable: true }
        ];
      } else if (s.name.includes('Capucine')) {
        body = "Bonjour, nous avons bien reçu votre devis. Serait-il possible de détailler un peu plus la partie maintenance ?";
        extractedTasks = [
          { id: 'sim_t3', title: 'Détailler offre maintenance', est: '1h', billable: true }
        ];
      }
      return {
        id: 'sim_msg_' + s.email,
        from: s.name,
        fromEmail: s.email,
        subject: s.subjects[0],
        body: body,
        time: 'À l\'instant',
        unread: true,
        extractedTasks: extractedTasks
      };
    });
    
    setScanResults(results);
    setScanPhase('review');
  }

  // Manual trigger
  async function handleRescanGmail() {
    loadGmailMessages();
  }

  function handleCancelScan() {
    setScanPhase(null);
    setScanResults([]);
    setScanSenders([]);
    pendingMessagesRef.current = [];
  }

  // User validated → actually add the chosen contacts to clients + messages
  async function handleValidateContacts(chosen) {
    const chosenEmails = new Set(chosen.map(c => c.email.toLowerCase()));
    const rawMsgs = pendingMessagesRef.current || [];

    const filteredMsgs = rawMsgs.filter(m =>
      chosenEmails.has((m.fromEmail || '').toLowerCase())
    );

    const emailToClientId = (email) => 'gmail_' + (email || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const palette = ['#111111','#1F2937','#374151','#4B5563','#000000'];

    const gmailMsgs = filteredMsgs.map(m => ({ ...m, clientId: emailToClientId(m.fromEmail || m.from) }));

    const senderOrder = [];
    const senderLatest = {};
    gmailMsgs.forEach(m => {
      if (!senderLatest[m.clientId]) {
        senderLatest[m.clientId] = m;
        senderOrder.push(m.clientId);
      }
    });

    // Merge into clients
    setClients(prev => {
      const existingById = Object.fromEntries(prev.map(c => [c.id, c]));
      const newOnes = [];
      senderOrder.forEach((cid, i) => {
        const m = senderLatest[cid];
        if (!existingById[cid]) {
          const name = m.from || m.fromEmail || 'Contact Gmail';
          const initials = name.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
          const color = palette[(prev.length + i) % palette.length];
          newOnes.push({
            id: cid, name, color, avatar: initials,
            avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=${color.slice(1).replace('#','')}`,
            tags: ['Gmail'], rate: 0, active: true,
            lastActivity: m.time || "à l'instant",
            unread: m.unread ? 1 : 0, value: 0, status: 'ongoing',
            source: 'gmail', email: m.fromEmail
          });
        }
      });
      return [...newOnes, ...prev];
    });

    // Merge messages
    setMessages(prev => {
      const nonGmail = prev.filter(m => !m.id.startsWith('gmail_'));
      return [...gmailMsgs, ...nonGmail];
    });

    if (senderOrder.length > 0) {
      const firstId = senderOrder[0];
      setActiveClient(firstId);
    }

    showToast(`✅ ${senderOrder.length} contact${senderOrder.length > 1 ? 's' : ''} ajouté${senderOrder.length > 1 ? 's' : ''}`);
    setScanPhase(null);
    setScanResults([]);
    setScanSenders([]);
    pendingMessagesRef.current = [];
    setView('today');
  }

  // Fetch full conversation (simulated)
  async function loadConversationFor(clientId, clientObj) {
    const client = clientObj || clients.find(c => c.id === clientId);
    if (!client) return;

    setConversationsLoading(prev => ({ ...prev, [clientId]: true }));
    
    // SIMULATION
    setTimeout(() => {
      const history = [];
      const baseTime = Date.now();
      const DayMs = 24 * 60 * 60 * 1000;

      history.push({
        id: 'msg_1', from: client.name, fromEmail: client.email,
        subject: 'Re: Suivi projet', date: 'Hier',
        bodyText: `Bonjour, je reviens vers vous concernant ${client.name.split(' ')[0]}. Tout me semble correct pour la suite.`,
        snippet: 'Bonjour, je reviens vers vous...',
        unread: false, direction: 'received'
      });
      history.push({
        id: 'msg_2', from: 'Moi', fromEmail: 'wacil@freescale.io',
        subject: 'Re: Suivi projet', date: 'Hier',
        bodyText: "Parfait, je prépare les prochaines étapes.",
        snippet: 'Parfait, je prépare...',
        unread: false, direction: 'sent'
      });

      setConversationsLoading(prev => ({ ...prev, [clientId]: false }));
      setConversations(prev => ({ ...prev, [clientId]: history }));
    }, 600);
  }

  // When a client is selected in sidebar, trigger conversation load
  const handleClientSelect = (id) => {
    setActiveClient(id);
    setView('inbox');
    loadConversationFor(id);
  };

  // Send a reply (and optimistically add it to the conversation)
  async function handleSendReply({ clientId, to, subject, body, attachments = [], threadId, inReplyTo }) {
    if (!window.FreescaleGmail) return { error: 'no_connector' };
    const res = await FreescaleGmail.sendEmail({ to, subject, body, attachments, threadId, inReplyTo });
    if (res.error) {
      showToast('❌ Envoi échoué : ' + res.error);
      return res;
    }
    // Optimistic local append
    const now = new Date();
    const optimistic = {
      id: res.id || 'local_' + now.getTime(),
      threadId: res.threadId || threadId,
      from: 'Moi', fromEmail: myGmail,
      to: to, toEmails: [to],
      subject, date: now.toISOString(), dateMs: now.getTime(),
      bodyText: body, bodyHtml: '', snippet: body.slice(0, 120),
      attachments: attachments.map(a => ({ filename: a.filename, mimeType: a.mimeType, size: a.size || 0 })),
      unread: false, direction: 'sent'
    };
    setConversations(prev => ({
      ...prev,
      [clientId]: [...(prev[clientId] || []), optimistic]
    }));
    showToast('✉️ Email envoyé');
    return res;
  }

  async function handleDisconnectGmail() {
    if (!window.FreescaleGmail) return;
    await FreescaleGmail.disconnect();
    setGmailConnected(false);
    // Remove gmail-sourced clients + messages
    setClients(prev => prev.filter(c => !String(c.id).startsWith('gmail_')));
    setMessages(prev => prev.filter(m => !String(m.id).startsWith('gmail_')));
    showToast('Gmail déconnecté');
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

  const handleChannelConnect = async (id) => {
    if (id === 'gmail') {
      // Real Gmail OAuth flow
      if (!window.FreescaleGmail) return showToast('Connecteur Gmail indisponible');
      const alive = await FreescaleGmail.isBackendAlive();
      if (!alive) {
        showToast('⚠️ Backend non lancé — cd backend && npm start');
        return;
      }
      const status = await FreescaleGmail.getStatus();
      if (!status.configured) {
        showToast('⚠️ Configure backend/.env avec tes identifiants Google Cloud');
        return;
      }
      if (status.connected) {
        // Already connected → close connector and re-run the AI scan directly
        setConnectorOpen(false);
        showToast('✅ Gmail connecté — relance de l\'analyse IA…');
        loadGmailMessages();
        return;
      }
      setConnectorOpen(false);
      FreescaleGmail.connect(); // redirects to Google consent screen
      return;
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
      { id: 'gen1', title: 'Répondre à Orion Robotics sur Whatsapp', client: 'Orion Robotics', clientColor: '#111', due: "Aujourd'hui, 14:00", source: 'whatsapp', from: 'Paul T.', est: '10 min', priority: 'high' },
      { id: 'gen2', title: 'Envoyer moodboard préliminaire', client: 'Lumen Studio', clientColor: '#555', due: "Demain, 10:00", source: 'discord', from: 'Marc L.', est: '45 min', priority: 'med' }
    ];
    setTasks(prev => [...generated, ...prev]);
    setMessages(prev => prev.map(m => ({ ...m, unread: false })));
    showToast('Tâches générées et messages marqués lus');
  };

  const handleCompleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    showToast('Tâche terminée !');
  };

  const [clientPromptOpen, setClientPromptOpen] = React.useState(false);

  const handleDismissNudge = (id) => {
    setNudges(prev => prev.filter(n => n.id !== id));
    showToast('Alerte traitée');
  };

  const handleAddClientClick = () => {
    setClientPromptOpen(true);
  };

  const handleAddClientConfirm = (name) => {
    setClientPromptOpen(false);
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
    titleBar = { t: 'Inbox unifiée', s: `${[gmailConnected, whatsappConnected, instagramConnected].filter(Boolean).length} sources connectées · ${unreadCount} non lus` };
  } else if (view === 'today') {
    const connectedCount = [gmailConnected, whatsappConnected, instagramConnected].filter(Boolean).length;
    const clientCount = clients.length;
    titleBar = { 
      t: "Hello, Wacil!", 
      s: `${connectedCount} connected channel${connectedCount > 1 ? 's' : ''} · ${clientCount} contact${clientCount > 1 ? 's' : ''}` 
    };
  }

  const renderView = () => {
    switch (view) {
      case 'today':     return <TodayView tasks={tasks} nudges={nudges} unreadCount={unreadCount} sources={data.sources} onGenerate={handleGenerateTasks} onComplete={handleCompleteTask} onDismissNudge={handleDismissNudge} messages={messages} brief={data.todayBrief} onConnectChannel={() => setConnectorOpen(true)} anyChannelConnected={[gmailConnected, whatsappConnected, instagramConnected].some(Boolean)} />;
      case 'inbox':     return <InboxView messages={messages} clients={clients} sources={data.sources} tasks={tasks}
                                  activeClientId={activeClient}
                                  conversation={conversations[activeClient] || []}
                                  conversationLoading={!!conversationsLoading[activeClient]}
                                  myEmail={myGmail}
                                  onSendReply={handleSendReply}
                                  acceptedTasks={acceptedTasks} onAcceptTask={(id) => { setAcceptedTasks(prev => [...prev, id]); showToast('Tâche ajoutée au planning'); }} onDismissTask={(id) => setAcceptedTasks(prev => [...prev, id + '_dismissed'])} />;
      case 'tasks':     return <TasksView brief={data.todayBrief} acceptedTasks={acceptedTasks} />;
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
        activeClient={activeClient} onClientSelect={handleClientSelect}
        clients={clients} messages={messages} sources={data.sources}
        gmailConnected={gmailConnected}
        whatsappConnected={whatsappConnected}
        instagramConnected={instagramConnected}
        onOpenSettings={() => setSettingsOpen(true)}
        onAddClient={handleAddClientClick}
        onConnectChannel={() => setConnectorOpen(true)}
        onDisconnectGmail={handleDisconnectGmail}
        onOpenHelp={() => showToast('Help Center — bientôt disponible')}
      />
      <div style={shellStyles.main}>
        <TopBar title={titleBar.t} subtitle={titleBar.s} active={view} onNav={setView} unreadCount={unreadCount} />
        <div style={shellStyles.content}>
          {renderView()}
        </div>
      </div>

      <window.ActionModal 
        isOpen={clientPromptOpen} 
        type="prompt" 
        title="Nouveau contact" 
        placeholder="Nom du contact..." 
        confirmText="Ajouter" 
        onConfirm={handleAddClientConfirm} 
        onCancel={() => setClientPromptOpen(false)} 
      />

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
      <ContactScanModal
        isOpen={scanPhase !== null}
        phase={scanPhase}
        senders={scanSenders}
        results={scanResults}
        onValidate={handleValidateContacts}
        onCancel={handleCancelScan}
      />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<FreescaleApp />);
