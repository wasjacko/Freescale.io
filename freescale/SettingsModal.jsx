// Freescale — Settings Modal with Gmail OAuth integration
const settingsStyles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 2000,
    backdropFilter: 'blur(4px)'
  },
  card: {
    width: 800, height: 600, background: '#F9FAFB', borderRadius: 24,
    boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
  },
  header: {
    padding: '20px 24px', borderBottom: '1px solid var(--border-1)', background: '#fff',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  headerTitle: { fontSize: 18, fontWeight: 700, color: 'var(--fg-0)' },
  closeBtn: { cursor: 'pointer', color: 'var(--fg-3)', border: 'none', background: 'none' },

  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  sidebar: {
    width: 240, borderRight: '1px solid var(--border-1)', padding: '20px 12px',
    display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto'
  },
  navItem: {
    padding: '10px 12px', borderRadius: 10, fontSize: 14, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'all 0.2s',
    border: 'none', background: 'none', width: '100%', color: 'var(--fg-2)', textAlign: 'left'
  },
  navItemActive: { background: 'var(--border-2)', color: 'var(--fg-0)' },
  navSep: { height: 1, background: 'var(--border-1)', margin: '16px 12px' },

  content: { flex: 1, padding: 40, background: '#fff', overflowY: 'auto' },
  viewHead: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  viewTitle: { fontSize: 20, fontWeight: 800, color: 'var(--fg-0)' },
  viewSub: { fontSize: 14, color: 'var(--fg-3)', marginBottom: 24 },

  settingRow: {
    padding: 16, borderRadius: 16, border: '1px solid var(--border-1)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12
  },
  settingInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  settingLabel: { fontSize: 14, fontWeight: 700, color: 'var(--fg-0)' },
  settingDesc: { fontSize: 12, color: 'var(--fg-3)', marginTop: 2 },

  toggle: {
    width: 44, height: 24, borderRadius: 12, background: 'var(--border-2)',
    position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
  },
  toggleActive: { background: 'var(--accent)' },
  toggleThumb: {
    width: 20, height: 20, borderRadius: '50%', background: '#fff',
    position: 'absolute', top: 2, left: 2, transition: 'all 0.3s'
  },
  toggleThumbActive: { left: 22 }
};

// Gmail connection card styles
const gmailCardStyles = {
  container: {
    border: '1px solid var(--border-1)', borderRadius: 16, overflow: 'hidden', marginBottom: 16
  },
  header: {
    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12
  },
  icon: {
    width: 40, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center',
    fontSize: 20
  },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: 700, color: 'var(--fg-0)' },
  desc: { fontSize: 12, color: 'var(--fg-3)', marginTop: 2 },
  connectBtn: {
    padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
    transition: 'all 0.2s'
  },
  statusBar: {
    padding: '12px 20px', borderTop: '1px solid var(--border-1)',
    display: 'flex', alignItems: 'center', gap: 8, fontSize: 12
  },
  statusDot: {
    width: 8, height: 8, borderRadius: '50%'
  }
};

function GmailConnectionCard({ gmailStatus, gmailProfile, onConnect, onDisconnect, backendAlive }) {
  const isConnected = gmailStatus?.connected;
  const isConfigured = gmailStatus?.configured;

  return (
    <div style={gmailCardStyles.container}>
      <div style={gmailCardStyles.header}>
        <div style={{ ...gmailCardStyles.icon, background: '#FEE2E2' }}>
          <Icon name="mail" size={20} color="#D93025" />
        </div>
        <div style={gmailCardStyles.info}>
          <div style={gmailCardStyles.title}>Gmail</div>
          <div style={gmailCardStyles.desc}>
            {isConnected
              ? `Connecté en tant que ${gmailProfile?.email || '...'}`
              : isConfigured
                ? 'Prêt à être connecté'
                : 'Identifiants non configurés'
            }
          </div>
        </div>

        {isConnected ? (
          <button
            onClick={onDisconnect}
            style={{
              ...gmailCardStyles.connectBtn,
              background: '#FEE2E2', color: '#DC2626'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#FECACA'}
            onMouseLeave={e => e.currentTarget.style.background = '#FEE2E2'}
          >
            <Icon name="x" size={14} />
            Déconnecter
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={!isConfigured || !backendAlive}
            style={{
              ...gmailCardStyles.connectBtn,
              background: isConfigured && backendAlive ? '#111' : '#E5E7EB',
              color: isConfigured && backendAlive ? '#fff' : '#9CA3AF',
              cursor: isConfigured && backendAlive ? 'pointer' : 'not-allowed'
            }}
            onMouseEnter={e => { if (isConfigured && backendAlive) e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Icon name="mail" size={14} />
            Connecter Gmail
          </button>
        )}
      </div>

      {/* Status bar */}
      <div style={{
        ...gmailCardStyles.statusBar,
        background: isConnected ? '#F0FDF4' : (!backendAlive ? '#FEF2F2' : '#F9FAFB')
      }}>
        <div style={{
          ...gmailCardStyles.statusDot,
          background: isConnected ? '#22C55E' : (!backendAlive ? '#EF4444' : '#D1D5DB')
        }} />
        <span style={{ color: isConnected ? '#16A34A' : (!backendAlive ? '#DC2626' : '#6B7280'), fontWeight: 600 }}>
          {isConnected
            ? 'Connecté — les emails sont synchronisés'
            : !backendAlive
              ? 'Backend non disponible — lance: cd backend && npm run dev'
              : !isConfigured
                ? 'Configure backend/.env avec tes identifiants Google'
                : 'Non connecté — clique pour autoriser l\'accès'
          }
        </span>
      </div>

      {/* Connected: show profile */}
      {isConnected && gmailProfile && (
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--border-1)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          {gmailProfile.picture && (
            <img src={gmailProfile.picture} style={{ width: 28, height: 28, borderRadius: '50%' }} />
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>{gmailProfile.name}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{gmailProfile.email}</div>
          </div>
        </div>
      )}

      {/* Not configured: show setup steps */}
      {!isConfigured && backendAlive && (
        <div style={{
          padding: '16px 20px', borderTop: '1px solid var(--border-1)',
          fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.8
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--fg-0)' }}>⚡ Setup rapide :</div>
          <div>1. Va sur <strong>console.cloud.google.com</strong></div>
          <div>2. Crée un projet → Active l'<strong>API Gmail</strong></div>
          <div>3. Crée des identifiants <strong>OAuth 2.0</strong> (Application Web)</div>
          <div>4. URI de redirection : <code style={{ background: 'var(--bg-2)', padding: '2px 6px', borderRadius: 4 }}>http://localhost:3001/auth/google/callback</code></div>
          <div>5. Colle le Client ID & Secret dans <code style={{ background: 'var(--bg-2)', padding: '2px 6px', borderRadius: 4 }}>backend/.env</code></div>
          <div>6. Relance le backend → clique sur "Connecter Gmail"</div>
        </div>
      )}
    </div>
  );
}

function SettingsModal({ isOpen, onClose, onGmailStatusChange }) {
  const [activeTab, setActiveTab] = React.useState('Sources');
  const [gmailStatus, setGmailStatus] = React.useState(null);
  const [gmailProfile, setGmailProfile] = React.useState(null);
  const [backendAlive, setBackendAlive] = React.useState(false);
  const [enabledSources, setEnabledSources] = React.useState({
    'WhatsApp': true,
    'iMessage': false,
    'Snapchat': false,
    'Instagram': true,
    'Telegram': true,
    'TikTok': false,
    'Messenger': false
  });

  // Check Gmail status on mount and when modal opens
  React.useEffect(() => {
    if (!isOpen) return;
    checkGmailStatus();
  }, [isOpen]);

  async function checkGmailStatus() {
    if (!window.FreescaleGmail) return;

    const alive = await FreescaleGmail.isBackendAlive();
    setBackendAlive(alive);

    if (alive) {
      const status = await FreescaleGmail.getStatus();
      setGmailStatus(status);

      if (status.connected) {
        const profile = await FreescaleGmail.getProfile();
        setGmailProfile(profile);
      }
    }
  }

  function handleGmailConnect() {
    FreescaleGmail.connect();
  }

  async function handleGmailDisconnect() {
    await FreescaleGmail.disconnect();
    setGmailStatus({ configured: true, connected: false });
    setGmailProfile(null);
    if (onGmailStatusChange) onGmailStatusChange(false);
  }

  if (!isOpen) return null;

  const tabs = [
    { id: 'General', icon: 'settings', label: 'General' },
    { id: 'Sources', icon: 'hash', label: 'Sources & Intégrations' },
    { id: 'Plan', icon: 'zap', label: 'Choose plan' },
    { id: 'Security', icon: 'shield', label: 'Security' },
  ];

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div style={settingsStyles.overlay} onClick={onClose}>
      <div style={settingsStyles.card} onClick={e => e.stopPropagation()}>
        <div style={settingsStyles.header}>
           <div style={settingsStyles.headerTitle}>Settings</div>
           <button style={settingsStyles.closeBtn} onClick={onClose}>
              <Icon name="x" size={20} />
           </button>
        </div>
        <div style={settingsStyles.body}>
           <div style={settingsStyles.sidebar}>
              {tabs.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{ ...settingsStyles.navItem, ...(activeTab === t.id ? settingsStyles.navItemActive : {}) }}
                >
                  <Icon name={t.icon} size={16} color={activeTab === t.id ? 'var(--fg-0)' : 'var(--fg-3)'} />
                  {t.label}
                </button>
              ))}
           </div>
           <div style={settingsStyles.content}>
              {activeTab === 'Sources' && (
                <>
                  <div style={settingsStyles.viewHead}>
                     <Icon name="hash" size={24} color="var(--fg-0)" />
                     <div style={settingsStyles.viewTitle}>Sources & Intégrations</div>
                  </div>
                  <div style={settingsStyles.viewSub}>
                     Connecte tes outils pour centraliser tes communications.
                  </div>

                  {/* Gmail — REAL integration */}
                  <GmailConnectionCard
                    gmailStatus={gmailStatus}
                    gmailProfile={gmailProfile}
                    onConnect={handleGmailConnect}
                    onDisconnect={handleGmailDisconnect}
                    backendAlive={backendAlive}
                  />

                  {/* Other sources (coming soon) */}
                  {['WhatsApp', 'Instagram', 'Telegram', 'iMessage', 'Snapchat', 'TikTok', 'Messenger'].map(src => (
                    <div key={src} style={settingsStyles.settingRow}>
                      <div style={settingsStyles.settingInfo}>
                        <div style={settingsStyles.settingLabel}>{src}</div>
                        <div style={settingsStyles.settingDesc}>Bientôt disponible</div>
                      </div>
                      <div
                        onClick={() => setEnabledSources(prev => ({ ...prev, [src]: !prev[src] }))}
                        style={{ ...settingsStyles.toggle, ...(enabledSources[src] ? settingsStyles.toggleActive : {}), opacity: 0.4, pointerEvents: 'none' }}
                      >
                        <div style={{ ...settingsStyles.toggleThumb, ...(enabledSources[src] ? settingsStyles.toggleThumbActive : {}) }} />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {activeTab === 'General' && (
                <>
                  <div style={settingsStyles.viewHead}>
                     <Icon name="settings" size={24} color="var(--fg-0)" />
                     <div style={settingsStyles.viewTitle}>General</div>
                  </div>
                  <div style={settingsStyles.viewSub}>Paramètres généraux de Freescale.</div>
                  <div style={{ marginTop: 40, opacity: 0.3, textAlign: 'center' }}>
                     <div style={{ fontSize: 13, fontWeight: 600 }}>Bientôt disponible.</div>
                  </div>
                </>
              )}

              {activeTab === 'Plan' && (
                <>
                  <div style={settingsStyles.viewHead}>
                     <Icon name="zap" size={24} color="var(--fg-0)" />
                     <div style={settingsStyles.viewTitle}>Choose plan</div>
                  </div>
                  <div style={settingsStyles.viewSub}>Gère ton abonnement.</div>
                  <div style={{ marginTop: 40, opacity: 0.3, textAlign: 'center' }}>
                     <div style={{ fontSize: 13, fontWeight: 600 }}>Bientôt disponible.</div>
                  </div>
                </>
              )}

              {activeTab === 'Security' && (
                <>
                  <div style={settingsStyles.viewHead}>
                     <Icon name="shield" size={24} color="var(--fg-0)" />
                     <div style={settingsStyles.viewTitle}>Security</div>
                  </div>
                  <div style={settingsStyles.viewSub}>Sécurité et confidentialité.</div>
                  <div style={{ marginTop: 40, opacity: 0.3, textAlign: 'center' }}>
                     <div style={{ fontSize: 13, fontWeight: 600 }}>Bientôt disponible.</div>
                  </div>
                </>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

window.SettingsModal = SettingsModal;
