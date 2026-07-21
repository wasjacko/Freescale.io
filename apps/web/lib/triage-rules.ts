/**
 * Pure rule-based email classifier — sender + subject pattern matching.
 * Runs server-side, no API call, no LLM cost, no env vars required.
 *
 * Catches ~90% of obvious cases:
 *   - noreply / notification / mailer senders → notif
 *   - marketing domains / unsubscribe footers / sales subjects → promo
 *   - named human at non-mass-mailer address → client (default)
 *
 * The remaining ~10% ambiguous cases get the default "client" — it's
 * the bucket the user MOST wants to see, so erring on this side is
 * safer than accidentally burying real correspondence in "promo".
 *
 * Mue's LLM classifier (classifyAllUncategorized) can refine these
 * later on convs where category_confidence is low.
 *
 * Kept in a non-"use server" file because Server Action modules in
 * Next.js can only export async functions; this is a pure sync helper.
 */

export type Category =
  | "client"
  | "prospect"
  | "prestataire"
  | "collaborateur"
  | "promo"
  | "notif"
  | "other";

const NOTIF_SENDER_LOCAL =
  /^(no[-_.]?reply|noreply|notification|notifications|alerts?|alert|automated|automated[-_.]?reply|mailer|mailer[-_.]?daemon|postmaster|do[-_.]?not[-_.]?reply|donotreply|system|admin|root|bounce|bounces|robot|bot|webmaster)$/i;
const NOTIF_SUBJECT =
  /\b(receipt|invoice|order|shipped|delivered|tracking|payment|payment.confirmed|verify|verification|2fa|otp|password.reset|reset.your.password|security.alert|sign.?in|signed.in|new.login|connexion|expir(es|ed|ation)|renewal|confirm|confirmed your|your.code|code.de.v[ée]rification|facture|re[cç]u|votre commande|livraison|alerte|notif|notification|backup|sync|invitation|meeting|calendar|événement|job.?alert|nouvelles? offres?|offres? d['’ ]?(emploi|alternance))\b/i;
const PROMO_SUBJECT =
  /(unsubscribe|opt.out|view.in.browser|se.d[ée]sinscrire|newsletter|black.friday|cyber.monday|sale|soldes?|promo|promotion|% off|-\d+\s*%|(?:jusqu['’]?\s*[aà]\s*)?\d+\s*%\s*(?:de\s*)?(?:remise|r[ée]duction)|free.shipping|livraison.gratuite|exclusive|exclusif|webinar|register.now|inscrivez-vous|new.collection|nouvelle.collection|gift.card|carte cadeau|early.access|acc[èe]s.anticip[ée]|join.us.for|inscrivez.vous.au)/i;
const PROMO_SENDER_LOCAL =
  /^(marketing|newsletter|news|team|crew|club|deals?|offers?|promotions?|sales?|membership|community|brand|store|shop|notify)$/i;
const PROMO_DOMAIN =
  /(\.email\.|\.marketing\.|mailgun\.org|sendgrid\.net|mailchimp\.com|mlsend\.com|customer\.io|hubspot|mailerlite|sendinblue|brevo|klaviyo|substack|beehiiv|notif?ic?ation|news[-.])/i;

export function quickClassify(input: {
  fromEmail: string;
  subject: string;
  preview: string;
}): Category {
  const email = (input.fromEmail || "").toLowerCase();
  const subject = input.subject || "";
  const preview = input.preview || "";
  const localPart = email.split("@")[0] ?? "";
  const domain = email.split("@")[1] ?? "";

  // Strong notif signals first — automated transactional mail has the
  // narrowest sender patterns and shouldn't be confused with promo.
  if (NOTIF_SENDER_LOCAL.test(localPart)) {
    // …unless the subject screams promo (some companies send marketing
    // from no-reply, sigh). Promo subject wins over notif sender pattern.
    if (PROMO_SUBJECT.test(subject)) return "promo";
    return "notif";
  }
  if (NOTIF_SUBJECT.test(subject)) return "notif";

  // Promo signals — marketing senders, mass-mailer infra, sales-y subject.
  if (PROMO_SUBJECT.test(subject)) return "promo";
  if (PROMO_DOMAIN.test(domain)) return "promo";
  if (PROMO_SENDER_LOCAL.test(localPart)) {
    // Some companies use "team@" for both newsletters and real human
    // mail. Only fire if the body also screams promo (unsubscribe footer).
    if (/unsubscribe|se.d[ée]sinscrire|view.in.browser/i.test(preview)) return "promo";
  }
  if (/unsubscribe|view.in.browser|opt.out/i.test(preview)) return "promo";

  // Default: assume human correspondence. Safer to over-include client
  // than under-include — the user can re-categorize manually if wrong.
  return "client";
}
