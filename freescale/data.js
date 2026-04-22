// Freescale — fake data for prototype
window.FreescaleData = (function() {
  const clients = [
    { id: 'acme',     name: 'Sarah Kline',      color: '#5B5BF0', avatar: 'SK', avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg', tags: ['SaaS B2B', 'React'], rate: 75, active: true, lastActivity: 'il y a 12 min', unread: 4, value: 8400, status: 'ongoing' },
    { id: 'lumen',    name: 'Marc Lavigne',     color: '#F59E0B', avatar: 'ML', avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg', tags: ['Design', 'Next.js'], rate: 95, active: true, lastActivity: 'il y a 2h', unread: 2, value: 12600, status: 'ongoing' },
    { id: 'northp',   name: 'Léa Bonnet',       color: '#16A349', avatar: 'LB', avatarUrl: 'https://randomuser.me/api/portraits/women/68.jpg', tags: ['Agency'], rate: 70, active: true, lastActivity: 'hier', unread: 0, value: 4200, status: 'ongoing' },
    { id: 'peli',     name: 'Julie Cassan',     color: '#E11D48', avatar: 'JC', avatarUrl: 'https://randomuser.me/api/portraits/women/17.jpg', tags: ['Lead', 'IA'], rate: 0, active: false, lastActivity: 'il y a 3j', unread: 1, value: 0, status: 'deal' },
    { id: 'orion',    name: 'Tomás Fernandez',  color: '#0EA5E9', avatar: 'TF', avatarUrl: 'https://randomuser.me/api/portraits/men/75.jpg', tags: ['Hardware'], rate: 85, active: true, lastActivity: 'il y a 4h', unread: 0, value: 6800, status: 'ongoing' },
    { id: 'fable',    name: 'Hugo Marquis',     color: '#7C3AED', avatar: 'HM', avatarUrl: 'https://randomuser.me/api/portraits/men/22.jpg', tags: ['E-commerce'], rate: 60, active: true, lastActivity: 'il y a 1j', unread: 0, value: 2100, status: 'ongoing' },
    { id: 'kite',     name: 'Emma Rodriguez',   color: '#0B8276', avatar: 'ER', avatarUrl: 'https://randomuser.me/api/portraits/women/46.jpg', tags: ['Lead'], rate: 0, active: true, lastActivity: 'il y a 6j', unread: 0, value: 0, status: 'deal' },
    { id: 'noah',     name: 'Noah Bensimon',    color: '#8B5CF6', avatar: 'NB', avatarUrl: 'https://randomuser.me/api/portraits/men/12.jpg', tags: ['Freelance'], rate: 80, active: true, lastActivity: 'il y a 3h', unread: 0, value: 3200, status: 'ongoing' },
    { id: 'chloe',    name: 'Chloé Marchetti',  color: '#EC4899', avatar: 'CM', avatarUrl: 'https://randomuser.me/api/portraits/women/25.jpg', tags: ['Brand'], rate: 65, active: true, lastActivity: 'il y a 2j', unread: 0, value: 1800, status: 'ongoing' },
    { id: 'raj',      name: 'Raj Patel',        color: '#F97316', avatar: 'RP', avatarUrl: 'https://randomuser.me/api/portraits/men/55.jpg', tags: ['SaaS'], rate: 90, active: true, lastActivity: 'il y a 5j', unread: 0, value: 5400, status: 'ongoing' },
    { id: 'ines',     name: 'Inès Dubois',      color: '#14B8A6', avatar: 'ID', avatarUrl: 'https://randomuser.me/api/portraits/women/81.jpg', tags: ['Startup'], rate: 70, active: true, lastActivity: 'il y a 8j', unread: 0, value: 2400, status: 'ongoing' },
  ];

  const sources = [
    { id: 'gmail',     label: 'Gmail',     color: 'var(--gmail)',     soft: 'var(--gmail-soft)',     glyph: 'mail',     logo: 'assets/channels/gmail.svg' },
    { id: 'whatsapp',  label: 'WhatsApp',  color: 'var(--whatsapp)',  soft: 'var(--whatsapp-soft)',  glyph: 'whatsapp', logo: 'assets/channels/whatsapp.svg' },
    { id: 'instagram', label: 'Instagram', color: 'var(--instagram)', soft: 'var(--instagram-soft)', glyph: 'camera',   logo: 'assets/channels/instagram.svg' },
  ];

  // Messages + extracted tasks (signature feature)
  const messages = [
    {
      id: 'm1', clientId: 'acme', source: 'slack', channel: '#product-ship',
      from: 'Sarah Kline', role: 'PM',
      time: '09:12', unread: true,
      body: "Salut ! On a vu le PR pour le checkout, nickel. Tu peux pousser le fix du bug Safari avant jeudi 18h ? Et il nous faudrait la facture d'avril avant vendredi stp 🙏",
      extractedTasks: [
        { id: 't1', title: 'Pousser le fix bug Safari — checkout', due: 'jeu. 18:00', priority: 'high', billable: true, est: '2h', confidence: 0.94 },
        { id: 't2', title: 'Envoyer facture avril à Acme Corp',   due: 'ven. 17:00', priority: 'med',  billable: false, est: '15 min', confidence: 0.98 }
      ]
    },
    {
      id: 'm2', clientId: 'lumen', source: 'gmail',
      from: 'Marc Lavigne', role: 'Directeur',
      time: '08:47', unread: true,
      body: "Hello, petite urgence — le client final nous demande une démo lundi 10h. Peux-tu préparer un staging avec les 3 variantes de la page pricing ? Je te fais un brief voice ce soir.",
      extractedTasks: [
        { id: 't3', title: 'Préparer staging pricing — 3 variantes',  due: 'lun. 09:00', priority: 'high', billable: true, est: '4h', confidence: 0.88 },
        { id: 't4', title: 'Écouter brief voice de Marc', due: 'ce soir', priority: 'med', billable: false, est: '10 min', confidence: 0.76 }
      ]
    },
    {
      id: 'm3', clientId: 'peli', source: 'gmail',
      from: 'Julie Cassan', role: 'Head of AI',
      time: '07:30', unread: true,
      body: "Bonjour ! Suite à notre call, on est ok pour avancer. Pouvez-vous nous envoyer une proposition commerciale (scope, délais, TJM) d'ici mercredi ? On veut démarrer la 1ère semaine de mai.",
      extractedTasks: [
        { id: 't5', title: 'Rédiger proposition commerciale Pelican Labs',  due: 'mer. 12:00', priority: 'high', billable: false, est: '1h30', confidence: 0.96, deal: true }
      ]
    },
    {
      id: 'm4', clientId: 'orion', source: 'discord', channel: '#dev-sync',
      from: 'Tomás Fernandez', role: 'Lead dev',
      time: 'hier 17:40', unread: false,
      body: "Le script de migration passe en local mais j'ai des warnings bizarres sur prod. Je te mets le log en DM, tu peux jeter un œil demain matin ?",
      extractedTasks: [
        { id: 't6', title: 'Debug script migration — logs prod', due: 'aujourd\'hui', priority: 'med', billable: true, est: '1h', confidence: 0.82 }
      ]
    },
    {
      id: 'm5', clientId: 'northp', source: 'whatsapp',
      from: 'Léa Bonnet', role: 'Founder',
      time: 'hier 14:20', unread: false,
      body: "Merci pour la livraison 🙌 Quand veux-tu qu'on planifie le kickoff du module reporting ?",
      extractedTasks: [
        { id: 't7', title: 'Proposer 3 créneaux kickoff reporting — Léa', due: 'cette semaine', priority: 'low', billable: false, est: '5 min', confidence: 0.91 }
      ]
    },
    {
      id: 'm6', clientId: 'fable', source: 'telegram',
      from: 'Hugo Marquis', role: 'CTO',
      time: 'il y a 2j',
      body: "Yo, on peut caler 30 min cette semaine pour parler de la roadmap Q3 ? Surtout la partie search.",
      extractedTasks: [
        { id: 't8', title: 'Caler 30 min roadmap Q3 — Hugo', due: 'cette semaine', priority: 'low', billable: false, est: '5 min', confidence: 0.89 }
      ]
    }
  ];

  // "Aujourd'hui" brief — tasks prioritized by copilot
  const todayBrief = {
    date: 'lundi 20 avril',
    summary: "3 tâches urgentes, 2 facturables (5h30). 1 proposition commerciale à boucler avant mercredi. Emma Rodriguez n'a pas répondu depuis 4 jours — relance douce suggérée.",
    focus: [
      { id: 'f1', taskId: 't3', title: 'Préparer staging pricing — 3 variantes', client: 'Lumen Studio', clientColor: '#F59E0B', due: 'lun. 09:00', est: '4h', billable: true, revenue: 380, priority: 'high', source: 'gmail', from: 'Marc Lavigne' },
      { id: 'f2', taskId: 't5', title: 'Rédiger proposition commerciale',       client: 'Pelican Labs', clientColor: '#E11D48', due: 'mer. 12:00', est: '1h30', billable: false, revenue: 0, priority: 'high', deal: true, source: 'gmail', from: 'Julie Cassan' },
      { id: 'f3', taskId: 't1', title: 'Pousser fix bug Safari — checkout',     client: 'Acme Corp', clientColor: '#5B5BF0', due: 'jeu. 18:00', est: '2h', billable: true, revenue: 150, priority: 'high', source: 'slack', from: 'Sarah Kline' },
      { id: 'f4', taskId: 't2', title: 'Envoyer facture avril à Acme Corp',     client: 'Acme Corp', clientColor: '#5B5BF0', due: 'ven. 17:00', est: '15 min', billable: false, revenue: 0, priority: 'med', source: 'slack', from: 'Sarah Kline' },
      { id: 'f5', taskId: 't6', title: 'Debug script migration — logs prod',    client: 'Orion Robotics', clientColor: '#0EA5E9', due: 'aujourd\'hui', est: '1h', billable: true, revenue: 85, priority: 'med', source: 'discord', from: 'Tomás Fernandez' },
    ],
    nudges: [
      { id: 'n1', kind: 'follow_up', client: 'Emma Rodriguez / Horizon',  silenceDays: 4, suggestion: "Relance — \"ça avance toujours pour la v2 ?\"" },
      { id: 'n2', kind: 'invoice',   client: 'Lumen Studio',   note: 'Facture #2025-014 payable hier (480€)' },
      { id: 'n3', kind: 'deal',      client: 'Kite Mobile',    note: 'Deal en stagnation depuis 6 jours' },
    ]
  };

  // KPI data for charts
  const kpis = {
    billable:  { value: '23h 40', label: 'Heures facturables', delta: '+4h vs sem. dernière', trend: [12, 15, 18, 14, 22, 25, 23], target: 30 },
    revenue:   { value: '9 840 €', label: 'Revenu d\'avril',   delta: '+18% vs mars', trend: [6200, 7100, 7900, 8400, 8900, 9200, 9840] },
    response:  { value: '2h 12', label: 'Temps de réponse',   delta: '–18 min vs sem. dernière', trend: [180, 175, 160, 155, 148, 140, 132] },
    deals:     { value: '3',     label: 'Deals en négo',       delta: '47 800 € de pipe',    trend: [1, 1, 2, 2, 3, 3, 3] }
  };

  return { clients, sources, messages, todayBrief, kpis };
})();
