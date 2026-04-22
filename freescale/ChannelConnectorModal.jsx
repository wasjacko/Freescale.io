// Freescale — Channel Connector Modal (Refined)
const connectorStyles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 3000,
    backdropFilter: 'blur(12px)', animation: 'fadeIn 0.3s ease'
  },
  card: {
    width: 580, background: '#fff', borderRadius: 28, padding: '48px 40px',
    boxShadow: '0 30px 100px rgba(0,0,0,0.15)', position: 'relative',
    animation: 'modalPop 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  close: {
    position: 'absolute', top: 28, right: 28, cursor: 'pointer', color: '#CBD5E1',
    border: 'none', background: 'none', padding: 8, transition: 'color 0.2s'
  },
  header: { textAlign: 'center', marginBottom: 44 },
  title: { fontSize: 26, fontWeight: 800, color: '#111', marginBottom: 12, letterSpacing: '-0.03em' },
  subtitle: { fontSize: 16, color: '#64748B', fontWeight: 500, maxWidth: 400, margin: '0 auto', lineHeight: 1.5 },
  
  grid: { 
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' 
  },
  item: {
    padding: '24px', borderRadius: 20, border: '1px solid #F1F5F9',
    display: 'flex', flexDirection: 'column', gap: 16, cursor: 'pointer',
    transition: 'all 0.2s ease', background: '#FAFBFC'
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 12, display: 'grid', placeItems: 'center', flex: 'none',
    background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  info: { display: 'flex', flexDirection: 'column', gap: 2 },
  name: { fontSize: 16, fontWeight: 750, color: '#111' },
  link: { fontSize: 13, color: '#3B82F6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }
};

function ChannelConnectorModal({ isOpen, onClose, onConnect }) {
  if (!isOpen) return null;

  const channels = [
    { id: 'gmail',     name: 'Gmail',     logo: 'assets/channels/gmail.svg' },
    { id: 'whatsapp',  name: 'WhatsApp',  logo: 'assets/channels/whatsapp.svg' },
    { id: 'instagram', name: 'Instagram', logo: 'assets/channels/instagram.svg' },
  ];

  return (
    <div style={connectorStyles.overlay} onClick={onClose}>
      <div style={connectorStyles.card} onClick={e => e.stopPropagation()}>
        <button 
          style={connectorStyles.close} 
          onClick={onClose}
          onMouseEnter={e => e.currentTarget.style.color = '#000'}
          onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
           <Icon name="x" size={20} />
        </button>
        
        <div style={connectorStyles.header}>
           <div style={connectorStyles.title}>Connecter vos Canaux</div>
           <div style={connectorStyles.subtitle}>Pour importer vos contacts et commencer à synchroniser vos messages.</div>
        </div>

        <div style={connectorStyles.grid}>
           {channels.map(c => (
             <div key={c.id} style={connectorStyles.item} 
               onClick={() => onConnect && onConnect(c.id)}
               onMouseEnter={e => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.04)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
               }}
               onMouseLeave={e => {
                  e.currentTarget.style.background = '#FAFBFC';
                  e.currentTarget.style.borderColor = '#F1F5F9';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
               }}>
                <div style={connectorStyles.iconBox}>
                   <img src={c.logo} alt={c.name} width="28" height="28" />
                </div>
                <div style={connectorStyles.info}>
                   <div style={connectorStyles.name}>{c.name}</div>
                   <div style={connectorStyles.link}>
                     Connecter {c.name} <Icon name="arrow-right" size={12} />
                   </div>
                </div>
             </div>
           ))}
        </div>
      </div>
      
      <style>{`
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
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
