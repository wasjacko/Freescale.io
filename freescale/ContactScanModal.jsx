// Freescale — Contact scan & validation modal (monochrome, sorting-focused)
console.log('[Freescale] ContactScanModal.jsx LOADED');

function ContactScanModal({ isOpen, phase, senders, results, onValidate, onCancel }) {
  console.log('[Freescale] ContactScanModal render — isOpen:', isOpen, 'phase:', phase, 'results:', results?.length);
  // phase: 'scanning' | 'review' | 'empty' | 'error'
  const [selected, setSelected] = React.useState({});
  const [filter, setFilter] = React.useState('client');

  React.useEffect(() => {
    if ((phase === 'review' || phase === 'error') && results && results.length) {
      const next = {};
      results.forEach(r => {
        if (r.category === 'client') next[r.email.toLowerCase()] = true;
      });
      setSelected(next);
    }
  }, [phase, results]);

  if (!isOpen) return null;

  const toggle = (email) => {
    const k = email.toLowerCase();
    setSelected(prev => ({ ...prev, [k]: !prev[k] }));
  };

  const filtered = (results || []).filter(r => {
    if (filter === 'all') return true;
    return r.category === filter;
  }).sort((a, b) => {
    const rank = { client: 0, other: 1, promo: 2 };
    if (rank[a.category] !== rank[b.category]) return rank[a.category] - rank[b.category];
    return (b.confidence || 0) - (a.confidence || 0);
  });

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const clientsCount  = (results || []).filter(r => r.category === 'client').length;
  const promoCount    = (results || []).filter(r => r.category === 'promo').length;
  const otherCount    = (results || []).filter(r => r.category === 'other').length;

  const setAll = (val) => {
    const next = {};
    filtered.forEach(r => { next[r.email.toLowerCase()] = val; });
    setSelected(prev => ({ ...prev, ...next }));
  };

  const validate = () => {
    const chosen = (results || []).filter(r => selected[r.email.toLowerCase()]);
    onValidate(chosen);
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        {/* Header — with Gmail logo */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={styles.gmailBadge}>
              <img src="freescale/assets/channels/gmail.svg" alt="Gmail" style={{ width: 20, height: 20, display: 'block' }} />
            </div>
            <div>
              <div style={styles.title}>
                {phase === 'scanning'
                  ? 'Analyse de ta boîte Gmail'
                  : phase === 'review'
                    ? `${clientsCount} client${clientsCount > 1 ? 's' : ''} Gmail identifié${clientsCount > 1 ? 's' : ''}`
                    : 'Contacts Gmail'}
              </div>
              <div style={styles.sub}>
                {phase === 'scanning'
                  ? ((senders || []).length === 0
                      ? 'Lecture de ta boîte de réception…'
                      : `Tri de ${(senders || []).length} expéditeurs Gmail`)
                  : phase === 'review'
                    ? 'Ajoute ces contacts Gmail à Freescale'
                    : ''}
              </div>
            </div>
          </div>
          {phase !== 'scanning' && (
            <button onClick={onCancel} style={styles.closeBtn} aria-label="Fermer">✕</button>
          )}
        </div>

        {/* Body */}
        <div style={styles.body}>
          {phase === 'scanning' && <ScanSorting senders={senders} />}

          {phase === 'empty' && (
            <div style={styles.emptyBox}>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#111' }}>Aucun expéditeur trouvé</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                Ta boîte Gmail semble vide ou inaccessible.
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div style={styles.emptyBox}>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#111' }}>Classification indisponible</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center', maxWidth: 380 }}>
                Les expéditeurs sont listés ci-dessous, coche ceux qui sont des clients.
              </div>
            </div>
          )}

          {phase === 'review' && (
            <>
              <div style={styles.filterRow}>
                <FilterPill active={filter === 'client'} onClick={() => setFilter('client')} label="Clients" count={clientsCount} />
                <FilterPill active={filter === 'other'}  onClick={() => setFilter('other')}  label="Autres" count={otherCount} />
                <FilterPill active={filter === 'promo'}  onClick={() => setFilter('promo')}  label="Promo" count={promoCount} />
                <FilterPill active={filter === 'all'}    onClick={() => setFilter('all')}    label="Tous" count={(results || []).length} />
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button onClick={() => setAll(true)}  style={styles.ghostBtn}>Tout cocher</button>
                  <button onClick={() => setAll(false)} style={styles.ghostBtn}>Tout décocher</button>
                </div>
              </div>

              <div style={styles.list}>
                {filtered.length === 0 && (
                  <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                    Aucun expéditeur dans cette catégorie
                  </div>
                )}
                {filtered.map(r => {
                  const k = r.email.toLowerCase();
                  const checked = !!selected[k];
                  return (
                    <div key={r.email} style={{ ...styles.row, background: checked ? '#FAFAFA' : '#fff' }}
                         onClick={() => toggle(r.email)}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(r.email)}
                             onClick={(e) => e.stopPropagation()}
                             style={{ accentColor: '#111', cursor: 'pointer', width: 15, height: 15 }} />
                      <div style={styles.avatar}>
                        {(r.name || r.email).split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.name || r.email.split('@')[0]}
                        </div>
                        <div style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.email}
                        </div>
                      </div>
                      <CatTag cat={r.category} />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {(phase === 'review' || phase === 'error') && (
          <div style={styles.footer}>
            <button onClick={onCancel} style={styles.ghostBtnBig}>Annuler</button>
            <button onClick={validate}
                    style={{ ...styles.primaryBtn, opacity: selectedCount === 0 ? 0.4 : 1, cursor: selectedCount === 0 ? 'not-allowed' : 'pointer' }}
                    disabled={selectedCount === 0}>
              Ajouter {selectedCount > 0 ? selectedCount : ''} contact{selectedCount > 1 ? 's' : ''} Gmail
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, label, count }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
      background: active ? '#111' : '#fff',
      color: active ? '#fff' : '#374151',
      border: `1px solid ${active ? '#111' : '#E5E7EB'}`,
      cursor: 'pointer', transition: 'all .12s',
      display: 'inline-flex', alignItems: 'center', gap: 6
    }}>
      {label}
      <span style={{
        fontSize: 10, fontWeight: 700,
        background: active ? 'rgba(255,255,255,.22)' : '#F3F4F6',
        color: active ? '#fff' : '#6B7280',
        padding: '1px 6px', borderRadius: 4, minWidth: 16, textAlign: 'center'
      }}>{count}</span>
    </button>
  );
}

function CatTag({ cat }) {
  if (cat === 'client') return (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#111', letterSpacing: '.04em', textTransform: 'uppercase',
                  padding: '3px 7px', borderRadius: 4, border: '1px solid #111' }}>Client</div>
  );
  if (cat === 'promo') return (
    <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '.04em', textTransform: 'uppercase',
                  padding: '3px 7px', borderRadius: 4, border: '1px dashed #D1D5DB' }}>Promo</div>
  );
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', letterSpacing: '.04em', textTransform: 'uppercase',
                  padding: '3px 7px', borderRadius: 4, border: '1px solid #E5E7EB' }}>Autre</div>
  );
}

// ─── Scanning animation: professional, calm & smooth ─────────────────
function ScanSorting({ senders }) {
  const [idx, setIdx] = React.useState(0);
  const [buckets, setBuckets] = React.useState({ client: 0, other: 0, promo: 0 });
  const [finalizing, setFinalizing] = React.useState(false);
  const list = senders || [];
  
  const guess = (s) => {
    const email = (s.email || '').toLowerCase();
    const local = email.split('@')[0] || '';
    const domain = email.split('@')[1] || '';
    const name = (s.name || '').trim();
    const lowerName = name.toLowerCase();

    // Priority names requested by the user
    if (lowerName.includes('capucine') || lowerName.includes('victor')) return 'client';

    if (/^(no[-_.]?reply|noreply|notifications?|newsletter|mailer|bounce|postmaster|daemon|marketing|promo|do[-_.]?not[-_.]?reply|hello|contact|support|team|info|admin|billing|invoice|accounts?|help|service)($|[-_.@+])/i.test(local)) return 'promo';
    if (['mailchimp.com','sendgrid.net','sendinblue.com','mailjet.com','mailgun.org','amazonses.com','facebookmail.com','notifications.google.com'].some(d => domain === d || domain.endsWith('.' + d))) return 'promo';

    const instDomains = ['hetic.net','hetic.eu','hetic.fr','anthropic.com','openai.com','google.com','youtube.com','notion.so','figma.com','github.com','gitlab.com','apple.com','microsoft.com','outlook.live.com','office.com','linkedin.com','stripe.com','paypal.com','vercel.com','netlify.com','slack.com','discord.com','zoom.us','calendly.com','dropbox.com','adobe.com','atlassian.com','trello.com','asana.com','spotify.com','twitter.com','x.com','meta.com','facebook.com','instagram.com','amazon.com','aws.amazon.com','shopify.com','hubspot.com','intercom.io','zapier.com','airbnb.com','uber.com','doctolib.fr','ameli.fr','impots.gouv.fr','urssaf.fr','laposte.fr','sncf.com'];
    if (instDomains.some(d => domain === d || domain.endsWith('.' + d))) return 'other';

    const looksLikePerson = /^[A-ZÀ-Ö][a-zà-ÿ'-]+\s+[A-ZÀ-Ö][a-zà-ÿ'-]+/.test(name);
    const personalInboxDomains = ['gmail.com','googlemail.com','yahoo.com','yahoo.fr','outlook.com','hotmail.com','hotmail.fr','live.fr','live.com','proton.me','protonmail.com','icloud.com','me.com','orange.fr','wanadoo.fr','free.fr','laposte.net'];
    if (looksLikePerson && personalInboxDomains.includes(domain)) return 'client';
    return 'other';
  };

  const isLoading = list.length === 0;

  // Real sort once senders arrive: smooth increment
  React.useEffect(() => {
    if (list.length === 0) return;
    setBuckets({ client: 0, other: 0, promo: 0 });
    let i = 0;
    const totalTime = 3000; // 3 seconds total (faster as requested)
    const interval = totalTime / list.length;
    
    const id = setInterval(() => {
      if (i >= list.length) { 
        clearInterval(id);
        setFinalizing(true);
        return; 
      }
      const s = list[i];
      const cat = guess(s);
      setBuckets(prev => ({ ...prev, [cat]: prev[cat] + 1 }));
      setIdx(i);
      i += 1;
    }, interval);
    
    return () => clearInterval(id);
  }, [list.length]);

  const sortProgress = list.length ? Math.min(100, (idx + 1) / list.length * 100) : 0;
  
  // Keep track of the last 3 processed items for a "scrolling list" effect
  const history = React.useMemo(() => {
    if (list.length === 0) return [];
    return list.slice(Math.max(0, idx - 3), idx + 1).reverse();
  }, [idx, list]);

  const isDone = sortProgress >= 100 && finalizing;

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Progress Section */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111', display: 'flex', alignItems: 'center', gap: 8 }}>
            {isLoading ? 'Initialisation...' : (isDone ? 'Analyse optimisée terminée' : 'Extraction des opportunités...')}
            {isDone && <span style={{ color: '#22C55E', animation: 'freescale-pop 0.4s ease-out' }}>✓</span>}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', fontVariantNumeric: 'tabular-nums' }}>
             {isLoading ? '0%' : `${Math.round(sortProgress)}%`}
          </div>
        </div>
        <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            background: isDone ? '#22C55E' : '#111', borderRadius: 4,
            width: `${sortProgress}%`,
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
      </div>

      {/* Counters Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
        <Bucket label="Clients" count={buckets.client} active={buckets.client > 0} color="#111" />
        <Bucket label="Autres" count={buckets.other} muted />
        <Bucket label="Promo" count={buckets.promo} muted />
      </div>

      {/* Animated History List */}
      <div style={{ 
        position: 'relative', height: 160, overflow: 'hidden', 
        background: '#FAFAFA', borderRadius: 12, border: '1px solid #EEE',
        padding: '12px 0', transition: 'all 0.3s'
      }}>
        {isLoading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>
             <span style={{ animation: 'freescale-pulse 1.5s infinite' }}>Récupération des emails...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px' }}>
            {history.map((s, i) => (
              <div key={s.email + idx} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: Math.max(0, 1 - (i * 0.3)),
                transform: `translateY(${i * 6}px)`,
                transition: 'all 0.3s ease-out',
                animation: i === 0 ? 'freescale-slide-in 0.3s ease-out' : 'none'
              }}>
                <div style={{ 
                  width: 32, height: 32, borderRadius: '50%', 
                  background: guess(s) === 'client' ? '#111' : '#fff', 
                  border: '1px solid #EEE',
                  display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, 
                  color: guess(s) === 'client' ? '#fff' : '#111', flex: 'none',
                  transition: 'all 0.2s'
                }}>
                  {(s.name || s.email).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name || s.email.split('@')[0]}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.email}
                  </div>
                </div>
                <CatTag cat={guess(s)} />
              </div>
            ))}
          </div>
        )}
        {isDone && (
          <div style={{ 
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#111',
            animation: 'freescale-fade-in 0.4s ease-out'
          }}>
             {buckets.client} clients identifiés avec succès
          </div>
        )}
        {/* Shimmer overlay */}
        <div style={{ 
          position: 'absolute', inset: 0, 
          background: 'linear-gradient(to bottom, rgba(250,250,250,1) 0%, rgba(250,250,250,0) 20%, rgba(250,250,250,0) 80%, rgba(250,250,250,1) 100%)',
          pointerEvents: 'none'
        }} />
      </div>

      <style>{`
        @keyframes freescale-slide-in {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes freescale-pop {
          0% { transform: scale(0); }
          80% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes freescale-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes freescale-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Bucket({ label, count, muted, active }) {
  return (
    <div style={{
      padding: '16px',
      background: '#fff',
      border: `1px solid ${active ? '#111' : '#EEE'}`,
      borderRadius: 12,
      transition: 'all 0.3s ease',
      boxShadow: active ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
        color: active ? '#111' : '#9CA3AF', marginBottom: 8
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 28, fontWeight: 700, color: active ? '#111' : (muted ? '#6B7280' : '#111'),
        fontVariantNumeric: 'tabular-nums', lineHeight: 1
      }}>
        {count}
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(17, 17, 17, 0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 500
  },
  modal: {
    background: '#fff', borderRadius: 14, width: 'min(640px, 92vw)',
    maxHeight: '86vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px -10px rgba(0,0,0,.25)', overflow: 'hidden',
    border: '1px solid #EEE'
  },
  header: {
    padding: '18px 22px 14px', borderBottom: '1px solid #F3F4F6',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12
  },
  title: { fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' },
  sub:   { fontSize: 12, color: '#6B7280', marginTop: 3 },
  gmailBadge: {
    width: 36, height: 36, borderRadius: 9, background: '#fff',
    border: '1px solid #EEE',
    display: 'grid', placeItems: 'center', flex: 'none'
  },
  closeBtn: {
    width: 28, height: 28, borderRadius: 6, border: 'none',
    background: '#F3F4F6', color: '#6B7280', cursor: 'pointer', fontSize: 13, flex: 'none'
  },
  body: { padding: '18px 22px', overflow: 'auto', flex: 1 },
  emptyBox: { padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  filterRow: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' },
  ghostBtn: {
    padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
    background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB', cursor: 'pointer'
  },
  ghostBtnBig: {
    padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    background: '#fff', color: '#374151', border: '1px solid #E5E7EB', cursor: 'pointer'
  },
  primaryBtn: {
    padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
    background: '#111', color: '#fff', border: '1px solid #111'
  },
  list: {
    border: '1px solid #F1F1F1', borderRadius: 10, overflow: 'hidden',
    maxHeight: 380, overflowY: 'auto', background: '#fff'
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
    borderBottom: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background .1s'
  },
  avatar: {
    width: 30, height: 30, borderRadius: '50%', background: '#F5F5F5',
    color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, flex: 'none', border: '1px solid #EEE'
  },
  footer: {
    padding: '14px 22px', borderTop: '1px solid #F3F4F6',
    display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#fff'
  }
};

window.ContactScanModal = ContactScanModal;
