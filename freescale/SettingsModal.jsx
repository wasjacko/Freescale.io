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

function GmailConfigFlow({ status, backendAlive }) {
   const isConnected = status?.connected;
   const isConfigured = status?.configured;

   return (
     <div style={{ padding: 16, background: '#fff', borderRadius: 12, border: '1px solid var(--border-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
           <div style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#22C55E' : (!backendAlive ? '#EF4444' : '#D1D5DB') }} />
           <span style={{ fontSize: 13, fontWeight: 700 }}>
              {isConnected ? 'Compte Gmail Synchronisé' : (!backendAlive ? 'Erreur: Backend non détecté' : 'Configuration requise')}
           </span>
        </div>
        
        {!isConfigured && backendAlive && (
          <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--fg-0)' }}>⚡ Setup rapide :</div>
            <div>• URI de redirection : <code style={{ background: 'var(--bg-2)', padding: '2px 4px', borderRadius: 4 }}>http://localhost:3001/auth/google/callback</code></div>
            <div>• Colle le Client ID & Secret dans <code style={{ background: 'var(--bg-2)', padding: '2px 4px', borderRadius: 4 }}>backend/.env</code></div>
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
           {isConnected ? (
             <button onClick={() => FreescaleGmail.disconnect()} style={{ padding: '8px 16px', background: '#FEE2E2', color: '#D93025', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Déconnecter</button>
           ) : (
             <button onClick={() => FreescaleGmail.connect()} disabled={!isConfigured || !backendAlive} style={{ padding: '8px 24px', background: isConfigured && backendAlive ? '#111' : '#E5E7EB', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Autoriser l'accès</button>
           )}
        </div>
     </div>
   );
}

function IntegrationCard({ id, name, icon, color, bg, status, onAction, profile, backendAlive }) {
    const isSoon = status === 'soon';
    return (
        <div style={{ 
            padding: 20, background: '#fff', borderRadius: 20, border: '1px solid var(--border-1)',
            display: 'flex', flexDirection: 'column', gap: 16, opacity: isSoon ? 0.6 : 1,
            transition: 'all 0.2s', cursor: isSoon ? 'default' : 'pointer'
        }}
        onClick={() => !isSoon && onAction()}
        onMouseEnter={e => { if(!isSoon) e.currentTarget.style.borderColor = color; }}
        onMouseLeave={e => { if(!isSoon) e.currentTarget.style.borderColor = 'var(--border-1)'; }}
        >
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, background: bg, borderRadius: 12, display: 'grid', placeItems: 'center' }}>
                 <Icon name={icon} size={22} color={color} />
              </div>
              <div style={{ 
                  fontSize: 10, fontWeight: 850, padding: '4px 8px', borderRadius: 6, 
                  background: status === 'connected' ? '#DCFCE7' : (status === 'soon' ? '#F3F4F6' : '#F9731615'), 
                  color: status === 'connected' ? '#166534' : (status === 'soon' ? '#6B7280' : color),
                  textTransform: 'uppercase'
              }}>
                {status === 'connected' ? 'Connecté' : (status === 'soon' ? 'Bientôt' : (status === 'available' ? 'Connecter' : 'Setup'))}
              </div>
           </div>
           <div>
              <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--fg-0)' }}>{name}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
                 {profile ? profile.email : `Synchronise tes flux ${name}`}
              </div>
           </div>
        </div>
    );
}

function SettingsModal({ isOpen, onClose, onGmailStatusChange }) {
  const [activeTab, setActiveTab] = React.useState('Sources');
  const [gmailStatus, setGmailStatus] = React.useState(null);
  const [gmailProfile, setGmailProfile] = React.useState(null);
  const [backendAlive, setBackendAlive] = React.useState(false);
  const [activeIntegration, setActiveIntegration] = React.useState(null);
  const [enabledSources, setEnabledSources] = React.useState({
    'WhatsApp': true,
    'Instagram': true,
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
                  <div style={settingsStyles.viewSub}>
                     Connecte tes outils pour centraliser tes communications et automatiser tes tâches.
                  </div>

                  {/* WhatsApp Business Section */}
                  <div style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border-2)', background: 'var(--bg-2)', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <img src="assets/channels/whatsapp.svg" width="32" height="32" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>WhatsApp Business (Meta)</div>
                        <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>Connectez votre compte officiel via l'API Cloud de Meta</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--fg-2)', marginBottom: 4, textTransform: 'uppercase' }}>Phone Number ID</label>
                        <input 
                          type="text" 
                          placeholder="Ex: 1092837465..."
                          defaultValue={localStorage.getItem('whatsapp_phone_id') || ''}
                          onChange={(e) => localStorage.setItem('whatsapp_phone_id', e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-1)', background: 'var(--bg-1)', color: 'var(--fg-0)', fontSize: 13 }} 
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--fg-2)', marginBottom: 4, textTransform: 'uppercase' }}>Permanent Access Token</label>
                        <input 
                          type="password" 
                          placeholder="EAAB..."
                          defaultValue={localStorage.getItem('whatsapp_token') || ''}
                          onChange={(e) => localStorage.setItem('whatsapp_token', e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-1)', background: 'var(--bg-1)', color: 'var(--fg-0)', fontSize: 13 }} 
                        />
                      </div>
                      <button 
                        onClick={() => {
                          showToast('WhatsApp config sauvegardée localement. Assurez-vous de relancer le backend avec ces clés dans .env');
                        }}
                        style={{ alignSelf: 'flex-start', padding: '8px 16px', borderRadius: 8, background: 'var(--accent-primary)', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                        Tester la connexion
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                     <IntegrationCard 
                        id="gmail" name="Gmail" icon="mail" color="#D93025" bg="#FCE8E6"
                        status={gmailStatus?.connected ? 'connected' : (gmailStatus?.configured ? 'available' : 'setup')}
                        onAction={() => gmailStatus?.connected ? handleGmailDisconnect() : setActiveIntegration({ id: 'gmail', name: 'Gmail', icon: 'mail', color: '#D93025', bg: '#FCE8E6' })}
                        profile={gmailProfile}
                        backendAlive={backendAlive}
                     />

                     <IntegrationCard 
                        id="whatsapp" name="WhatsApp" icon="chat" color="#25D366" bg="#DCF8C6"
                        status={enabledSources['WhatsApp'] ? 'connected' : 'available'}
                        onAction={() => enabledSources['WhatsApp'] ? setEnabledSources(prev => ({ ...prev, 'WhatsApp': false })) : setActiveIntegration({ id: 'whatsapp', name: 'WhatsApp', icon: 'chat', color: '#25D366', bg: '#DCF8C6' })}
                     />

                     <IntegrationCard 
                        id="instagram" name="Instagram" icon="camera" color="#E4405F" bg="#FDECF0"
                        status={enabledSources['Instagram'] ? 'connected' : 'available'}
                        onAction={() => enabledSources['Instagram'] ? setEnabledSources(prev => ({ ...prev, 'Instagram': false })) : setActiveIntegration({ id: 'instagram', name: 'Instagram', icon: 'camera', color: '#E4405F', bg: '#FDECF0' })}
                     />

                     {['Telegram', 'iMessage', 'Slack', 'Discord'].map(s => (
                        <IntegrationCard key={s} id={s.toLowerCase()} name={s} icon="grid" color="#999" bg="#F3F4F6" status="soon" />
                     ))}
                   </div>

                   {activeIntegration && (
                     <div style={{ marginTop: 40, padding: 24, border: '1px solid var(--border-1)', borderRadius: 16, background: '#F9FAFB' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 32, height: 32, background: activeIntegration.bg, borderRadius: 8, display: 'grid', placeItems: 'center' }}>
                            <Icon name={activeIntegration.icon} size={16} color={activeIntegration.color} />
                          </div>
                          <div style={{ fontWeight: 700 }}>Configuration {activeIntegration.name}</div>
                          <button onClick={() => setActiveIntegration(null)} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--fg-3)' }}><Icon name="x" size={14} /></button>
                        </div>
                        {activeIntegration.id === 'gmail' ? (
                          <GmailConfigFlow status={gmailStatus} backendAlive={backendAlive} />
                        ) : (
                          <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 20 }}>
                              Pour connecter {activeIntegration.name}, scannez le QR code avec votre application mobile.
                            </div>
                            <div style={{ width: 140, height: 140, margin: '0 auto', background: '#fff', border: '8px solid #fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'grid', placeItems: 'center' }}>
                               <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=freescale_${activeIntegration.id}`} width="120" height="120" style={{ opacity: 0.8 }} />
                            </div>
                            <div style={{ marginTop: 20, fontSize: 11, fontWeight: 700, color: '#D93025', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              En attente de connexion...
                            </div>
                          </div>
                        )}
                     </div>
                   )}
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
