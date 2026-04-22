// Freescale — Channel Connector Modal (Inspired by user reference)
const connectorStyles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 3000,
    backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease'
  },
  card: {
    width: 600, background: '#fff', borderRadius: 32, padding: '40px 48px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)', position: 'relative',
    animation: 'modalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  },
  close: {
    position: 'absolute', top: 32, right: 32, cursor: 'pointer', color: '#111',
    border: 'none', background: 'none'
  },
  header: { textAlign: 'center', marginBottom: 48 },
  title: { fontSize: 28, fontWeight: 800, color: '#111', marginBottom: 12, letterSpacing: '-0.02em' },
  subtitle: { fontSize: 16, color: '#666', fontWeight: 500 },
  
  grid: { 
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px 40px' 
  },
  item: {
    display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'transform 0.2s'
  },
  iconBox: {
    width: 64, height: 64, borderRadius: 18, display: 'grid', placeItems: 'center', flex: 'none'
  },
  info: { display: 'flex', flexDirection: 'column', gap: 2 },
  name: { fontSize: 18, fontWeight: 750, color: '#111' },
  link: { fontSize: 14, color: '#3B82F6', fontWeight: 600 }
};

function ChannelConnectorModal({ isOpen, onClose, onConnect }) {
  if (!isOpen) return null;

  const channels = [
    { id: 'mail', name: 'Mail', color: '#3B82F6', icon: 'mail', bg: '#0EA5E9' },
    { id: 'discord', name: 'Discord', color: '#5865F2', icon: 'grid', bg: '#5865F2' },
    { id: 'instagram', name: 'Instagram', color: '#E4405F', icon: 'camera', bg: '#E4405F' },
    { id: 'messenger', name: 'Messenger', color: '#0084FF', icon: 'chat', bg: '#0084FF' },
    { id: 'slack', name: 'Slack', color: '#4A154B', icon: 'grid', bg: '#4A154B' },
    { id: 'whatsapp', name: 'WhatsApp', color: '#25D366', icon: 'chat', bg: '#25D366' },
  ];

  return (
    <div style={connectorStyles.overlay} onClick={onClose}>
      <div style={connectorStyles.card} onClick={e => e.stopPropagation()}>
        <button style={connectorStyles.close} onClick={onClose}>
           <Icon name="x" size={24} />
        </button>
        
        <div style={connectorStyles.header}>
           <div style={connectorStyles.title}>Connecter vos Canaux clients</div>
           <div style={connectorStyles.subtitle}>Connecter un canal pour importer vos liste d'ID clients</div>
        </div>

        <div style={connectorStyles.grid}>
           {channels.map(c => (
             <div key={c.id} style={connectorStyles.item} 
               onClick={() => onConnect && onConnect(c.id)}
               onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
               onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                <div style={{ ...connectorStyles.iconBox, background: c.bg }}>
                   <Icon name={c.icon} size={32} color="#fff" />
                </div>
                <div style={connectorStyles.info}>
                   <div style={connectorStyles.name}>{c.name}</div>
                   <div style={connectorStyles.link}>Connecter {c.name}</div>
                </div>
             </div>
           ))}
        </div>
      </div>
      
      <style>{`
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

window.ChannelConnectorModal = ChannelConnectorModal;
