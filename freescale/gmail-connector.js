// Freescale — Gmail API connector (frontend helper)
const BACKEND_URL = 'http://localhost:3001';

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
      role: '',
      time: timeDisplay,
      unread: gmailMsg.unread,
      body: gmailMsg.snippet,
      subject: gmailMsg.subject,
      extractedTasks: []           // Placeholder for future AI extraction
    };
  }
};
