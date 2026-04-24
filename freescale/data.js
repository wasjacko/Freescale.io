// Freescale — data (initially empty, populated via connectors)
window.FreescaleData = (function() {
  // Start empty as requested
  const clients = [];

  const sources = [
    { id: 'gmail',     label: 'Gmail',     color: 'var(--gmail)',     soft: 'var(--gmail-soft)',     glyph: 'mail',     logo: 'assets/channels/gmail.svg' },
    { id: 'whatsapp',  label: 'WhatsApp',  color: 'var(--whatsapp)',  soft: 'var(--whatsapp-soft)',  glyph: 'whatsapp', logo: 'assets/channels/whatsapp.svg' },
    { id: 'instagram', label: 'Instagram', color: 'var(--instagram)', soft: 'var(--instagram-soft)', glyph: 'camera',   logo: 'assets/channels/instagram.svg' },
  ];

  const messages = [];

  // "Aujourd'hui" brief — empty initially
  const todayBrief = {
    date: 'vendredi 24 avril',
    summary: "Bienvenue sur Freescale. Connecte tes canaux pour extraire tes tâches et opportunités.",
    focus: [],
    nudges: []
  };

  // KPI data (starts at zero or baseline)
  const kpis = {
    billable:  { value: '0h', label: 'Heures facturables', delta: 'Nouveau', trend: [0, 0, 0, 0, 0, 0, 0], target: 30 },
    revenue:   { value: '0 €', label: 'Revenu d\'avril',   delta: 'Nouveau', trend: [0, 0, 0, 0, 0, 0, 0] },
    response:  { value: '-', label: 'Temps de réponse',   delta: 'Nouveau', trend: [0, 0, 0, 0, 0, 0, 0] },
    deals:     { value: '0',     label: 'Deals en négo',       delta: '0 € de pipe',    trend: [0, 0, 0, 0, 0, 0, 0] }
  };

  return { clients, sources, messages, todayBrief, kpis };
})();
