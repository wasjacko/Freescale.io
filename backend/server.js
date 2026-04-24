// Freescale — Backend server (Gmail OAuth + API)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function gravatarUrl(email) {
  if (!email) return null;
  const hash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
  // d=404 → if no gravatar exists, returns 404 so the frontend can fall back to initials
  return `https://www.gravatar.com/avatar/${hash}?s=128&d=404`;
}

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ───────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:8002', credentials: true }));
app.use(express.json({ limit: '25mb' }));

// ─── Token storage (file-based for simplicity) ─────────
const TOKENS_FILE = path.join(__dirname, '.tokens.json');

function saveTokens(tokens) {
  const existing = loadTokens();
  const merged = { ...existing, ...tokens };
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

function loadTokens() {
  try {
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function clearTokens() {
  try { fs.unlinkSync(TOKENS_FILE); } catch {}
}

// ─── OAuth2 client factory ──────────────────────────────
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthenticatedClient() {
  const tokens = loadTokens();
  if (!tokens) return null;
  const client = createOAuth2Client();
  client.setCredentials(tokens);
  // Auto-refresh token handler
  client.on('tokens', (newTokens) => {
    saveTokens(newTokens);
  });
  return client;
}

// ─── ROUTES ─────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', gmail_configured: !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_client_id_here' });
});

// Check connection status
app.get('/api/gmail/status', (req, res) => {
  const tokens = loadTokens();
  const configured = !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_client_id_here';
  res.json({
    configured,
    connected: !!tokens,
    hasAccessToken: !!tokens?.access_token,
    expiryDate: tokens?.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
  });
});

// Step 1: Start OAuth — redirect user to Google consent screen
app.get('/auth/google', (req, res) => {
  const client = createOAuth2Client();
  const url = client.generateAuthUrl({
    access_type: 'offline',     // Get refresh_token for long-lived access
    prompt: 'consent',          // Always show consent to get refresh_token
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',         // Read emails
      'https://www.googleapis.com/auth/contacts.readonly',      // Read user's Google Contacts
      'https://www.googleapis.com/auth/contacts.other.readonly',// Read "Other Contacts" (auto-saved senders)
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ]
  });
  console.log('[OAuth] redirecting to:', url);
  res.redirect(url);
});

// Step 2: Google redirects here with auth code
app.get('/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/index.html?gmail_error=${error}`);
  }
  try {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);
    saveTokens(tokens);
    // Redirect back to frontend with success flag
    res.redirect(`${process.env.FRONTEND_URL}/index.html?gmail_connected=true`);
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL}/index.html?gmail_error=token_exchange_failed`);
  }
});

// Disconnect Gmail
app.post('/api/gmail/disconnect', (req, res) => {
  clearTokens();
  res.json({ success: true });
});

// Get user profile
app.get('/api/gmail/profile', async (req, res) => {
  const auth = getAuthenticatedClient();
  if (!auth) return res.status(401).json({ error: 'Not connected' });

  try {
    const oauth2 = google.oauth2({ version: 'v2', auth });
    const { data } = await oauth2.userinfo.get();
    res.json({
      email: data.email,
      name: data.name,
      picture: data.picture
    });
  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get emails (inbox, max 20)
app.get('/api/gmail/messages', async (req, res) => {
  const auth = getAuthenticatedClient();
  if (!auth) return res.status(401).json({ error: 'Not connected' });

  try {
    const gmail = google.gmail({ version: 'v1', auth });
    const maxResults = parseInt(req.query.max) || 20;
    const query = req.query.q || 'in:inbox';

    // 1. Get message IDs
    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query
    });

    if (!list.data.messages || list.data.messages.length === 0) {
      return res.json({ messages: [], total: 0 });
    }

    // 2. Fetch each message's details
    const messages = await Promise.all(
      list.data.messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        });

        const headers = detail.data.payload?.headers || [];
        const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

        // Parse "From" header: "Name <email>" → { name, email }
        const fromRaw = getHeader('From');
        const fromMatch = fromRaw.match(/^"?([^"<]*?)"?\s*<?([^>]*)>?$/);
        const fromName = fromMatch?.[1]?.trim() || fromRaw;
        const fromEmail = fromMatch?.[2]?.trim() || fromRaw;

        return {
          id: msg.id,
          threadId: detail.data.threadId,
          snippet: detail.data.snippet,
          from: fromName,
          fromEmail: fromEmail,
          avatarUrl: gravatarUrl(fromEmail),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          unread: detail.data.labelIds?.includes('UNREAD') || false,
          labels: detail.data.labelIds || []
        };
      })
    );

    res.json({
      messages,
      total: list.data.resultSizeEstimate || messages.length
    });
  } catch (err) {
    console.error('Messages error:', err.message);
    if (err.message.includes('invalid_grant') || err.message.includes('Token has been expired')) {
      clearTokens();
      return res.status(401).json({ error: 'Token expired, please reconnect' });
    }
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ─── Message parsing helpers ────────────────────────────
function parseAddress(raw) {
  if (!raw) return { name: '', email: '' };
  const m = raw.match(/^"?([^"<]*?)"?\s*<?([^>]*)>?$/);
  return { name: m?.[1]?.trim() || raw, email: (m?.[2]?.trim() || raw).toLowerCase() };
}

function extractBodyAndAttachments(payload) {
  let text = '', html = '';
  const attachments = [];

  function walk(part) {
    if (!part) return;
    const mime = part.mimeType || '';
    const filename = part.filename || '';
    if (filename && part.body?.attachmentId) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename,
        mimeType: mime,
        size: part.body.size || 0
      });
    } else if (mime === 'text/plain' && part.body?.data) {
      text += Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (mime === 'text/html' && part.body?.data) {
      html += Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
    if (part.parts) part.parts.forEach(walk);
  }
  walk(payload);

  // If body is directly on payload (no parts)
  if (!text && !html && payload?.body?.data) {
    const raw = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    if ((payload.mimeType || '').includes('html')) html = raw; else text = raw;
  }

  return { text, html, attachments };
}

// Get full message body + attachments
app.get('/api/gmail/messages/:id', async (req, res) => {
  const auth = getAuthenticatedClient();
  if (!auth) return res.status(401).json({ error: 'Not connected' });

  try {
    const gmail = google.gmail({ version: 'v1', auth });
    const detail = await gmail.users.messages.get({ userId: 'me', id: req.params.id, format: 'full' });
    const headers = detail.data.payload?.headers || [];
    const getHeader = (n) => headers.find(h => h.name?.toLowerCase() === n.toLowerCase())?.value || '';
    const { text, html, attachments } = extractBodyAndAttachments(detail.data.payload);
    const fromP = parseAddress(getHeader('From'));

    res.json({
      id: detail.data.id,
      threadId: detail.data.threadId,
      from: fromP.name,
      fromEmail: fromP.email,
      to: getHeader('To'),
      cc: getHeader('Cc'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      bodyText: text,
      bodyHtml: html,
      snippet: detail.data.snippet,
      attachments,
      unread: detail.data.labelIds?.includes('UNREAD') || false,
      labels: detail.data.labelIds || []
    });
  } catch (err) {
    console.error('Message detail error:', err.message);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// Get full conversation with a specific email address (both received + sent)
app.get('/api/gmail/conversation', async (req, res) => {
  const auth = getAuthenticatedClient();
  if (!auth) return res.status(401).json({ error: 'Not connected' });
  const email = (req.query.email || '').toLowerCase();
  if (!email) return res.status(400).json({ error: 'email query required' });

  try {
    const gmail = google.gmail({ version: 'v1', auth });
    const max = parseInt(req.query.max) || 100;

    // Figure out current user's email to compute direction
    let myEmail = '';
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth });
      const prof = await oauth2.userinfo.get();
      myEmail = (prof.data.email || '').toLowerCase();
    } catch {}

    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults: max,
      q: `from:${email} OR to:${email}`
    });

    if (!list.data.messages || list.data.messages.length === 0) {
      return res.json({ messages: [], myEmail });
    }

    const messages = await Promise.all(list.data.messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
      const headers = detail.data.payload?.headers || [];
      const getHeader = (n) => headers.find(h => h.name?.toLowerCase() === n.toLowerCase())?.value || '';
      const { text, html, attachments } = extractBodyAndAttachments(detail.data.payload);
      const fromP = parseAddress(getHeader('From'));
      const toRaw = getHeader('To');
      const toAddrs = toRaw.split(',').map(s => parseAddress(s).email);
      const sent = fromP.email === myEmail;

      return {
        id: detail.data.id,
        threadId: detail.data.threadId,
        from: fromP.name,
        fromEmail: fromP.email,
        to: toRaw,
        toEmails: toAddrs,
        cc: getHeader('Cc'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        dateMs: parseInt(detail.data.internalDate) || Date.parse(getHeader('Date')) || 0,
        bodyText: text,
        bodyHtml: html,
        snippet: detail.data.snippet,
        attachments,
        unread: detail.data.labelIds?.includes('UNREAD') || false,
        direction: sent ? 'sent' : 'received'
      };
    }));

    // Oldest → newest
    messages.sort((a, b) => a.dateMs - b.dateMs);

    res.json({ messages, myEmail, count: messages.length });
  } catch (err) {
    console.error('Conversation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Download one attachment (base64 → returned as raw bytes with correct mime)
app.get('/api/gmail/messages/:id/attachments/:attachmentId', async (req, res) => {
  const auth = getAuthenticatedClient();
  if (!auth) return res.status(401).json({ error: 'Not connected' });
  try {
    const gmail = google.gmail({ version: 'v1', auth });
    const { data } = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: req.params.id,
      id: req.params.attachmentId
    });
    const buf = Buffer.from(data.data, 'base64');
    const filename = req.query.filename || 'attachment';
    const mime = req.query.mime || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.send(buf);
  } catch (err) {
    console.error('Attachment error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Send an email (optional attachments passed as array of { filename, mimeType, dataBase64 })
app.post('/api/gmail/send', async (req, res) => {
  const auth = getAuthenticatedClient();
  if (!auth) return res.status(401).json({ error: 'Not connected' });
  const { to, subject, body, attachments = [], threadId, inReplyTo } = req.body || {};
  if (!to || !body) return res.status(400).json({ error: 'to + body required' });

  try {
    const gmail = google.gmail({ version: 'v1', auth });
    const boundary = 'freescale_' + crypto.randomBytes(8).toString('hex');
    const lines = [];
    lines.push(`To: ${to}`);
    if (subject) lines.push(`Subject: ${subject}`);
    if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`);
    lines.push('MIME-Version: 1.0');
    if (attachments.length === 0) {
      lines.push('Content-Type: text/plain; charset="UTF-8"');
      lines.push('');
      lines.push(body);
    } else {
      lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      lines.push('');
      lines.push(`--${boundary}`);
      lines.push('Content-Type: text/plain; charset="UTF-8"');
      lines.push('');
      lines.push(body);
      for (const att of attachments) {
        lines.push(`--${boundary}`);
        lines.push(`Content-Type: ${att.mimeType || 'application/octet-stream'}; name="${att.filename}"`);
        lines.push('Content-Transfer-Encoding: base64');
        lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
        lines.push('');
        // dataBase64 may include data-URI prefix; strip if present
        const clean = String(att.dataBase64 || '').replace(/^data:[^;]+;base64,/, '');
        // wrap to 76 chars/line (RFC)
        lines.push(clean.match(/.{1,76}/g)?.join('\n') || clean);
      }
      lines.push(`--${boundary}--`);
    }

    const raw = Buffer.from(lines.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const payload = { raw };
    if (threadId) payload.threadId = threadId;
    const sent = await gmail.users.messages.send({ userId: 'me', requestBody: payload });

    res.json({ ok: true, id: sent.data.id, threadId: sent.data.threadId });
  } catch (err) {
    console.error('Send error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── AI endpoints (Anthropic Claude) ─────────────────────
async function callClaude(system, userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configuré dans backend/.env');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Claude HTTP ${r.status}`);
  return data?.content?.[0]?.text || '';
}

app.post('/api/ai/summary', async (req, res) => {
  const { conversation, contactName } = req.body || {};
  if (!conversation) return res.status(400).json({ error: 'conversation required' });
  try {
    const text = await callClaude(
      `Tu es un assistant qui aide un freelance à gérer ses emails. Tu réponds TOUJOURS en français, de manière concise et structurée en Markdown léger (puces, titres courts).`,
      `Résume cette conversation avec ${contactName || 'ce contact'} en 4-6 puces :
1. Sujet principal et contexte du projet
2. Derniers points discutés
3. Décisions prises / en suspens
4. Ce que le client attend de moi
5. Prochaines étapes suggérées

Conversation (du plus ancien au plus récent) :
${conversation}`
    );
    res.json({ text });
  } catch (err) {
    console.error('AI summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/reply', async (req, res) => {
  const { conversation, intent } = req.body || {};
  if (!conversation) return res.status(400).json({ error: 'conversation required' });
  try {
    const text = await callClaude(
      `Tu es un assistant qui aide un freelance à rédiger des emails professionnels en français. Ton : poli, clair, concis, pas trop formel. Tu réponds UNIQUEMENT avec le corps de l'email, sans objet, sans signature, sans "Bonjour [nom]" explicite si la conversation est déjà en cours.`,
      `Rédige une réponse pour le dernier email reçu.${intent ? ` Intention : ${intent}.` : ''}

Conversation :
${conversation}`
    );
    res.json({ text });
  } catch (err) {
    console.error('AI reply error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/project', async (req, res) => {
  const { conversation, contactName } = req.body || {};
  if (!conversation) return res.status(400).json({ error: 'conversation required' });
  try {
    const text = await callClaude(
      `Tu es un assistant qui aide un freelance à reprendre contact avec ses projets clients après une absence. Tu réponds en français, Markdown léger.`,
      `J'ai mis ce projet de côté un moment et j'ai besoin de me remettre dedans rapidement. Fais un debrief du projet avec ${contactName || 'ce contact'} sur la base de cette conversation :

1. Nature du projet et objectif
2. Historique rapide (grandes étapes, dates clés)
3. Statut actuel (où en est-on concrètement)
4. Ce qui bloque ou attend de mon côté
5. 2-3 actions concrètes pour relancer et reprendre le fil

Conversation :
${conversation}`
    );
    res.json({ text });
  } catch (err) {
    console.error('AI project error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Classify a batch of senders into: client / promo / other
// Body: { senders: [{ email, name, subjects: [..], count }] }
// Returns: { results: [{ email, category, confidence, reason }] }
app.post('/api/ai/classify-contacts', async (req, res) => {
  const { senders } = req.body || {};
  if (!Array.isArray(senders) || senders.length === 0) {
    return res.status(400).json({ error: 'senders array required' });
  }
  try {
    // Build a compact, numbered list for the model
    const lines = senders.map((s, i) => {
      const subjects = (s.subjects || []).slice(0, 3).map(x => `"${String(x).slice(0, 80)}"`).join(' | ');
      return `${i + 1}. ${s.name || '(sans nom)'} <${s.email}> — ${s.count || 1} msg — sujets: ${subjects || '(aucun)'}`;
    }).join('\n');

    const system = `Tu es un classifieur TRÈS STRICT d'expéditeurs d'emails pour un freelance tech. Pour chaque expéditeur, décide :
- "client"  : UNIQUEMENT une vraie personne physique identifiée par un prénom+nom humain, qui semble être un client/prospect/partenaire réel du freelance (échange personnel, devis, projet, facture, rdv, question sur mission, etc.). Une adresse d'école, d'entreprise (anthropic, google, hetic, openai, notion, figma, github, apple, microsoft, etc.) ou de service en ligne n'est JAMAIS un client. Un nom d'organisation (pas un prénom+nom) n'est JAMAIS un client.
- "promo"   : newsletter, pub, marketing, notifications automatiques, noreply, no-reply, notifications, mailer, support@, team@, hello@, contact@, info@.
- "other"   : tout le reste — institutions (écoles, universités), plateformes (anthropic, github, notion, figma, slack, etc.), comptes/factures de services, emails personnels/famille/amis, et tout cas douteux.

RÈGLE D'OR : en cas de doute, choisir "other" et JAMAIS "client". Il vaut mieux 3 vrais clients que 50 faux.

Tu réponds UNIQUEMENT en JSON strict, sans texte avant/après, au format :
{"results":[{"index":1,"category":"client","confidence":0.9,"reason":"court"}, ...]}
Pas de markdown, pas de commentaires, juste le JSON.`;

    const user = `Classifie ces ${senders.length} expéditeurs. Sois EXTRÊMEMENT sélectif sur "client" — seulement des humains identifiés avec prénom+nom qui ressemblent à de vrais clients freelance. Toute adresse d'entreprise, école, service, plateforme ou nom générique/organisationnel va dans "other" ou "promo".

Expéditeurs :
${lines}`;

    const text = await callClaude(system, user);

    // Robust JSON extraction
    let parsed;
    try {
      const jsonStart = text.indexOf('{');
      const jsonEnd   = text.lastIndexOf('}');
      parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    } catch (e) {
      return res.status(500).json({ error: 'AI returned invalid JSON', raw: text });
    }

    // Merge back with original email (model might not return it)
    const results = (parsed.results || []).map(r => {
      const s = senders[(r.index || 0) - 1];
      return {
        email: s?.email || r.email || '',
        name:  s?.name  || '',
        category:   r.category   || 'other',
        confidence: typeof r.confidence === 'number' ? r.confidence : 0.5,
        reason:     r.reason     || ''
      };
    }).filter(r => r.email);

    res.json({ results });
  } catch (err) {
    console.error('AI classify error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Fetch photos for senders from Google Contacts + Other Contacts
// Returns { "email@x.com": "https://...photo" }
app.get('/api/google/contact-photos', async (req, res) => {
  const auth = getAuthenticatedClient();
  if (!auth) return res.status(401).json({ error: 'Not connected' });

  try {
    const people = google.people({ version: 'v1', auth });
    const map = {};

    // 1. Primary contacts (manually added)
    let pageToken;
    do {
      const { data } = await people.people.connections.list({
        resourceName: 'people/me',
        personFields: 'emailAddresses,photos',
        pageSize: 1000,
        pageToken
      });
      (data.connections || []).forEach(p => {
        const photo = p.photos?.find(ph => !ph.default)?.url;
        if (!photo) return;
        (p.emailAddresses || []).forEach(e => {
          const v = (e.value || '').toLowerCase();
          if (v) map[v] = photo;
        });
      });
      pageToken = data.nextPageToken;
    } while (pageToken);

    // 2. Other Contacts (auto-saved from emails you've exchanged with)
    pageToken = undefined;
    do {
      const { data } = await people.otherContacts.list({
        readMask: 'emailAddresses,photos',
        pageSize: 1000,
        pageToken
      });
      (data.otherContacts || []).forEach(p => {
        const photo = p.photos?.find(ph => !ph.default)?.url;
        if (!photo) return;
        (p.emailAddresses || []).forEach(e => {
          const v = (e.value || '').toLowerCase();
          if (v && !map[v]) map[v] = photo;  // don't overwrite primary
        });
      });
      pageToken = data.nextPageToken;
    } while (pageToken);

    res.json({ photos: map, count: Object.keys(map).length });
  } catch (err) {
    console.error('Contact photos error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── WHATSAPP BUSINESS API (META CLOUD) ───────────────────

// Verification endpoint for Meta Webhooks
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('✅ WhatsApp Webhook vérifié');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Receive messages from WhatsApp
app.post('/api/whatsapp/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
      const msg = body.entry[0].changes[0].value.messages[0];
      const from = msg.from; // Phone number
      const text = msg.text?.body;
      console.log(`📩 Nouveau message WhatsApp de ${from}: ${text}`);
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Send message via WhatsApp
app.post('/api/whatsapp/send', async (req, res) => {
  const { to, message } = req.body;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    return res.status(400).json({ error: 'WhatsApp non configuré dans .env' });
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message }
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('WhatsApp send error:', err.message);
    res.status(500).json({ error: 'Échec de l\'envoi WhatsApp' });
  }
});


// ─── START ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🚀 Freescale backend running on http://localhost:${PORT}`);
  console.log(`  📧 Gmail OAuth:  http://localhost:${PORT}/auth/google`);
  console.log(`  📊 API Status:   http://localhost:${PORT}/api/gmail/status`);
  console.log(`  💡 Health:       http://localhost:${PORT}/api/health\n`);

  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your_client_id_here') {
    console.log('  ⚠️  GOOGLE_CLIENT_ID non configuré !');
    console.log('  📝 Édite backend/.env avec tes identifiants Google Cloud.');
    console.log('  📖 Voir backend/.env.example pour les instructions.\n');
  }
});
