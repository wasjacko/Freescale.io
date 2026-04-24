// Freescale — Gmail API connector (SIMULATED)
const BACKEND_URL = 'http://localhost:3001';

window.FreescaleGmail = {
  async getStatus() {
    return { configured: true, connected: true };
  },

  async getProfile() {
    return { email: 'moi@freescale.io', name: 'Moi' };
  },

  async getMessages(max = 20, query = 'in:inbox') {
    return { messages: [], error: null };
  },

  async getMessage(id) {
    return null;
  },

  async getConversation(email, max = 100) {
    return { messages: [], error: null };
  },

  attachmentUrl(messageId, attachmentId, filename, mime) {
    return '#';
  },

  async sendEmail({ to, subject, body, attachments = [], threadId, inReplyTo }) {
    return { id: 'sim_sent_' + Date.now() };
  },

  async classifyContacts(senders) {
    // Simulated classification results
    const results = senders.map(s => {
       let cat = 'other';
       if (['Victor','Capucine','Thomas','Matilda'].some(n => s.name.includes(n))) cat = 'client';
       if (['Amazon','LinkedIn'].some(n => s.name.includes(n))) cat = 'promo';
       return { email: s.email, name: s.name, category: cat, confidence: 0.95 };
    });
    return { results };
  },

  async ai(kind, { conversation, contactName, intent }) {
    return { result: "Réponse IA simulée." };
  },

  async getContactPhotos() {
    return {};
  },

  async disconnect() {
    return true;
  },

  connect() {
    console.log('[Freescale] Simulated connect');
    window.location.search = '?gmail_connected=true';
  },

  async isBackendAlive() {
    return true; // Always alive in simulation
  },

  toFreescaleMessage(gmailMsg, index) {
    return {
      id: `gmail_${gmailMsg.id}`,
      gmailId: gmailMsg.id,
      clientId: null,
      source: 'gmail',
      channel: gmailMsg.subject,
      from: gmailMsg.from,
      fromEmail: gmailMsg.fromEmail,
      avatarUrl: gmailMsg.avatarUrl,
      role: '',
      time: 'À l\'instant',
      unread: gmailMsg.unread,
      body: gmailMsg.snippet,
      subject: gmailMsg.subject,
      extractedTasks: []
    };
  }
};
