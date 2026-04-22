// Orbit — Settings Modal
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

function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = React.useState('WhatsApp');
  const [enabledSources, setEnabledSources] = React.useState({
    'WhatsApp': true,
    'iMessage': false,
    'Snapchat': false,
    'Instagram': true,
    'Telegram': true,
    'TikTok': false,
    'Messenger': false
  });

  if (!isOpen) return null;

  const tabs = [
    { id: 'General', icon: 'settings', label: 'General' },
    { id: 'Plan', icon: 'zap', label: 'Choose plan' },
    { id: 'Sources', icon: 'hash', label: 'Sources' },
    { id: 'Security', icon: 'shield', label: 'Security' },
    { sep: true },
    { id: 'iMessage', icon: 'message-square', color: '#31C35E', label: 'iMessage' },
    { id: 'WhatsApp', icon: 'message-circle', color: '#25D366', label: 'WhatsApp' },
    { id: 'Snapchat', icon: 'camera', color: '#FFFC00', label: 'Snapchat' },
    { id: 'Instagram', icon: 'instagram', color: '#E4405F', label: 'Instagram' },
    { id: 'Telegram', icon: 'send', color: '#0088CC', label: 'Telegram' },
    { id: 'TikTok', icon: 'video', color: '#000000', label: 'TikTok' },
    { id: 'Messenger', icon: 'message-circle', color: '#0084FF', label: 'Messenger' }
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
                t.sep ? (
                  <div key={i} style={settingsStyles.navSep} />
                ) : (
                  <button 
                    key={t.id} 
                    onClick={() => setActiveTab(t.id)}
                    style={{ ...settingsStyles.navItem, ...(activeTab === t.id ? settingsStyles.navItemActive : {}) }}
                  >
                    <Icon name={t.icon} size={16} color={t.color || (activeTab === t.id ? 'var(--fg-0)' : 'var(--fg-3)')} />
                    {t.label}
                  </button>
                )
              ))}
           </div>
           <div style={settingsStyles.content}>
              <div style={settingsStyles.viewHead}>
                 <Icon name={currentTab?.icon} size={24} color={currentTab?.color || 'var(--fg-0)'} />
                 <div style={settingsStyles.viewTitle}>{activeTab}</div>
              </div>
              <div style={settingsStyles.viewSub}>
                 Connection to the local {activeTab} database.
              </div>

              <div style={settingsStyles.settingRow}>
                 <div style={settingsStyles.settingInfo}>
                    <div style={settingsStyles.settingLabel}>Enable {activeTab}</div>
                 </div>
                 <div 
                    onClick={() => setEnabledSources(prev => ({ ...prev, [activeTab]: !prev[activeTab] }))}
                    style={{ ...settingsStyles.toggle, ...(enabledSources[activeTab] ? settingsStyles.toggleActive : {}) }}
                 >
                    <div style={{ ...settingsStyles.toggleThumb, ...(enabledSources[activeTab] ? settingsStyles.toggleThumbActive : {}) }} />
                 </div>
              </div>

              {/* Placeholder for other settings */}
              <div style={{ marginTop: 40, opacity: 0.3, textAlign: 'center' }}>
                 <div style={{ fontSize: 13, fontWeight: 600 }}>Plus de réglages pour {activeTab} bientôt.</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

window.SettingsModal = SettingsModal;
