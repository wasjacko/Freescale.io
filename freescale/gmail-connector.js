// Freescale — Gmail API connector (frontend helper)
const BACKEND_URL = 'https://beige-camels-tease.loca.lt';
const GOOGLE_REDIRECT_URI = 'https://beige-camels-tease.loca.lt/auth/google/callback';

window.FreescaleGmail = {
  // Check if Gmail is connected
  async getStatus() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/gmail/status`);
      return await res.json();
    } catch {
      return { configured: false, connected: false };
    }
  },

  // Get user profile
  async getProfile() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/gmail/profile`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  // Fetch emails from Gmail
  async getMessages(max = 20, query = 'in:inbox') {
    try {
      const res = await fetch(`${BACKEND_URL}/api/gmail/messages?max=${max}&q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        if (res.status === 401) return { error: 'disconnected', messages: [] };
        return { error: 'fetch_failed', messages: [] };
      }
      return await res.json();
    } catch {
      return { error: 'network', messages: [] };
    }
  },

  // Get full message body
  async getMessage(id) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/gmail/messages/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  // Get the complete conversation (sent + received) with one email
  async getConversation(email, max = 100) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/gmail/conversation?email=${encodeURIComponent(email)}&max=${max}`);
      if (!res.ok) return { messages: [], error: 'fetch_failed' };
      return await res.json();
    } catch {
      return { messages: [], error: 'network' };
    }
  },

  // Build an attachment URL (served by backend)
  attachmentUrl(messageId, attachmentId, filename, mime) {
    return `${BACKEND_URL}/api/gmail/messages/${messageId}/attachments/${attachmentId}?filename=${encodeURIComponent(filename)}&mime=${encodeURIComponent(mime || 'application/octet-stream')}`;
  },

  // Send (or reply to) an email. attachments: [{ filename, mimeType, dataBase64 }]
  async sendEmail({ to, subject, body, attachments = [], threadId, inReplyTo }) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/gmail/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body, attachments, threadId, inReplyTo })
      });
      const data = await res.json();
      if (!res.ok) return { error: data?.error || 'send_failed' };
      return data;
    } catch (err) {
      return { error: err.message };
    }
  },

  // AI : classify senders into client / promo / other
  async classifyContacts(senders) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/classify-contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senders })
      });
      const data = await res.json();
      if (!res.ok) return { error: data?.error || 'classify_failed', results: [] };
      return data;
    } catch (err) {
      return { error: err.message, results: [] };
    }
  },

  // AI endpoints — call backend → Claude
  async ai(kind, { conversation, contactName, intent }) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation, contactName, intent })
      });
      const data = await res.json();
      if (!res.ok) return { error: data?.error || 'ai_failed' };
      return data;
    } catch (err) {
      return { error: err.message };
    }
  },

  // Fetch real Google profile photos for all contacts
  async getContactPhotos() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/google/contact-photos`);
      if (!res.ok) return {};
      const data = await res.json();
      return data.photos || {};
    } catch {
      return {};
    }
  },

  // Disconnect Gmail
  async disconnect() {
    try {
      await fetch(`${BACKEND_URL}/api/gmail/disconnect`, { method: 'POST' });
      return true;
    } catch {
      return false;
    }
  },

  // Start OAuth flow (opens Google consent in current window)
  connect() {
    window.location.href = `${BACKEND_URL}/auth/google`;
  },

  // Check if backend is running
  async isBackendAlive() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  // Convert Gmail message to Freescale message format
  toFreescaleMessage(gmailMsg, index) {
    const dateStr = gmailMsg.date;
    let timeDisplay = '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      const diffMin = Math.floor(diffMs / 60000);
      const diffH = Math.floor(diffMs / 3600000);
      const diffD = Math.floor(diffMs / 86400000);
      if (diffMin < 60) timeDisplay = `il y a ${diffMin} min`;
      else if (diffH < 24) timeDisplay = `il y a ${diffH}h`;
      else if (diffD === 1) timeDisplay = 'hier';
      else timeDisplay = `il y a ${diffD}j`;
    } catch {
      timeDisplay = dateStr;
    }

    return {
      id: `gmail_${gmailMsg.id}`,
      gmailId: gmailMsg.id,
      clientId: null,               // Will be matched by contact matching later
      source: 'gmail',
      channel: gmailMsg.subject,
      from: gmailMsg.from,
      fromEmail: gmailMsg.fromEmail,
      avatarUrl: gmailMsg.avatarUrl, // Gravatar URL from backend
      role: '',
      time: timeDisplay,
      unread: gmailMsg.unread,
      body: gmailMsg.snippet,
      subject: gmailMsg.subject,
      extractedTasks: []           // Placeholder for future AI extraction
    };
  }
};
