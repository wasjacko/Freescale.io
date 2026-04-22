// Freescale — Backend server (Gmail OAuth + API)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ───────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:8002', credentials: true }));
app.use(express.json());

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
      'https://www.googleapis.com/auth/gmail.readonly',   // Read emails
      'https://www.googleapis.com/auth/gmail.labels',     // Read labels
      'https://www.googleapis.com/auth/userinfo.email',   // Get user email
      'https://www.googleapis.com/auth/userinfo.profile', // Get user name
    ]
  });
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

// Get full message body
app.get('/api/gmail/messages/:id', async (req, res) => {
  const auth = getAuthenticatedClient();
  if (!auth) return res.status(401).json({ error: 'Not connected' });

  try {
    const gmail = google.gmail({ version: 'v1', auth });
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: req.params.id,
      format: 'full'
    });

    const headers = detail.data.payload?.headers || [];
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

    // Extract body text
    let body = '';
    function extractText(parts) {
      if (!parts) return;
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.parts) {
          extractText(part.parts);
        }
      }
    }

    if (detail.data.payload?.body?.data) {
      body = Buffer.from(detail.data.payload.body.data, 'base64').toString('utf-8');
    } else {
      extractText(detail.data.payload?.parts);
    }

    // Parse from
    const fromRaw = getHeader('From');
    const fromMatch = fromRaw.match(/^"?([^"<]*?)"?\s*<?([^>]*)>?$/);

    res.json({
      id: detail.data.id,
      threadId: detail.data.threadId,
      from: fromMatch?.[1]?.trim() || fromRaw,
      fromEmail: fromMatch?.[2]?.trim() || fromRaw,
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      body: body,
      snippet: detail.data.snippet,
      unread: detail.data.labelIds?.includes('UNREAD') || false,
      labels: detail.data.labelIds || []
    });
  } catch (err) {
    console.error('Message detail error:', err.message);
    res.status(500).json({ error: 'Failed to fetch message' });
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
