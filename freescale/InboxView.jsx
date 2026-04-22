// Freescale — Inbox inspired by ManyChat
const inboxStyles = {
  wrap: { display: 'flex', height: '100%', padding: '0 24px 24px', gap: 16, background: 'transparent', boxSizing: 'border-box' },
  
  // List panel (Bento card)
  listPanel: { width: 320, flex: 'none', background: '#fff', borderRadius: 16, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-2)', overflow: 'hidden' },
  listHead: { padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 8, alignItems: 'center' },
  filterBtn: { padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, color: '#374151', background: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
  
  messages: { overflow: 'auto', flex: 1 },
  msgItem: {
    padding: '12px 16px', borderBottom: '1px solid #F8F9FA', cursor: 'pointer', transition: 'background 100ms',
    display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative'
  },
  msgActive: { background: '#F8F9FA' },
  
  avatar: { width: 44, height: 44, borderRadius: '50%', flex: 'none', overflow: 'hidden', background: '#F3F4F6', display: 'grid', placeItems: 'center' },
  msgInfo: { flex: 1, minWidth: 0 },
  msgFrom: { fontSize: 13.5, fontWeight: 700, color: '#111827', display: 'flex', justifyContent: 'space-between' },
  msgTime: { fontSize: 11, color: 'var(--accent)', fontWeight: 700 },
  msgPreview: { fontSize: 12.5, color: '#6B7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  unreadDot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', position: 'absolute', right: 16, top: '50%', marginTop: 2 },

  // Detail panel (Bento card)
  detailArea: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#fff', borderRadius: 16, border: '1px solid var(--border-2)', overflow: 'hidden' },
  detailHead: { padding: '12px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12 },
  detailActions: { marginLeft: 'auto', display: 'flex', gap: 16, color: '#9CA3AF' },
  
  scrollArea: { flex: 1, overflow: 'auto', padding: '24px 32px' },
  conversationWrap: { display: 'flex', flexDirection: 'column', gap: 24 },
  
  dateDivider: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', margin: '8px 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  
  msgRow: { display: 'flex', gap: 12, alignItems: 'flex-end', maxWidth: '85%' },
  rowReceived: { alignSelf: 'flex-start' },
  rowSent: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  
  bubble: { padding: '12px 18px', borderRadius: 18, fontSize: 14, lineHeight: 1.5 },
  bubbleReceived: { background: '#F3F4F6', color: '#111827', borderRadius: '4px 18px 18px 18px' },
  bubbleSent: { background: '#EBF5FF', color: '#111827', border: '1px solid #D1E9FF', borderRadius: '18px 18px 4px 18px' },
  
  replySection: { 
    borderTop: '1px solid #F3F4F6', padding: '16px 24px', background: '#fff'
  },
  replyTabs: { display: 'flex', gap: 20, marginBottom: 12, borderBottom: '1px solid #F3F4F6' },
  replyTab: { paddingBottom: 8, fontSize: 13, fontWeight: 700, color: '#111827', borderBottom: '2px solid transparent', cursor: 'pointer' },
  replyTabActive: { color: 'var(--accent)', borderBottom: '2px solid var(--accent)' },
  
  replyInputWrap: { background: '#F9FAFB', borderRadius: 12, padding: 12, border: '1px solid #E5E7EB' },
  replyText: { 
    width: '100%', border: 'none', background: 'transparent', resize: 'none', outline: 'none',
    fontSize: 14, color: '#111827', minHeight: 60
  },
  replyActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  sendBtn: {
    padding: '8px 20px', borderRadius: 8, background: '#000', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer'
  }
};

function InboxView({ messages, clients, sources, activeClientId, acceptedTasks, onAcceptTask, onDismissTask }) {
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
  const srcMap = Object.fromEntries(sources.map(s => [s.id, s]));
  const active = messages.find(m => m.clientId === activeClientId) || messages[0];
  const activeClient = clientMap[active.clientId];
  const activeSrc = srcMap[active.source];

  return (
    <div style={inboxStyles.wrap}>
      {/* Detail Column (plein écran) */}
      <div style={inboxStyles.detailArea}>
        <div style={inboxStyles.detailHead}>
          <div style={{ ...inboxStyles.avatar, width: 32, height: 32 }}>
            {activeClient?.avatarUrl ? (
              <img src={activeClient.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ fontSize: 12, fontWeight: 700 }}>{activeClient?.avatar || active.from[0]}</div>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{active.from}</div>
          {active.fromEmail && <div style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>&lt;{active.fromEmail}&gt;</div>}
          <Icon name="chevronDown" size={12} color="#6B7280" />
          
          <div style={inboxStyles.detailActions}>
             <Icon name="clock" size={16} />
             <Icon name="check" size={16} />
             <Icon name="plus" size={16} />
             <Icon name="more" size={16} />
          </div>
        </div>

        <div style={inboxStyles.scrollArea}>
          <div style={inboxStyles.dateDivider}>13 Mar 2026, 13:50</div>
          
          <div style={inboxStyles.conversationWrap}>
             {/* Received (Placeholder previous) */}
             <div style={{ ...inboxStyles.msgRow, ...inboxStyles.rowReceived, position: 'relative' }} className="msg-bubble-group">
                <div style={{ ...inboxStyles.avatar, width: 28, height: 28 }}>
                  {activeClient?.avatarUrl ? <img src={activeClient.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div>{active.from[0]}</div>}
                </div>
                <div style={{ ...inboxStyles.bubble, ...inboxStyles.bubbleReceived }}>
                  Hello, j'ai bien reçu ton message. Voici ce qu'il en est...
                </div>
             </div>

             {/* Sent (Placeholder) */}
             <div style={{ ...inboxStyles.msgRow, ...inboxStyles.rowSent }}>
                <div style={{ ...inboxStyles.bubble, ...inboxStyles.bubbleSent }}>
                   Ok, je regarde ça tout de suite.
                </div>
             </div>

             {/* Dynamic Current Message */}
             <div style={{ ...inboxStyles.msgRow, ...inboxStyles.rowReceived, position: 'relative' }} className="msg-bubble-group">
                <div style={{ ...inboxStyles.avatar, width: 28, height: 28 }}>
                   {activeClient?.avatarUrl ? <img src={activeClient.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div>{active.from[0]}</div>}
                </div>
                <div style={{ ...inboxStyles.bubble, ...inboxStyles.bubbleReceived }}>
                   {active.subject && <div style={{ fontWeight: 800, marginBottom: 4 }}>{active.subject}</div>}
                   {active.body}
                </div>
                <div className="magic-action" style={{ position: 'absolute', right: -32, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--accent)', opacity: 0.6 }}>
                  <Icon name="sparkles" size={16} />
                </div>
             </div>
          </div>
        </div>

        <div style={inboxStyles.replySection}>
          <div style={inboxStyles.replyTabs}>
             <div style={{ ...inboxStyles.replyTab, ...inboxStyles.replyTabActive }}>Reply</div>
             <div style={inboxStyles.replyTab}>Note</div>
          </div>
          <div style={inboxStyles.replyInputWrap}>
             <textarea style={inboxStyles.replyText} placeholder="Type your message here..."></textarea>
             <div style={inboxStyles.replyActions}>
                <button style={inboxStyles.sendBtn}>Send</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.InboxView = InboxView;
