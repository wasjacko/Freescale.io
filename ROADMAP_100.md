# 🚀 Freescale — Roadmap 100 étapes pour finir en grandes pompes

> **État actuel : ~45% complete.** Phases 1-2 (Polish + Core) solides. Reste : monétisation, multi-canaux, Mue expansion, compliance, launch.

**Cible Y1 (modèle financier) :** 5 K€ MRR à M12 · ~120 clients payants · 2 tiers (Solo 19€ + Pro 39€) · 3-4 canaux fonctionnels.

**Équipe :** Wacil (CTO solo dev) + Anna-Yumi + Capucine — tous bénévoles 12-18 mois.

**Budget cash disponible :** 12 K€ (12 mois de costs fixes à 1 K€/mo).

---

## 🗺 Vue d'ensemble — 8 phases, 100 étapes

| Phase | Nom | Étapes | Durée estimée | Pourquoi cette phase |
|---|---|---|---|---|
| **A** | Polish & Bug Fixes | 1-10 | 2 sem | Finir le 55% qui reste sur les phases 1-2 |
| **B** | Billing & Monétisation | 11-22 | 3 sem | Sans Stripe, pas de revenu. Bloqueur absolu. |
| **C** | Multi-canaux | 23-42 | 6 sem | Le différenciateur du modèle (sinon "yet another Gmail tool") |
| **D** | Mue Expansion | 43-57 | 4 sem | Ce qui justifie le tier Pro 39€ |
| **E** | Rétention & Engagement | 58-69 | 3 sem | Churn 6% → 4% = projet rentable Y3 |
| **F** | Compliance & Security | 70-79 | 2 sem | Obligatoire pour vendre + dormir tranquille |
| **G** | Tests & Quality | 80-87 | 2 sem | Pour ne plus déployer en flippant |
| **H** | Marketing & Launch | 88-100 | 4 sem | Le grand jour |

**Total : ~26 semaines = 6 mois de dev à temps plein du CTO.**

---

## 🅰️ Phase A — Polish & Bug Fixes (M1, sem 1-2)

> Finir les ~10% restants des phases 1-2 avant d'ouvrir de nouveaux chantiers.

1. **Fix offline indicator** — actuellement détecte le navigateur, pas le serveur. Ajouter un ping `/health` toutes les 30s · *0,5 j*
2. **Skeleton loader Inbox** — quand le sync prend > 2s, montrer 5 skeleton rows au lieu de "Loading..." · *0,5 j*
3. **Empty states tout le SaaS** — Tasks vide, Calendar vide, Mue vide, recherche 0 résultat — tous avec illustration + CTA · *1 j*
4. **Error boundary global** — wrapper Next.js avec fallback friendly + reset button · *0,5 j*
5. **Toaster cohérent** — unifier 3 systèmes de notifications existants en 1 seul (success / error / info / warning) · *0,5 j*
6. **Keyboard shortcuts complets** — finir mapping Cmd+K (search), J/K (next/prev), E (archive), Cmd+Enter (send), Esc (close) · *0,5 j*
7. **Loading states sur server actions** — chaque button avec spinner + désactivation pendant la requête · *1 j*
8. **Optimistic updates** — star, archive, mark-read instantanés UI + rollback si fail · *1 j*
9. **Fix mobile responsive bugs** — audit complet < 768px, fixer thread drawer + bottom sheet Mue · *1 j*
10. **A11y pass** — labels aria, focus management modals, contrast ratios 4.5:1 minimum · *1 j*

**🎯 Sortie Phase A :** SaaS sans bugs visibles, navigation fluide, accessible. Démo possible sans gêne.

---

## 🅱️ Phase B — Billing & Monétisation (M1-M2, sem 3-5)

> Stripe = bloqueur absolu. Sans paiement on ne peut pas encaisser → pas de business.

11. **Setup Stripe account** — créer compte business + activation FR + KYC + ajouter Wacil + cofondateurs · *0,5 j*
12. **Stripe Customer creation** — sur signup, créer customer Stripe automatiquement (`stripe_customer_id` déjà en DB) · *0,5 j*
13. **Plans Stripe** — créer Plan Solo (19€/mo + 114€/an) + Plan Pro (39€/mo + 234€/an) dans Stripe Dashboard · *0,5 j*
14. **Page pricing publique** — `/pricing` avec 2 tiers + toggle mensuel/annuel + boutons "Choisir" · *1 j*
15. **Checkout Stripe Embedded** — flow signup → trial 14j sans CB → "upgrade" → Stripe Checkout → paid · *2 j*
16. **Webhook Stripe** — Cloudflare Worker (`apps/api`) écoute `customer.subscription.*` + sync `profiles.plan` · *1 j*
17. **Trial 14j fonctionnel** — sur signup, set `trial_ends_at = NOW + 14d` · banner countdown · email reminder J-3 · *1 j*
18. **Paywall feature gating** — middleware qui check `profiles.plan` avant chaque action premium · *1 j*
19. **Compteur Mue 50 actions/mo (Solo)** — table `usage_counters` + increment + bloquer à 50 · *1 j*
20. **Page billing settings** — `/app/settings/billing` : plan actuel, prochaine facture, upgrade/downgrade, manage portal Stripe · *1 j*
21. **Email factures auto** — Stripe email natif activé + branding · *0,5 j*
22. **Annual upsell modal** — pendant trial, popup "économise -50% en annuel" avec preview économies · *0,5 j*

**🎯 Sortie Phase B :** un humain peut payer 19€/mois ou 114€/an. Tu peux encaisser tes 5 premiers clients.

---

## 🅲 Phase C — Multi-canaux (M2-M3, sem 6-11)

> Sans multi-canal = "yet another Gmail tool". C'est LE différenciateur ICP du modèle.

### C.1 — Architecture commune (étapes 23-26)

23. **Adapter pattern** — interface `ChannelAdapter` avec `connect()`, `sync()`, `send()`, `disconnect()` · *2 j*
24. **Refactor Gmail en adapter** — réécrire `lib/gmail.ts` pour qu'il implémente `ChannelAdapter` · *1 j*
25. **Unipile integration** — setup compte Unipile (300€/mo budgétté) + clé API + wrapper SDK · *1 j*
26. **Normalisation messages** — mapper messages Slack/WhatsApp/LinkedIn → schema `messages` commun · *1 j*

### C.2 — LinkedIn (étapes 27-30)

27. **LinkedIn OAuth/Unipile** — flow connect via Unipile (eviter API LinkedIn directe = trop complexe) · *2 j*
28. **LinkedIn sync messages** — récupérer DMs + InMails + créer conversations · *1,5 j*
29. **LinkedIn send reply** — envoyer message via Unipile + gérer attachments · *1 j*
30. **LinkedIn UI** — channel logo + filtres + threading propre · *0,5 j*

### C.3 — Slack (étapes 31-34)

31. **Slack OAuth** — créer app Slack + scopes channels:read, im:history, chat:write · *1 j*
32. **Slack sync DMs + mentions** — récupérer DMs + messages où l'user est mentionné · *1,5 j*
33. **Slack threading** — gérer les replies en thread Slack correctement · *1 j*
34. **Slack send** — envoyer message + thread reply · *0,5 j*

### C.4 — Outlook (étapes 35-37)

35. **Outlook OAuth Microsoft Graph** — scope Mail.ReadWrite + Mail.Send · *1,5 j*
36. **Outlook sync via webhooks** — subscribe Microsoft Graph notifications (au lieu de polling) · *1 j*
37. **Outlook send + attachments** — réutiliser le pattern Gmail · *0,5 j*

### C.5 — WhatsApp Business (étapes 38-40)

38. **WhatsApp Business API via Whapi** — setup compte + sandbox + verification numéro · *1,5 j*
39. **WhatsApp sync messages** — webhook recevoir messages entrants · *1 j*
40. **WhatsApp send + templates** — envoyer message + utiliser templates pré-approuvés (compliance Meta) · *1 j*

### C.6 — Instagram + Discord (étapes 41-42)

41. **Instagram DM via Unipile** — connect + sync DMs (creators/agences usecase) · *1,5 j*
42. **Discord DM bot** — créer Discord bot + DM relay vers Freescale · *1 j*

**🎯 Sortie Phase C :** Freescale gère 6 canaux (Gmail + LinkedIn + Slack + Outlook + WhatsApp + Instagram). La promesse "unified inbox" est tenue.

---

## 🅳 Phase D — Mue Expansion (M3-M4, sem 12-15)

> Ce qui justifie le tier Pro 39€. Sans ces features, pas d'upsell.

43. **Ask Mue chat** — chatbot dans le panneau droit · contexte = thread courant + memories utilisateur · *2 j*
44. **Daily digest email** — cron 8h tous les jours · résumé de la journée + tâches urgentes · template HTML · *2 j*
45. **Auto-extract tasks** — quand un message contient "peux-tu faire X pour lundi ?", proposer "Créer tâche" · *2 j*
46. **Tone shifter** — 3 buttons sur draft : Formal / Casual / Friendly · rewrite via Claude · *1 j*
47. **Auto-draft replies** — pré-générer 3 drafts en background sur nouveaux messages · *1,5 j*
48. **Smart inbox / priority sorting** — Mue trie les messages par urgence (LLM batch) · *1,5 j*
49. **Sentiment detection** — détecte messages "client énervé" + flag rouge automatique · *1 j*
50. **Auto-categorization improved** — passer du heuristique au LLM pour les cas ambigus · *1 j*
51. **Translate messages** — bouton translate FR↔EN sur chaque message (Pro only) · *0,5 j*
52. **Templates avec variables** — `{{contact_name}}`, `{{my_company}}`, etc. + autocompletion · *1 j*
53. **Knowledge base memories** — UI pour ajouter/éditer manuellement les `mue_memories` · *1,5 j*
54. **Mue learn from corrections** — quand user édite un draft, Mue stocke la correction comme preference · *1 j*
55. **Voice input pour Mue** — dictée vocale via Web Speech API · *0,5 j*
56. **Mue side panel collapsible** — pouvoir cacher/montrer + raccourci Cmd+J · *0,5 j*
57. **Anthropic prompt caching** — implémenter cache 90% sur input system prompts · économie 50% sur API · *1 j*

**🎯 Sortie Phase D :** Mue n'est plus un assistant basique, c'est un vrai copilote. Le tier Pro 39€ a 7-8 features Pro-only valables.

---

## 🅴 Phase E — Rétention & Engagement (M4-M5, sem 16-18)

> Réduire le churn de 6% à 4%/mo double presque le LTV. C'est LE levier rentabilité.

58. **Onboarding < 5 min** — auto-connexion Gmail dès signup · skip questions non-essentielles · 1er brief Mue dans la 1ère session · *2 j*
59. **Sean Ellis survey in-app** — popup à la 3ème session : "À quel point seriez-vous déçu sans Freescale ?" · *0,5 j*
60. **Cancellation flow** — quand user clique "Annuler abonnement" : exit survey 1 question + offre "1 mois free pour rester" · *1 j*
61. **Weekly digest email** — vendredi 18h : "Cette semaine, Mue t'a fait gagner X minutes" + résumé · *1 j*
62. **NPS quarterly survey** — popup tous les 3 mois après 3 mois d'usage : NPS 0-10 · *0,5 j*
63. **Streak feature** — gamification soft "tu utilises Freescale depuis X jours d'affilée" · *0,5 j*
64. **Push notifications opt-in** — pour rappels (boomerang, daily brief, urgent message) · *1 j*
65. **Aha moment tracking** — Posthog event quand user fait : connecte Gmail + ouvre Mue brief + utilise tag · *0,5 j*
66. **Re-engagement email** — si user inactif 7j, email "Tu nous manques, voici ce qui s'est passé sans toi" · *1 j*
67. **Référral program** — chaque user a un code unique · 1 mois free par filleul · auto Stripe coupon · *1,5 j*
68. **Email signature avec backlink** — option "[Sent via Freescale]" en bas des emails sortants (acquisition virale) · *0,5 j*
69. **Boomerang reminders** — si pas de réponse à un mail envoyé après 3 jours, notif "Relancer ?" · *1 j*

**🎯 Sortie Phase E :** churn divisé par 1,5 → LTV multiplié par 1,5 → projet rentable Y3 au lieu de Y4.

---

## 🅵 Phase F — Compliance & Security (M5, sem 19-20)

> Obligatoire pour vendre légalement + protéger les founders.

70. **Privacy policy** — page `/privacy` rédigée + lien dans footer + accepter au signup · *1 j*
71. **Terms of service** — page `/terms` + lien · *0,5 j*
72. **Cookie banner GDPR** — bandeau accept/reject + cookies obligatoires uniquement par défaut · *0,5 j*
73. **GDPR data export** — endpoint user qui télécharge toutes ses données en JSON · *1 j*
74. **GDPR right to be forgotten** — bouton "Supprimer mon compte" qui purge tout + cascade RLS · *0,5 j*
75. **2FA TOTP** — colonne déjà prête · UI setup avec QR code + recovery codes · *1,5 j*
76. **Audit log** — table `audit_logs` + log des actions sensibles (login, payment, channel connect, delete) · *1 j*
77. **Rate limiting** — middleware sur server actions + Cloudflare protection · *1 j*
78. **Sentry intégration** — error tracking côté front + back + alerts Slack · *0,5 j*
79. **Audit pen-test léger** — bug bounty FR ou audit freelance (250€ budgétté) · *2 j externes*

**🎯 Sortie Phase F :** prêt pour audit RGPD + suffisamment sécurisé pour vendre à des freelances pros.

---

## 🅶 Phase G — Tests & Quality (M5-M6, sem 21-22)

> Pour arrêter de déployer en flippant. CTO solo = pas le droit aux bugs en prod.

80. **Setup Vitest** — config Vitest dans `apps/web` + `apps/api` · *0,5 j*
81. **Tests unitaires actions critiques** — Stripe webhook, Mue suggestReplies, OAuth flows · *2 j*
82. **Tests E2E Playwright** — signup → trial → paid → cancel · scénario complet · *2 j*
83. **Tests E2E channels** — connect Gmail → sync → reply (mock OAuth) · *1 j*
84. **CI strict** — retirer `continue-on-error: true` du workflow · tests bloquants · *0,5 j*
85. **Pre-commit hooks** — husky + lint-staged · biome lint + format auto · *0,5 j*
86. **Lighthouse audit** — score >90 sur landing + app · perf, A11y, SEO, best practices · *1 j*
87. **Load testing** — k6 ou Artillery · 100 users simultanés sur inbox + Mue · *1 j*

**🎯 Sortie Phase G :** déploiements sereins. Régression détectée avant merge. Performance validée.

---

## 🅷 Phase H — Marketing & Launch (M6, sem 23-26)

> Le grand jour. Sans marketing, le SaaS reste un beau cadeau dans un placard.

### H.1 — Landing & Content (étapes 88-93)

88. **Landing page V2** — hero animé + 5 features avec screenshots + témoignages early users + pricing + FAQ complète · *2 j*
89. **Blog setup** — `/blog` avec MDX + 1ère article "Pourquoi on a créé Freescale" · *1 j*
90. **5 articles SEO** — "alternative Front en français" · "outil emails freelance dev" · "centraliser Gmail Slack WhatsApp" · "Mue IA copilot" · "freelance gestion clients" · *3 j (1 article = 1/2j)*
91. **Changelog public** — `/changelog` avec mises à jour publiques · *0,5 j*
92. **Status page** — `status.freescale.site` via Better Uptime ou Atlassian Statuspage · *0,5 j*
93. **Help center** — `/docs` avec FAQ + tutos vidéo Loom intégrés · *2 j*

### H.2 — Social & Community (étapes 94-97)

94. **Build in public Twitter/X** — relancer compte avec 1 thread/semaine + 3-4 tweets/jour · *ongoing*
95. **LinkedIn presence** — page company + posts 2x/semaine · stories build · *ongoing*
96. **Présence communautés** — Indie Hackers FR, Mavericks, FrenchTech, Maddyness · 1 post valeur/sem · *ongoing*
97. **Newsletter Beehiiv** — landing dédié + 1 newsletter/mois · *0,5 j setup*

### H.3 — Launch Day (étapes 98-100)

98. **Product Hunt launch** — preview teaser 2 sem avant · hunter via @kevinwilliam · upvote orchestré jour J · *2 j prep*
99. **Press kit** — page `/press` avec logo, screenshots, founder photos, pitch en 1 phrase + 3 paragraphes · *1 j*
100. **🎉 LAUNCH PUBLIC** — lever la beta privée · ouvrir signup · annoncer sur Twitter/X + LinkedIn + Indie Hackers + Hacker News · trailer YouTube 60s · *1 j + suivi 1 sem*

**🎯 Sortie Phase H :** Freescale est en production publique. Les premiers clients payent. La machine d'acquisition tourne.

---

## 📅 Timeline visuelle

```
M1  ━━━━━━━━━━━━━━━━━━━━━━━━ Phase A (Polish)
        ━━━━━━━━━━━━━━━━━━━━ Phase B (Billing)
M2          ━━━━━━━━━━━━━━━━━ Phase B continue
M2-M3            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Phase C (Multi-canaux)
M3-M4                              ━━━━━━━━━━━━━━━━━ Phase D (Mue+)
M4-M5                                       ━━━━━━━━━ Phase E (Rétention)
M5                                                ━━━ Phase F (Compliance)
M5-M6                                                 ━━ Phase G (Tests)
M6                                                       ━━━━━ Phase H (Launch)
                                                              🎉 PRODUCT HUNT
```

---

## 🎯 Critères de "Done" pour finir "en grandes pompes"

- [ ] **5 paying clients minimum** avant fin Phase B (validation revenu)
- [ ] **3+ canaux fonctionnels** avant fin Phase C
- [ ] **Sean Ellis test ≥ 40%** "very disappointed" avant Phase H
- [ ] **0 erreur Sentry critical** 30 jours avant launch
- [ ] **Lighthouse score > 90** sur landing + app
- [ ] **NPS ≥ 30** sur les 20 premiers users
- [ ] **Churn < 6%/mo** mesuré sur 3 mois
- [ ] **MRR ≥ 1 K€** au launch public (Product Hunt)

---

## 🛡 Règles d'or pour ne PAS dérailler

1. **Ne sautez pas Phase B (Billing).** Sans encaisser = pas de validation marché. Tout le reste suit.
2. **Ne codez pas Phase D (Mue+) avant Phase C (Multi-canaux).** Mue sur Gmail seul ≠ différenciateur.
3. **Phase E (Rétention) doit être faite AVANT le launch** — pas après. Le churn se mesure dès le 1er client.
4. **Si vous êtes en retard sur une phase, COUPEZ des étapes plutôt que de retarder.** Mieux vaut shipper 70 étapes propres que 100 étapes bâclées.
5. **Anna-Yumi et Capucine sur Phase H (Marketing)** dès maintenant, en parallèle. Pas attendre la fin du dev.
6. **Tester chaque feature avec 3 vrais users** avant de passer à la suivante. Le PMF se construit feature par feature.
7. **Daily standup 15 min** entre les 3 cofondateurs. Sinon vous partez dans 3 directions.

---

## 📊 Lien avec le modèle financier

| Étape critique | KPI Excel impacté | Impact si zappée |
|---|---|---|
| #15 (Stripe checkout) | Tous les revenus | Aucun revenu encaissable |
| #18 (Paywall Pro) | ARPA 16 → 19€ Y3 | -25% revenu cumulé 3 ans |
| #27-42 (Multi-canaux) | New clients/mo | ICP refuse, reste à 5/mo |
| #43-57 (Mue Pro) | Conversion Solo→Pro | Tier Pro reste vide |
| #58-69 (Rétention) | Churn 6% → 4% | Projet rentable Y4+ au lieu de Y3 |
| #88-100 (Launch) | Acquisition | Personne ne connaît le produit |

---

**Document généré le 22 mai 2026 — basé sur l'audit codebase + le modèle financier 3 ans validé.**

**Prochaine action (lundi matin) :** ouvrir l'étape #1 — fix offline indicator — et commencer Phase A.

🚀 *Let's ship Freescale en grandes pompes.*
