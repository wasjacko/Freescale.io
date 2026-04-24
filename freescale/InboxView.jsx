// Freescale — Inbox: full email thread + attachments + AI assistant
const inboxStyles = {
  wrap: { display: 'flex', height: '100%', padding: '0 24px 24px', gap: 16, background: 'transparent', boxSizing: 'border-box' },

  main:    { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#fff', borderRadius: 16, border: '1px solid var(--border-2)', overflow: 'hidden' },
  aiPanel: { width: 320, flex: 'none', background: '#fff', border: '1px solid var(--border-2)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' },

  head: { padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12, flex: 'none' },
  avatar: { width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: '#F3F4F6', display: 'grid', placeItems: 'center', flex: 'none' },

  scroll: { flex: 1, overflowY: 'auto', padding: '20px 28px', background: '#FAFAFB' },

  // Email card
  email: { background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  emailHead: { padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' },
  emailBody: { padding: '4px 18px 18px', fontSize: 13.5, lineHeight: 1.6, color: '#111827', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  emailSubject: { fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 10, padding: '0 18px' },

  sentBadge: { padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: 'var(--bg-2)', color: 'var(--fg-1)' },
  receivedBadge: { padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: 'var(--bg-2)', color: 'var(--fg-2)' },

  attachRow: { padding: '10px 18px 14px', display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid #F3F4F6' },
  attachChip: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 10px', borderRadius: 8, background: '#F9FAFB',
    border: '1px solid #E5E7EB', fontSize: 12, color: '#111', textDecoration: 'none',
    cursor: 'pointer'
  },

  // Composer
  composer: { borderTop: '1px solid #F3F4F6', padding: '12px 20px', background: '#fff', flex: 'none' },
  composerField: {
    background: '#F9FAFB', borderRadius: 10, padding: 12, border: '1px solid #E5E7EB',
    display: 'flex', flexDirection: 'column', gap: 8
  },
  composerText: {
    width: '100%', border: 'none', background: 'transparent', resize: 'none', outline: 'none',
    fontSize: 14, color: '#111', minHeight: 80, fontFamily: 'inherit'
  },
  composerBar: { display: 'flex', alignItems: 'center', gap: 8 },
  iconBtn: {
    padding: '6px 8px', borderRadius: 8, background: 'transparent', border: '1px solid #E5E7EB',
    color: '#6B7280', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600
  },
  sendBtn: {
    padding: '8px 16px', borderRadius: 8, background: '#111', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6
  },

  // AI panel
  aiHead: { padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10, flex: 'none' },
  aiBadge: {
    width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), #f97316)',
    display: 'grid', placeItems: 'center', flex: 'none'
  },
  aiActions: { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 'none' },
  aiBtn: {
    padding: '10px 12px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB',
    color: '#111', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
    display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit', transition: 'background 120ms, border-color 120ms'
  },
  aiBtnIcon: { width: 24, height: 24, borderRadius: 6, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none' },
  aiOutput: { flex: 1, overflowY: 'auto', padding: '14px 16px', fontSize: 13, lineHeight: 1.55, color: '#1F2937' }
};

// Simple markdown-ish renderer (bullets, bold, line breaks)
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const out = [];
  let inList = false, buf = [];
  const flush = () => { if (buf.length) { out.push(<ul key={out.length} style={{ margin: '4px 0 8px', paddingLeft: 18 }}>{buf}</ul>); buf = []; inList = false; } };
  lines.forEach((l, i) => {
    const line = l.trimEnd();
    const bulletMatch = line.match(/^[\s]*[-•*]\s+(.*)/);
    if (bulletMatch) {
      inList = true;
      buf.push(<li key={i}>{inlineFmt(bulletMatch[1])}</li>);
    } else if (/^#{1,6}\s+/.test(line)) {
      flush();
      out.push(<div key={i} style={{ fontWeight: 700, marginTop: 10, marginBottom: 4 }}>{inlineFmt(line.replace(/^#{1,6}\s+/, ''))}</div>);
    } else if (!line.trim()) {
      flush();
      out.push(<div key={i} style={{ height: 6 }} />);
    } else {
      flush();
      out.push(<div key={i}>{inlineFmt(line)}</div>);
    }
  });
  flush();
  return out;
}
function inlineFmt(s) {
  const parts = [];
  let rest = s, idx = 0;
  const re = /\*\*([^*]+)\*\*/g;
  let m, last = 0;
  while ((m = re.exec(rest)) !== null) {
    if (m.index > last) parts.push(rest.slice(last, m.index));
    parts.push(<strong key={'b' + (idx++)}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < rest.length) parts.push(rest.slice(last));
  return parts.length ? parts : s;
}

function formatDate(d) {
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return d || '';
    const now = new Date();
    const diff = now - dt;
    if (diff < 60 * 60 * 1000) return `il y a ${Math.max(1, Math.floor(diff / 60000))} min`;
    if (diff < 24 * 60 * 60 * 1000) return `il y a ${Math.floor(diff / 3600000)} h`;
    if (diff < 7 * 24 * 60 * 60 * 1000) return `il y a ${Math.floor(diff / 86400000)} j`;
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
  } catch { return d || ''; }
}

function EmailCard({ msg, expanded, onToggle }) {
  const isSent = msg.direction === 'sent';
  const hasTasks = msg.extractedTasks?.length > 0;
  return (
    <div style={{ 
      ...inboxStyles.email, 
      border: hasTasks ? '1px solid var(--accent)' : inboxStyles.email.border,
      background: hasTasks ? 'var(--accent-soft)' : '#fff'
    }}>
      <div style={inboxStyles.emailHead} onClick={onToggle}>
        <div style={{ ...inboxStyles.avatar, width: 32, height: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>
            {(msg.from || '?').split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.from}</span>
            <span style={isSent ? inboxStyles.sentBadge : inboxStyles.receivedBadge}>{isSent ? 'Envoyé' : 'Reçu'}</span>
            {msg.attachments?.length > 0 && (
              <span style={{ fontSize: 11, color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Icon name="link" size={11} /> {msg.attachments.length}
              </span>
            )}
          </div>
          {!expanded && (
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {msg.snippet || msg.bodyText?.slice(0, 120) || ''}
            </div>
          )}
          {msg.extractedTasks?.length > 0 && (
             <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--accent-soft)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, marginTop: 4 }}>
                <Icon name="sparkles" size={10} color="var(--accent)" /> Tâche détectée
             </div>
          )}
          {expanded && (
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>
              {isSent ? 'à ' : 'de '}{isSent ? msg.to : msg.fromEmail} · {msg.date ? new Date(msg.date).toLocaleString('fr-FR') : ''}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', flex: 'none' }}>{formatDate(msg.date)}</div>
      </div>
      {expanded && msg.subject && (
        <div style={inboxStyles.emailSubject}>{msg.subject}</div>
      )}
      {expanded && (
        <div style={inboxStyles.emailBody}>
          {msg.bodyText || msg.snippet || '(message vide)'}
        </div>
      )}
      {expanded && msg.attachments?.length > 0 && (
        <div style={inboxStyles.attachRow}>
          {msg.attachments.map((a, i) => (
            <a key={i} href={window.FreescaleGmail.attachmentUrl(msg.id, a.attachmentId, a.filename, a.mimeType)} target="_blank" rel="noreferrer" style={inboxStyles.attachChip}>
              <Icon name="file" size={12} />
              <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename}</span>
              {a.size > 0 && <span style={{ color: '#9CA3AF' }}>· {Math.round(a.size / 1024)} Ko</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function InboxView({ messages, clients, activeClientId, conversation, conversationLoading, myEmail, onSendReply, tasks = [] }) {
  const activeClient = clients.find(c => c.id === activeClientId);

  // Which emails are expanded (default: only the latest one)
  const [expandedIds, setExpandedIds] = React.useState(new Set());
  React.useEffect(() => {
    if (conversation && conversation.length > 0) {
      const last = conversation[conversation.length - 1];
      setExpandedIds(new Set([last.id]));
    } else {
      setExpandedIds(new Set());
    }
  }, [activeClientId, conversation?.length]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Composer state
  const [reply, setReply] = React.useState('');
  const [attachments, setAttachments] = React.useState([]); // [{ filename, mimeType, dataBase64, size }]
  const [sending, setSending] = React.useState(false);
  const fileRef = React.useRef(null);
  const scrollRef = React.useRef(null);

  React.useEffect(() => { setReply(''); setAttachments([]); setAiOutput(''); setAiBusy(null); }, [activeClientId]);

  React.useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [conversation, expandedIds, conversationLoading]);

  // AI state
  const [aiOutput, setAiOutput] = React.useState('');
  const [aiBusy, setAiBusy] = React.useState(null); // 'summary' | 'project' | 'reply'

  // Empty state
  if (!activeClientId || !activeClient) return (
    <div style={{ ...inboxStyles.wrap, display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 380, color: '#6B7280' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
          <Icon name="mail" size={22} color="var(--accent)" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 6 }}>Sélectionne un contact</div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          Clique sur un contact dans la sidebar pour afficher l'historique complet des échanges.
        </div>
      </div>
    </div>
  );

  const buildConversationText = () => {
    return (conversation || []).map(m => {
      const who = m.direction === 'sent' ? `MOI (${myEmail || ''})` : `${m.from} <${m.fromEmail}>`;
      const d = m.date || '';
      return `── ${who} · ${d} ──\nSujet : ${m.subject || '(sans objet)'}\n\n${m.bodyText || m.snippet || ''}`;
    }).join('\n\n');
  };

  const runAi = async (kind) => {
    if (!window.FreescaleGmail) return;
    if (!conversation || conversation.length === 0) { setAiOutput('Aucun message à analyser pour ce contact.'); return; }
    setAiBusy(kind);
    setAiOutput('');
    const res = await FreescaleGmail.ai(kind, {
      conversation: buildConversationText(),
      contactName: activeClient?.name
    });
    setAiBusy(null);
    if (res.error) {
      setAiOutput('⚠️ ' + res.error + '\n\nAjoute ANTHROPIC_API_KEY dans backend/.env puis relance `npm start`.');
      return;
    }
    if (kind === 'reply') {
      setReply(res.text || '');
      setAiOutput('✨ Proposition de réponse insérée dans le composer. Relis et ajuste avant d\'envoyer.');
    } else {
      setAiOutput(res.text || '(réponse vide)');
    }
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    Promise.all(files.map(f => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = String(reader.result).split(',')[1] || '';
        resolve({ filename: f.name, mimeType: f.type || 'application/octet-stream', size: f.size, dataBase64: base64 });
      };
      reader.readAsDataURL(f);
    }))).then(arr => setAttachments(prev => [...prev, ...arr]));
    e.target.value = '';
  };

  const removeAttachment = (idx) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const handleSend = async () => {
    if (!reply.trim() || !activeClient?.email) return;
    setSending(true);
    const last = (conversation || [])[conversation.length - 1];
    const subject = last?.subject ? (last.subject.startsWith('Re:') ? last.subject : 'Re: ' + last.subject) : '(sans objet)';
    const res = await onSendReply({
      clientId: activeClientId,
      to: activeClient.email,
      subject,
      body: reply,
      attachments,
      threadId: last?.threadId,
      inReplyTo: last?.id
    });
    setSending(false);
    if (!res?.error) { setReply(''); setAttachments([]); }
  };

  return (
    <div style={inboxStyles.wrap}>
      {/* Main email thread */}
      <div style={inboxStyles.main}>
        <div style={inboxStyles.head}>
          <div style={inboxStyles.avatar}>
            {activeClient?.avatarUrl
              ? <img src={activeClient.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : <div style={{ fontSize: 13, fontWeight: 700 }}>{activeClient?.avatar}</div>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{activeClient?.name}</div>
            <div style={{ fontSize: 11.5, color: '#6B7280' }}>
              {activeClient?.email || '—'} · {conversation?.length || 0} message{(conversation?.length || 0) > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div ref={scrollRef} style={inboxStyles.scroll}>
          {conversationLoading && (
            <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 13, padding: 32 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="sparkles" size={13} color="var(--accent)" /> Chargement de l'historique…
              </div>
            </div>
          )}
          {!conversationLoading && (!conversation || conversation.length === 0) && (
            <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 13, padding: 48 }}>
              Aucun message échangé avec ce contact pour le moment.
            </div>
          )}
          {!conversationLoading && conversation?.map(m => (
            <EmailCard key={m.id} msg={m} expanded={expandedIds.has(m.id)} onToggle={() => toggleExpand(m.id)} />
          ))}
        </div>

        {/* Composer */}
        <div style={inboxStyles.composer}>
          <div style={inboxStyles.composerField}>
            <textarea
              style={inboxStyles.composerText}
              placeholder={`Écris une réponse à ${activeClient?.name || 'ce contact'}…`}
              value={reply}
              onChange={e => setReply(e.target.value)}
            />
            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {attachments.map((a, i) => (
                  <span key={i} style={{ ...inboxStyles.attachChip, background: '#fff' }}>
                    <Icon name="file" size={11} />
                    <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename}</span>
                    <span style={{ color: '#9CA3AF' }}>· {Math.round(a.size / 1024)} Ko</span>
                    <button onClick={() => removeAttachment(i)} style={{ border: 'none', background: 'transparent', color: '#9CA3AF', cursor: 'pointer', padding: 0, marginLeft: 4 }}>
                      <Icon name="x" size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={inboxStyles.composerBar}>
              <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={handleFiles} />
              <button style={inboxStyles.iconBtn} onClick={() => fileRef.current?.click()}>
                <Icon name="link" size={12} /> Pièce jointe
              </button>
              <button style={inboxStyles.iconBtn} onClick={() => runAi('reply')} disabled={aiBusy === 'reply'}>
                <Icon name="sparkles" size={12} color="var(--accent)" /> {aiBusy === 'reply' ? '…' : 'Rédiger avec l\'IA'}
              </button>
              <div style={{ flex: 1 }} />
              <button style={{ ...inboxStyles.sendBtn, opacity: (!reply.trim() || sending) ? 0.5 : 1 }}
                disabled={!reply.trim() || sending}
                onClick={handleSend}>
                <Icon name="send" size={12} /> {sending ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI panel */}
      <aside style={{...inboxStyles.aiPanel, display: 'flex', flexDirection: 'column'}}>
        <div style={inboxStyles.aiHead}>
          <div style={{...inboxStyles.aiBadge, background: 'var(--accent-soft)', color: 'var(--accent)', border: 'none'}}>
            <Icon name="smile" size={14} color="var(--accent)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Copilote</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>Analyse cette conversation</div>
          </div>
        </div>
        <div style={inboxStyles.aiActions}>
          <button style={inboxStyles.aiBtn} disabled={aiBusy === 'summary'} onClick={() => runAi('summary')}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; }}>
            <span style={inboxStyles.aiBtnIcon}><Icon name="file" size={12} /></span>
            <div style={{ flex: 1 }}>
              <div>Résumer la conversation</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginTop: 2 }}>Points clés, décisions, ce qu'on attend de moi</div>
            </div>
            {aiBusy === 'summary' && <span style={{ fontSize: 11, color: 'var(--accent)' }}>…</span>}
          </button>
        </div>
        <div style={{ borderTop: '1px solid #F3F4F6' }} />
        <div style={inboxStyles.aiOutput}>
          {!aiOutput && !aiBusy && (
            <div style={{ color: '#9CA3AF', fontSize: 12, fontStyle: 'italic' }}>
              Clique sur une action ci-dessus pour obtenir une analyse de la conversation.
            </div>
          )}
          {aiBusy && (
            <div style={{ color: 'var(--accent)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="sparkles" size={12} color="var(--accent)" /> L'IA réfléchit…
            </div>
          )}
          {aiOutput && renderMarkdown(aiOutput)}
        </div>

        {/* Tâches du client */}
        <div style={{ borderTop: '1px solid #F3F4F6', background: 'var(--bg-0)', padding: '16px', flex: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#111', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="check" size={13} color="var(--accent)" /> Tâches actives
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(() => {
              const clientTasks = tasks.filter(t => t.client === activeClient?.name);
              if (clientTasks.length === 0) {
                return <div style={{ fontSize: 11.5, color: '#6B7280', fontStyle: 'italic' }}>Aucune tâche active pour ce contact.</div>;
              }
              return clientTasks.slice(0, 3).map(t => (
                <div key={t.id} style={{ fontSize: 11.5, color: '#111', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', marginTop: 5, flex: 'none' }} />
                  <span style={{ lineHeight: 1.4 }}>{t.title}</span>
                </div>
              ));
            })()}
          </div>
          <button style={{ 
            marginTop: 4, width: '100%', padding: '8px', borderRadius: 8, 
            background: '#fff', border: '1px solid #E5E7EB', 
            color: '#374151', fontSize: 12, fontWeight: 600, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            cursor: 'pointer', transition: 'all 120ms'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#374151'; }}
          onClick={(e) => { 
            const btn = e.currentTarget; 
            const old = btn.innerHTML; 
            btn.innerHTML = '<span style="color:var(--accent)">Analyse en cours...</span>'; 
            setTimeout(() => btn.innerHTML = old, 1500); 
          }}>
            <Icon name="search" size={12} /> Extraire de nouvelles tâches
          </button>
        </div>
      </aside>
    </div>
  );
}

window.InboxView = InboxView;
