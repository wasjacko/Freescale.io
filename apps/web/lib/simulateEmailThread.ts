// Génère un fil d'emails réaliste (3 à 5 messages) à partir des métadonnées
// d'une conversation. Utilisé en démo / quand le live-fetch Gmail ne renvoie
// rien : on évite « Aucun message » et on montre à quoi ressemble Freescale.

import type { Conversation, Message } from "@/lib/types";

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

const hm = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const dateLong = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full;

const ME = {
  name: "Wacil Ait",
  email: "wacil@freescale.site",
  signature: "—\nWacil · Freescale",
};

/**
 * Renvoie un fil d'emails réaliste (3-5 messages, alternés in/out) avec
 * salutations, corps et signature. Ne pas confondre avec les vraies données :
 * c'est purement démo.
 */
export function simulateEmailThread(conv: Conversation): Message[] {
  const senderName = conv.name;
  const senderEmail = conv.contactEmail ?? `${firstName(conv.name).toLowerCase()}@exemple.fr`;
  const subject = conv.subject ?? "Notre échange";
  const prenom = firstName(senderName);
  const moi = firstName(ME.name);

  const last = conv.lastAtIso ? new Date(conv.lastAtIso).getTime() : Date.now();
  const t = (offsetMs: number) => new Date(last - offsetMs).toISOString();

  // Construit dynamiquement un fil cohérent avec le sujet / preview de la conv.
  const sample = (conv.preview ?? "").trim();

  const draft = [
    {
      // Premier message client : ouverture du sujet (il y a ~5 jours)
      offsetMs: 5 * MS_DAY,
      dir: "in" as const,
      sender: { name: senderName, email: senderEmail },
      text:
        `Bonjour ${moi},\n\n` +
        `Petit message rapide concernant « ${subject} ». Pour faire suite à notre dernier échange, ` +
        `je voulais voir où on en était de ton côté et caler les prochaines étapes.\n\n` +
        `N'hésite pas si tu as besoin d'éléments complémentaires de mon côté.\n\n` +
        `Bonne journée,\n${prenom}`,
    },
    {
      // Ma réponse : confirmation + question (il y a ~4 jours)
      offsetMs: 4 * MS_DAY + 2 * MS_HOUR,
      dir: "out" as const,
      sender: { name: ME.name, email: ME.email },
      text:
        `Hello ${prenom},\n\n` +
        `Merci pour ton message — c'est noté de mon côté. Je m'occupe de regrouper ce qu'il nous faut ` +
        `cette semaine et je te reviens avant vendredi avec un point clair.\n\n` +
        `Une question rapide : tu préfères qu'on cale un call de 15 min ou je te fais un récap écrit ?\n\n` +
        ME.signature,
    },
    {
      // Relance client : précision + pj évoquée (il y a ~2 jours)
      offsetMs: 2 * MS_DAY,
      dir: "in" as const,
      sender: { name: senderName, email: senderEmail },
      text:
        `Re-bonjour ${moi},\n\n` +
        `Parfait, va pour un récap écrit, c'est plus simple à partager en interne ensuite. ` +
        `Je t'envoie en parallèle le brief mis à jour (je l'ai allégé pour qu'il soit plus actionnable).\n\n` +
        `Dis-moi ce que tu en penses dès que tu as un moment.\n\n` +
        `Merci d'avance,\n${prenom}`,
    },
    {
      // Ma réponse : ack + ETA (hier)
      offsetMs: 1 * MS_DAY,
      dir: "out" as const,
      sender: { name: ME.name, email: ME.email },
      text:
        `Reçu ${prenom}, je regarde le brief aujourd'hui et je te reviens en début de semaine ` +
        `prochaine avec mes retours.\n\n` +
        `À très vite,\n` +
        ME.signature,
    },
    {
      // Message récent (le « preview » de la liste) — ferme la boucle
      offsetMs: 0,
      dir: "in" as const,
      sender: { name: senderName, email: senderEmail },
      text:
        (sample.length > 0 ? `${sample}\n\n` : "") +
        `Merci ${moi}, je reste dispo si besoin de précisions.\n\n` +
        `Bonne journée,\n${prenom}`,
    },
  ];

  return draft.map((m, i) => {
    const iso = t(m.offsetMs);
    return {
      id: `sim-${conv.id}-${i}`,
      dir: m.dir,
      text: m.text,
      time: hm(iso),
      sentAtIso: iso,
      subject,
      senderName: m.sender.name,
      senderEmail: m.sender.email,
      dateLong: dateLong(iso),
    };
  });
}
