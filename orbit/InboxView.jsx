// Orbit — Inbox unifiée with Task Extractor (signature feature)
const inboxStyles = {
  wrap: { display: 'grid', gridTemplateColumns: '360px 1fr', height: '100%', minHeight: 0 },
  list: { borderRight: '1px solid var(--border-1)', display: 'flex', flexDirection: 'column', background: 'var(--bg-1)' },
  listHead: {
    padding: '14px 16px', borderBottom: '1px solid var(--border-1)',
    display: 'flex', alignItems: 'center', gap: 10, flex: 'none'
  },
  tabs: { display: 'flex', gap: 2, padding: '8px 10px', borderBottom: '1px solid var(--border-1)', flex: 'none' },
  tab: {
    padding: '5px 9px', borderRadius: 6, fontSize: 12, fontWeight: 500, color: 'var(--fg-2)'
  },
  tabActive: { background: 'var(--bg-2)', color: 'var(--fg-0)', fontWeight: 600 },
  messages: { overflow: 'auto', flex: 1 },
  msgItem: {
    display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10, padding: '14px 16px',
    borderBottom: '1px solid var(--border-1)', cursor: 'pointer', position: 'relative'
  },
  msgActive: { background: 'var(--bg-hover)' },
  unreadBar: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 3, borderRadius: '0 2px 2px 0', background: 'var(--accent)' },
  srcChip: {
    position: 'absolute', bottom: -3, right: -3, width: 14, height: 14, borderRadius: 4,
    display: 'grid', placeItems: 'center', border: '1.5px solid var(--bg-1)'
  },
  avatar: {
    width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center',
    color: '#fff', fontSize: 12, fontWeight: 600, position: 'relative'
  },
  msgHead: { display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 },
  msgFrom: { fontSize: 13.5, fontWeight: 600, color: 'var(--fg-0)' },
  msgTime: { marginLeft: 'auto', fontSize: 11, color: 'var(--fg-3)' },
  msgClient: { fontSize: 11, color: 'var(--fg-2)', marginBottom: 4 },
  msgPreview: { fontSize: 12.5, color: 'var(--fg-1)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  aiTag: {
    display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '2px 7px',
    borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent-ink)',
    fontSize: 10.5, fontWeight: 600
  },

  detail: { display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' },
  detailHead: {
    padding: '18px 24px', borderBottom: '1px solid var(--border-1)',
    display: 'flex', alignItems: 'center', gap: 12
  },
  detailAv: { width: 40, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 14, fontWeight: 600 },
  detailBody: { padding: '22px 24px', overflow: 'auto', flex: 1 },
  msgBubble: {
    background: 'var(--bg-2)', padding: 18, borderRadius: 12, fontSize: 14, color: 'var(--fg-0)',
    lineHeight: 1.65, maxWidth: 720
  },

  extractCard: {
    marginTop: 20, border: '1px solid var(--border-2)', borderRadius: 14, overflow: 'hidden',
    background: 'var(--bg-1)', maxWidth: 720,
    position: 'relative'
  },
  extractHead: {
    padding: '14px 18px', background: 'linear-gradient(180deg, var(--accent-soft) 0%, transparent 100%)',
    display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-1)'
  },
  sparkleBadge: {
    width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), #8D6DF6)',
    color: '#fff', display: 'grid', placeItems: 'center'
  },
  extractTitle: { fontSize: 13.5, fontWeight: 600, color: 'var(--fg-0)' },
  extractSub: { fontSize: 11.5, color: 'var(--fg-2)' },
  taskCard: {
    padding: '14px 18px', borderTop: '1px solid var(--border-1)',
    display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center'
  },
  taskName: { fontSize: 13.5, fontWeight: 500, color: 'var(--fg-0)', marginBottom: 5 },
  taskChips: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11 },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999,
    background: 'var(--bg-2)', color: 'var(--fg-1)', fontSize: 11
  },
  confidence: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--fg-2)' },
  confBar: { width: 36, height: 4, borderRadius: 2, background: 'var(--bg-2)', overflow: 'hidden' },
  confFill: { height: '100%', background: 'var(--accent)' },
  confTxt: { fontFamily: 'var(--font-mono)' },
  taskActions: { display: 'flex', gap: 6 },
  taskBtn: {
    padding: '6px 11px', borderRadius: 7, fontSize: 12, fontWeight: 600,
    background: 'var(--bg-2)', color: 'var(--fg-1)'
  },
  taskBtnAccept: { background: 'var(--fg-0)', color: 'var(--bg-1)' },

  reply: { padding: 16, borderTop: '1px solid var(--border-1)', flex: 'none' },
  replyBox: { border: '1px solid var(--border-2)', borderRadius: 12, background: 'var(--bg-1)' },
  replyField: {
    width: '100%', border: 0, padding: '12px 14px', fontSize: 13.5, color: 'var(--fg-0)',
    background: 'transparent', resize: 'none', outline: 'none', fontFamily: 'inherit', minHeight: 56
  },
  replyBar: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px 8px 14px',
    borderTop: '1px solid var(--border-1)', background: 'var(--bg-0)', borderRadius: '0 0 11px 11px'
  },
  replyHint: { fontSize: 11, color: 'var(--fg-3)', flex: 1, display: 'flex', alignItems: 'center', gap: 6 },
  replySend: {
    padding: '7px 14px', borderRadius: 7, background: 'var(--accent)', color: '#fff',
    fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5
  },
  suggestBtn: {
    padding: '5px 10px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent-ink)',
    fontSize: 11.5, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4
  }
};

function InboxView({ messages, clients, sources, activeMessageId, onSelectMessage, acceptedTasks, onAcceptTask, onDismissTask }) {
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
  const srcMap = Object.fromEntries(sources.map(s => [s.id, s]));
  const active = messages.find(m => m.id === activeMessageId) || messages[0];
  const activeClient = clientMap[active.clientId];
  const activeSrc = srcMap[active.source];

  const [tab, setTab] = React.useState('all');
  const filtered = tab === 'unread' ? messages.filter(m => m.unread) : messages;

  return (
    <div style={inboxStyles.wrap}>
      <div style={inboxStyles.list}>
        <div style={inboxStyles.listHead}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg-0)' }}>Inbox unifiée</div>
          <span style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>7 non lus</span>
        </div>
        <div style={inboxStyles.tabs}>
          {[['all', 'Tous'], ['unread', 'Non lus'], ['mentions', 'Mentions'], ['billable', 'Facturable']].map(([id, lbl]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ ...inboxStyles.tab, ...(tab === id ? inboxStyles.tabActive : {}) }}>{lbl}</button>
          ))}
        </div>
        <div style={inboxStyles.messages}>
          {filtered.map(m => {
            const c = clientMap[m.clientId];
            const s = srcMap[m.source];
            const isActive = m.id === active.id;
            return (
              <div key={m.id} onClick={() => onSelectMessage(m.id)}
                style={{ ...inboxStyles.msgItem, ...(isActive ? inboxStyles.msgActive : {}) }}>
                {m.unread && <div style={inboxStyles.unreadBar}></div>}
                <div style={{ ...inboxStyles.avatar, background: c.color }}>
                  {m.from.split(' ').map(p => p[0]).slice(0, 2).join('')}
                  <div style={{ ...inboxStyles.srcChip, background: s.soft, color: s.color }}>
                    <Icon name={s.glyph} size={8} />
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={inboxStyles.msgHead}>
                    <div style={inboxStyles.msgFrom}>{m.from}</div>
                    <div style={inboxStyles.msgTime}>{m.time}</div>
                  </div>
                  <div style={inboxStyles.msgClient}>{c.name} {m.channel && `· ${m.channel}`}</div>
                  <div style={inboxStyles.msgPreview}>{m.body}</div>
                  {m.extractedTasks?.length > 0 && (
                    <div style={inboxStyles.aiTag}>
                      <Icon name="sparkles" size={10} /> {m.extractedTasks.length} tâche{m.extractedTasks.length > 1 ? 's' : ''} détectée{m.extractedTasks.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={inboxStyles.detail}>
        <div style={inboxStyles.detailHead}>
          <div style={{ ...inboxStyles.detailAv, background: activeClient.color }}>
            {active.from.split(' ').map(p => p[0]).slice(0, 2).join('')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-0)' }}>{active.from} <span style={{ fontWeight: 400, color: 'var(--fg-2)', fontSize: 13 }}>· {active.role}</span></div>
            <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: activeClient.color }}></span>
              {activeClient.name}
              <span>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: activeSrc.color }}>
                <Icon name={activeSrc.glyph} size={11} /> {activeSrc.label} {active.channel && `· ${active.channel}`}
              </span>
              <span>·</span>
              <span>{active.time}</span>
            </div>
          </div>
          <button style={{ padding: '7px 11px', borderRadius: 7, fontSize: 12, background: 'var(--bg-2)', color: 'var(--fg-1)' }}>
            <Icon name="link" size={11} /> Lier à un client
          </button>
          <button style={{ padding: 7, borderRadius: 7, color: 'var(--fg-2)' }}><Icon name="more" size={15} /></button>
        </div>

        <div style={inboxStyles.detailBody}>
          <div style={inboxStyles.msgBubble}>{active.body}</div>

          {active.extractedTasks?.length > 0 && (
            <div style={inboxStyles.extractCard}>
              <div style={inboxStyles.extractHead}>
                <div style={inboxStyles.sparkleBadge}><Icon name="sparkles" size={14} color="#fff" /></div>
                <div style={{ flex: 1 }}>
                  <div style={inboxStyles.extractTitle}>
                    Le copilote a identifié {active.extractedTasks.length} tâche{active.extractedTasks.length > 1 ? 's' : ''} dans ce message
                  </div>
                  <div style={inboxStyles.extractSub}>Vérifie, ajuste, puis ajoute à ton planning. Les tâches refusées améliorent le modèle.</div>
                </div>
                <button style={{ fontSize: 11.5, color: 'var(--fg-2)', padding: '5px 9px' }}>Ajuster →</button>
              </div>
              {active.extractedTasks.map(t => {
                const accepted = acceptedTasks.includes(t.id);
                return (
                  <div key={t.id} style={{ ...inboxStyles.taskCard, opacity: accepted ? 0.6 : 1 }}>
                    <div>
                      <div style={inboxStyles.taskName}>
                        {accepted && <Icon name="check" size={13} color="var(--ok)" />} {t.title}
                      </div>
                      <div style={inboxStyles.taskChips}>
                        <span style={inboxStyles.chip}><Icon name="calendar" size={10} /> {t.due}</span>
                        <span style={inboxStyles.chip}><Icon name="clock" size={10} /> {t.est}</span>
                        <PriorityBadge priority={t.priority} />
                        {t.billable && <span style={{ ...inboxStyles.chip, background: 'var(--ok-soft)', color: 'var(--ok)' }}>Facturable</span>}
                        {t.deal && <span style={{ ...inboxStyles.chip, background: 'var(--info-soft)', color: 'var(--info)' }}>Deal</span>}
                        <span style={inboxStyles.confidence}>
                          <span style={inboxStyles.confBar}>
                            <div style={{ ...inboxStyles.confFill, width: `${t.confidence * 100}%` }}></div>
                          </span>
                          <span style={inboxStyles.confTxt}>{Math.round(t.confidence * 100)}%</span>
                        </span>
                      </div>
                    </div>
                    <div style={inboxStyles.taskActions}>
                      {!accepted ? (
                        <>
                          <button style={inboxStyles.taskBtn} onClick={() => onDismissTask(t.id)}>Ignorer</button>
                          <button style={{ ...inboxStyles.taskBtn, ...inboxStyles.taskBtnAccept }} onClick={() => onAcceptTask(t.id)}>
                            <Icon name="plus" size={11} /> Ajouter
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: 11.5, color: 'var(--ok)', fontWeight: 600 }}>Ajoutée au planning ✓</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={inboxStyles.reply}>
          <div style={inboxStyles.replyBox}>
            <textarea style={inboxStyles.replyField} placeholder={`Répondre à ${active.from}…`} defaultValue=""></textarea>
            <div style={inboxStyles.replyBar}>
              <div style={inboxStyles.replyHint}>
                <span style={inboxStyles.suggestBtn}><Icon name="sparkles" size={10} /> Proposer une réponse</span>
                <span style={{ ...inboxStyles.suggestBtn, background: 'var(--bg-2)', color: 'var(--fg-2)' }}>+ Rappel</span>
              </div>
              <button style={inboxStyles.replySend}>
                <Icon name="send" size={12} /> Envoyer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.InboxView = InboxView;
