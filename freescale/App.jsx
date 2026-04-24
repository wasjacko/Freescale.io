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
    console.log('[Freescale] boot useEffect — url:', window.location.search);
    const params = new URLSearchParams(window.location.search);

    if (params.get('gmail_error')) {
      showToast('❌ Erreur de connexion Gmail : ' + params.get('gmail_error'));
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const hasCallbackParam = params.get('gmail_connected') === 'true';
    if (hasCallbackParam) {
      showToast('✅ Connexion réussie !');
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Add more mock messages for variety (at least 4 cards)
    if (messages.length === 0) {
      const mockMsgs = [
        { id: 'm1', clientId: 'victor_croyst', from: 'Victor Croyst', body: "Salut, on peut se caler un point demain à 10h pour le logo ?", source: 'gmail', time: '10:00', unread: true, extractedTasks: [{ id: 'et1', title: 'Point logo avec Victor', est: '30 min', billable: false }] },
        { id: 'm2', clientId: 'matilda_l', from: 'Matilda L.', body: "Hello ! J'ai bien reçu le devis, je le valide. On commence quand ?", source: 'whatsapp', time: '11:30', unread: true, extractedTasks: [{ id: 'et2', title: 'Démarrage projet Matilda', est: '1h', billable: true }] },
        { id: 'm3', clientId: 'lumen_studio', from: 'Lumen Studio', body: "Le retour sur la v2 est prêt. Il y a quelques modifs sur la typo.", source: 'gmail', time: '14:15', unread: true, extractedTasks: [{ id: 'et3', title: 'Modifs typo v2 — Lumen', est: '45 min', billable: true }] },
        { id: 'm4', clientId: 'capucine_s', from: 'Capucine Spohn', body: "Peux-tu m'envoyer la facture d'acompte stp ?", source: 'gmail', time: '15:00', unread: true, extractedTasks: [{ id: 'et4', title: 'Envoyer facture acompte Capucine', est: '10 min', billable: false }] }
      ];
      setMessages(mockMsgs);

      // Ensure clients exist
      setClients(prev => {
        const ids = new Set(prev.map(c => c.id));
        const newC = [
          { id: 'victor_croyst', name: 'Victor Croyst', color: '#111', avatar: 'VC', active: true, source: 'gmail', lastActivity: 'hier' },
          { id: 'matilda_l', name: 'Matilda L.', color: '#E11D48', avatar: 'ML', active: true, source: 'whatsapp', lastActivity: '2h' },
          { id: 'lumen_studio', name: 'Lumen Studio', color: '#0EA5E9', avatar: 'LS', active: true, source: 'gmail', lastActivity: '15:30' },
          { id: 'capucine_s', name: 'Capucine Spohn', color: '#16A349', avatar: 'CS', active: true, source: 'gmail', lastActivity: '12:00' }
        ].filter(c => !ids.has(c.id));
        return [...prev, ...newC];
      });
    }

    // Check backend status. If Gmail is connected, trigger the scan — ALWAYS.
    (async () => {
      if (!window.FreescaleGmail) {
        console.warn('[Freescale] FreescaleGmail not available');
        return;
      }
      const alive = await FreescaleGmail.isBackendAlive().catch(() => false);
      console.log('[Freescale] backend alive:', alive);
      if (!alive) {
        if (hasCallbackParam) showToast('⚠️ Backend non lancé — cd backend && npm start');
        return;
      }
      const status = await FreescaleGmail.getStatus().catch(() => ({ connected: false }));
      console.log('[Freescale] boot gmail status:', status);
      setGmailConnected(!!status.connected);

      if (status.connected) {
        // Trigger scan modal automatically
        console.log('[Freescale] boot → triggering loadGmailMessages()');
        loadGmailMessages();
      }
    })();
  }, []);

  // Local heuristic (strict): only real human names on personal domains → client
  function quickClassify(email, name, subject) {
    const local  = (email || '').toLowerCase().split('@')[0] || '';
    const domain = (email || '').toLowerCase().split('@')[1] || '';
    const sub    = (subject || '').toLowerCase();
    const nm     = (name || '').trim();

    // 1. PROMO: noreply/notifications/newsletter/marketing/generic role accounts
    const promoLocal = /^(no[-_.]?reply|noreply|notifications?|newsletter|mailer|bounce|postmaster|daemon|marketing|promo|do[-_.]?not[-_.]?reply|hello|contact|support|team|info|admin|billing|invoice|accounts?|help|service|alerts?|news|updates?|automated|robot|system|webmaster|office)($|[-_.@+0-9])/i;
    if (promoLocal.test(local)) return 'promo';

    const promoDomains = ['mailchimp.com','sendgrid.net','sendinblue.com','mailjet.com','mailgun.org','amazonses.com','facebookmail.com','notifications.google.com','em.','mail.'];
    if (promoDomains.some(d => domain === d || domain.endsWith('.' + d) || domain.startsWith(d))) return 'promo';

    if (/(newsletter|unsubscribe|désabonn|promo|-?\d{2,3}\s?%|flash sale|black friday|offer|deal|sale)/i.test(sub)) return 'promo';

    // 2. OTHER: institutional/corporate domains — user is just a customer/user there, not a freelance client of them
    const instDomains = [
      'hetic.net','hetic.eu','hetic.fr','anthropic.com','openai.com',
      'google.com','youtube.com','notion.so','figma.com','github.com','gitlab.com',
      'apple.com','icloud.com','microsoft.com','outlook.live.com','office.com',
      'linkedin.com','stripe.com','paypal.com','vercel.com','netlify.com',
      'slack.com','discord.com','zoom.us','calendly.com','dropbox.com','adobe.com',
      'atlassian.com','trello.com','asana.com','spotify.com','twitter.com','x.com',
      'meta.com','facebook.com','instagram.com','amazon.com','aws.amazon.com',
      'shopify.com','hubspot.com','intercom.io','zapier.com','airbnb.com','uber.com',
      'doctolib.fr','ameli.fr','impots.gouv.fr','urssaf.fr','laposte.fr','sncf.com',
      'numericable.fr','free.fr','orange.fr','sfr.fr','bouyguestelecom.fr'
    ];
    if (instDomains.some(d => domain === d || domain.endsWith('.' + d))) return 'other';

    // 3. CLIENT only if:
    //    - display name looks like prénom+nom
    //    - AND local part looks like a real name (letters, max 1 separator, 3-25 chars)
    const looksLikePerson = /^[A-ZÀ-Ö][a-zà-ÿ'-]+\s+[A-ZÀ-Ö][a-zà-ÿ'-]+/.test(nm);
    const localLooksPersonal = /^[a-zà-ÿ]{3,}([._-][a-zà-ÿ]{2,})?[0-9]{0,3}$/i.test(local);
    if (looksLikePerson && localLooksPersonal) return 'client';

    // 4. Everything else: other (organizations, unclear senders, role accounts, etc.)
    return 'other';
  }


  // ─── Gmail : fetch messages puis déclenche le scan IA ───
  // Flow en deux phases :
  //  1. loadGmailMessages()     → récupère les messages + ouvre le modal "scanning"
  //                                + appelle /api/ai/classify-contacts (Claude)
  //  2. finalizeContactImport() → fusionne dans clients uniquement ceux validés par l'utilisateur
  async function loadGmailMessages() {
    console.log('[Freescale] loadGmailMessages() START');
    if (!window.FreescaleGmail) {
      showToast('⚠️ Connecteur Gmail absent');
      return;
    }
    // Idempotency: if a scan is already running, don't start another one
    if (scanPhase === 'scanning') {
      console.log('[Freescale] scan already in progress, skipping');
      return;
    }

    // Open modal IMMEDIATELY so the user sees the animation during the fetch
    setScanPhase('scanning');
    setScanSenders([]);
    setScanResults([]);

    const status = await FreescaleGmail.getStatus();
    console.log('[Freescale] gmail status:', status);
    setGmailConnected(status.connected);
    if (!status.connected) {
      showToast('⚠️ Gmail marqué déconnecté par le backend');
      setScanPhase(null);
      return;
    }

    const result = await FreescaleGmail.getMessages(200);
    console.log('[Freescale] getMessages result:', result?.error || `${result.messages?.length || 0} msgs`);
    if (result.error) {
      showToast('❌ Échec fetch Gmail : ' + result.error);
      setScanPhase('empty');
      return;
    }

    const rawMsgs = (result.messages || []).map((m, i) => FreescaleGmail.toFreescaleMessage(m, i));
    pendingMessagesRef.current = rawMsgs;

    // Dedupe by sender email + collect subject samples for the AI
    const byEmail = {};
    rawMsgs.forEach(m => {
      const email = (m.fromEmail || '').toLowerCase();
      if (!email) return;
      if (!byEmail[email]) {
        byEmail[email] = { email, name: m.from || '', subjects: [], count: 0 };
      }
      byEmail[email].count += 1;
      if (byEmail[email].subjects.length < 3 && m.subject) {
        byEmail[email].subjects.push(m.subject);
      }
    });
    const senders = Object.values(byEmail);
    console.log('[Freescale] unique senders:', senders.length);

    if (senders.length === 0) {
      setScanPhase('empty');
      setScanSenders([]);
      return;
    }

    // Update modal with senders for the live animation
    setScanSenders(senders);
    const scanStartedAt = Date.now();

    // Call Claude to classify — real AI
    console.log('[Freescale] calling AI classify for', senders.length, 'senders…');
    const aiRes = await FreescaleGmail.classifyContacts(senders);
    console.log('[Freescale] AI result:', aiRes);

    // Minimum scan-animation duration so the count-up is visible but not annoying
    const MIN_SCAN_MS = Math.min(5000, Math.max(2500, senders.length * 90));
    const elapsed = Date.now() - scanStartedAt;
    if (elapsed < MIN_SCAN_MS) {
      await new Promise(r => setTimeout(r, MIN_SCAN_MS - elapsed));
    }

    let merged;
    if (aiRes.error || !aiRes.results || aiRes.results.length === 0) {
      // Fallback: use LOCAL heuristic so we always end up with a usable classification
      console.warn('[Freescale] AI unavailable, using local heuristic:', aiRes.error);
      merged = senders.map(s => ({
        email: s.email, name: s.name,
        category: quickClassify(s.email, s.name, (s.subjects || [])[0] || ''),
        confidence: 0.6,
        reason: aiRes.error ? 'IA indispo — heuristique locale' : 'heuristique locale'
      }));
    } else {
      // Make sure every sender is represented (AI might have dropped some)
      const byEmailRes = Object.fromEntries(aiRes.results.map(r => [r.email.toLowerCase(), r]));
      merged = senders.map(s => byEmailRes[s.email.toLowerCase()] || ({
        email: s.email, name: s.name,
        category: quickClassify(s.email, s.name, (s.subjects || [])[0] || ''),
        confidence: 0.5, reason: 'heuristique locale (AI a sauté)'
      }));
    }

    // STRICT POST-FILTER: trust our local heuristic to DEMOTE — if quickClassify says
    // not-client, force not-client, even if AI said client. AI can only keep/demote.
    merged = merged.map(r => {
      const local = quickClassify(r.email, r.name, '');
      if (r.category === 'client' && local !== 'client') {
        return { ...r, category: local, reason: (r.reason || '') + ' · démotion locale' };
      }
      return r;
    });

    // HARD CAP at 4 clients: if more, keep the 4 highest-confidence, demote rest to 'other'
    const MAX_CLIENTS = 4;
    const clientEntries = merged
      .map((r, i) => ({ r, i }))
      .filter(x => x.r.category === 'client')
      .sort((a, b) => (b.r.confidence || 0) - (a.r.confidence || 0));
    if (clientEntries.length > MAX_CLIENTS) {
      const keepIdx = new Set(clientEntries.slice(0, MAX_CLIENTS).map(x => x.i));
      merged = merged.map((r, i) => {
        if (r.category === 'client' && !keepIdx.has(i)) {
          return { ...r, category: 'other', reason: (r.reason || '') + ' · cap 4 clients' };
        }
        return r;
      });
    }

    // DEMO RIG: Force 2 specific mock clients as requested
    const demoNames = [
      { name: 'Victor Croyst', email: 'victor@croyst.com' },
      { name: 'Matilda', email: 'matilda@design.com' }
    ];
    
    // We do NOT demote real clients anymore, so real contacts (like Capucine) are preserved.
    // merged = merged.map(r => r.category === 'client' ? { ...r, category: 'other' } : r);

    demoNames.forEach(d => {
      // Unshift them so they are at the top and classified as clients
      merged.unshift({
        email: d.email, name: d.name,
        category: 'client', confidence: 0.99,
        reason: 'Identifié comme opportunité prioritaire (démo)'
      });

      let subject = '';
      let body = '';
      let mockTasks = [];

      if (d.name.includes('Victor')) {
        subject = 'Refonte de la plateforme Web';
        body = 'Bonjour, l\'équipe a validé les maquettes ! Il faudrait juste intégrer les retours sur la page d\'accueil et lancer le développement du module de paiement.';
        mockTasks = [
          { id: 't_' + Date.now() + Math.random(), title: 'Intégrer retours maquettes', est: '3h', billable: true },
          { id: 't_' + Date.now() + Math.random(), title: 'Développer module de paiement', est: '1.5j', billable: true }
        ];
      } else if (d.name.includes('Matilda')) {
        subject = 'Identité visuelle et charte graphique';
        body = 'Coucou, j\'ai regardé les moodboards que tu as envoyés. J\'adore la direction artistique. Pourrait-on se faire un point rapide demain matin pour trancher sur le logo ?';
        mockTasks = [
          { id: 't_' + Date.now() + Math.random(), title: 'Préparer la sélection finale de logos', est: '1h', billable: false },
          { id: 't_' + Date.now() + Math.random(), title: 'Point rapide avec Matilda', est: '30 min', billable: true }
        ];
      }

      pendingMessagesRef.current.push({
        id: 'demo_' + d.email,
        from: d.name,
        fromEmail: d.email,
        subject,
        body,
        time: 'Aujourd\'hui',
        unread: true,
        extractedTasks: mockTasks
      });
    });

    // Inject demo tasks for Capucine Spohn if she is found among real emails
    pendingMessagesRef.current.forEach(m => {
      if ((m.from || '').toLowerCase().includes('capucine') || (m.fromEmail || '').toLowerCase().includes('capucine')) {
        m.extractedTasks = [
          { id: 't_' + Date.now() + Math.random(), title: 'Préparer proposition commerciale', est: '2h', billable: true },
          { id: 't_' + Date.now() + Math.random(), title: 'Planifier appel de cadrage', est: '30 min', billable: false }
        ];
      }
    });

    setScanResults(merged);
    
    // Give time to see the "Done" state in ScanSorting (1.5s)
    await new Promise(r => setTimeout(r, 1500));
    setScanPhase('review');
  }

  // Manual trigger: user clicks "Scanner Gmail"
  // - If backend has valid tokens → run the scan directly
  // - If not → redirect to Google OAuth
  async function handleRescanGmail() {
    console.log('[Freescale] handleRescanGmail() — manual trigger');
    if (!window.FreescaleGmail) return showToast('⚠️ Connecteur indisponible');
    const alive = await FreescaleGmail.isBackendAlive();
    if (!alive) return showToast('⚠️ Backend non lancé — cd backend && npm start');
    const status = await FreescaleGmail.getStatus();
    if (!status.configured) return showToast('⚠️ backend/.env incomplet (GOOGLE_CLIENT_ID…)');
    if (!status.connected) {
      showToast('🔐 Redirection vers Google…');
      return FreescaleGmail.connect();
    }
    // Already connected → directly run the scan
    loadGmailMessages();
  }

  // User cancelled the scan modal — nothing added
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

    // Keep only messages from the validated senders
    const filteredMsgs = rawMsgs.filter(m =>
      chosenEmails.has((m.fromEmail || '').toLowerCase())
    );

    const emailToClientId = (email) => 'gmail_' + (email || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const palette = ['#111111','#1F2937','#374151','#4B5563','#000000'];

    const gmailMsgs = filteredMsgs.map(m => ({ ...m, clientId: emailToClientId(m.fromEmail || m.from) }));

    // Pick newest message per sender
    const senderOrder = [];
    const senderLatest = {};
    gmailMsgs.forEach(m => {
      if (!senderLatest[m.clientId]) {
        senderLatest[m.clientId] = m;
        senderOrder.push(m.clientId);
      }
    });

    // Avatars: Google photos > Gravatar > initials
    const googlePhotos = await FreescaleGmail.getContactPhotos();
    const probeImg = (url) => new Promise(resolve => {
      if (!url) return resolve(false);
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
    const resolvedAvatars = {};
    await Promise.all(senderOrder.map(async (cid, i) => {
      const m = senderLatest[cid];
      const email = (m.fromEmail || '').toLowerCase();
      const name = m.from || m.fromEmail || 'Contact Gmail';
      const color = palette[i % palette.length];
      const fallback = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email || name)}&backgroundColor=${color.slice(1)}`;
      if (email && googlePhotos[email]) { resolvedAvatars[cid] = googlePhotos[email]; return; }
      if (await probeImg(m.avatarUrl)) { resolvedAvatars[cid] = m.avatarUrl; return; }
      resolvedAvatars[cid] = fallback;
    }));

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
            avatarUrl: resolvedAvatars[cid],
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
      // Proactively preload the conversation for the first contact so messages are ready
      // Pass the client object directly (state hasn't refreshed yet)
      const firstMsg = senderLatest[firstId];
      const firstClient = {
        id: firstId,
        name: firstMsg.from || firstMsg.fromEmail,
        email: firstMsg.fromEmail
      };
      loadConversationFor(firstId, firstClient);
    }

    showToast(`✅ ${senderOrder.length} contact${senderOrder.length > 1 ? 's' : ''} ajouté${senderOrder.length > 1 ? 's' : ''}`);

    // Close modal and redirect to dashboard
    setScanPhase(null);
    setScanResults([]);
    setScanSenders([]);
    pendingMessagesRef.current = [];
    setView('today');
  }

  // Fetch full conversation (all sent+received emails) with a given client
  // Accepts optional clientObj arg so it can be called right after setClients (before state refresh)
  async function loadConversationFor(clientId, clientObj) {
    console.log('[Freescale] loadConversationFor:', clientId);
    if (!clientId || !window.FreescaleGmail) return;
    const client = clientObj || clients.find(c => c.id === clientId);
    if (!client) {
      console.warn('[Freescale] client not found for id:', clientId);
      return;
    }
    if (!client.email) {
      console.warn('[Freescale] client has no email:', client);
      return;
    }
    // Cache: skip if already loaded
    if (conversations[clientId] && conversations[clientId].length > 0) {
      console.log('[Freescale] conversation cached for', clientId);
      return;
    }

    setConversationsLoading(prev => ({ ...prev, [clientId]: true }));

    // DEMO RIG: Return mock conversations for our fake clients immediately
    if (['victor@croyst.com', 'matilda@design.com'].includes(client.email) || 
        client.name.toLowerCase().includes('victor') || 
        client.name.toLowerCase().includes('matilda')) {
      setTimeout(() => {
        let history = [];
        const baseTime = Date.now();
        const DayMs = 24 * 60 * 60 * 1000;
        const HourMs = 60 * 60 * 1000;

        if (client.name.includes('Victor')) {
          for (let i=0; i<20; i++) {
            const isMe = (i % 2 === 0);
            const t = baseTime - (25 - i) * DayMs + (i * 2 * HourMs);
            history.push({
              id: 'mock_vic_' + i, threadId: 'vic_thread',
              from: isMe ? 'Moi' : client.name, fromEmail: isMe ? 'moi@mail.com' : client.email,
              to: isMe ? client.name : 'Moi', toEmails: [],
              subject: 'Re: Refonte Web',
              bodyText: 'Point d\'étape ' + (i+1) + ' sur la plateforme.',
              bodyHtml: '<p>Point d\'étape ' + (i+1) + ' sur la plateforme.</p>',
              snippet: 'Point d\'étape ' + (i+1),
              date: new Date(t).toISOString(), dateMs: t, attachments: [], unread: false, direction: isMe ? 'sent' : 'received'
            });
          }
          history.push({
              id: 'mock_vic_last', threadId: 'vic_thread',
              from: client.name, fromEmail: client.email, to: 'Moi', toEmails: [],
              subject: 'Refonte de la plateforme Web',
              bodyText: 'Bonjour, l\'équipe a validé les maquettes ! Il faudrait juste intégrer les retours sur la page d\'accueil et lancer le développement du module de paiement.',
              bodyHtml: '<p>Bonjour, l\'équipe a validé les maquettes ! Il faudrait juste intégrer les retours sur la page d\'accueil et lancer le développement du module de paiement.</p>',
              snippet: 'Bonjour, l\'équipe a validé les maquettes !',
              date: new Date(baseTime - 1000).toISOString(), dateMs: baseTime - 1000, attachments: [], unread: false, direction: 'received'
          });
        }
        
        else if (client.name.includes('Matilda')) {
          for (let i=0; i<28; i++) {
            const isMe = (i % 2 !== 0);
            const t = baseTime - (40 - i) * DayMs + (i * HourMs / 2);
            history.push({
              id: 'mock_mat_' + i, threadId: 'mat_thread',
              from: isMe ? 'Moi' : client.name, fromEmail: isMe ? 'moi@mail.com' : client.email,
              to: isMe ? client.name : 'Moi', toEmails: [],
              subject: 'Re: Identité visuelle',
              bodyText: 'Échange concernant le logo - partie ' + (i+1),
              bodyHtml: '<p>Échange concernant le logo - partie ' + (i+1) + '</p>',
              snippet: 'Échange concernant le logo...',
              date: new Date(t).toISOString(), dateMs: t, attachments: [], unread: false, direction: isMe ? 'sent' : 'received'
            });
          }
          history.push({
              id: 'mock_mat_last', threadId: 'mat_thread',
              from: client.name, fromEmail: client.email, to: 'Moi', toEmails: [],
              subject: 'Identité visuelle et charte graphique',
              bodyText: 'Coucou, j\'ai regardé les moodboards que tu as envoyés. J\'adore la direction artistique. Pourrait-on se faire un point rapide demain matin pour trancher sur le logo ?',
              bodyHtml: '<p>Coucou, j\'ai regardé les moodboards que tu as envoyés. J\'adore la direction artistique. Pourrait-on se faire un point rapide demain matin pour trancher sur le logo ?</p>',
              snippet: 'Coucou, j\'ai regardé les moodboards...',
              date: new Date(baseTime - 1000).toISOString(), dateMs: baseTime - 1000, attachments: [], unread: false, direction: 'received'
          });
        }

        setConversationsLoading(prev => ({ ...prev, [clientId]: false }));
        setConversations(prev => ({
          ...prev,
          [clientId]: history
        }));
      }, 500);
      return;
    }

    const data = await FreescaleGmail.getConversation(client.email, 100);
    console.log('[Freescale] conversation result for', client.email, ':', data?.error || `${data?.messages?.length || 0} msgs`);
    setConversationsLoading(prev => ({ ...prev, [clientId]: false }));
    if (data.error) {
      showToast('⚠️ Conversation a échoué : ' + data.error);
      return;
    }
    if (data.myEmail) setMyGmail(data.myEmail);
    setConversations(prev => ({ ...prev, [clientId]: data.messages || [] }));
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
