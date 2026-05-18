# Freescale — Roadmap 90 étapes (v2, du Beta privée → Launch public)

> **État de départ (mai 2026)** : Beta privée, ~3 testeuses. Auth + onboarding + Gmail + Mue MVP shippés.
> **Cible** : SaaS production-ready, vendable, scalable, audit-proof, lancement public à la fin.
> **North Star** : `time-to-aha` < 60s pour un nouveau user, rétention D30 > 30%.

Légende : `[ ]` = à faire · `[x]` = fait · ⚡ = quick win (≤1j) · 🔥 = bloquant pour le launch

---

## ✨ Phase 1 — Polish & solidité (1-13)
*Le produit fait le job mais doit donner sensation premium dès la 1ère interaction.*

- [x] **1.** ⚡ Audit dark mode complet (chaque composant, chaque hover, chaque modal)
- [x] **2.** Responsive mobile <768px (sidebar drawer, inbox plein écran, MuePanel bottom sheet)
- [x] **3.** Responsive tablette 768-1024px (sidebar collapsable, panneau Mue accordéon)
- [ ] **4.** ⚡ Skeleton loaders Tasks / Calendar / AI Knowledge (cohérence avec Inbox)
- [x] **5.** ⚡ Empty states polis (Tasks vide, Calendar vide, Knowledge vide — chacun avec CTA)
- [x] **6.** 🔥 Error state sync : token Gmail expiré → bandeau "Reconnecter Gmail" en 1 clic
- [x] **7.** Error state sync : rate limit Gmail → retry backoff + indicateur visible
- [x] **8.** Offline indicator (navigateur déconnecté → bandeau top, reconnect auto)
- [x] **9.** ⚡ Toast system 4 niveaux (success / info / warning / error) avec icônes uniformes
- [x] **10.** ⚡ Tooltip system standardisé (data-tip existe déjà → cleanup + ARIA)
- [x] **11.** Animations transitions panel (Framer Motion ou CSS) — Inbox → Thread, Mue brief
- [x] **12.** ⚡ Cleanup : retirer `/app/debug`, console.log de dev, code mort post-refactor
- [x] **13.** ⚡ Bandeau d'erreur Mue centralisé (rate-limited Anthropic → "Mue se repose, retentez dans 30s")

## 🛠 Phase 2 — Productivité core (14-27)
*Faire de l'inbox un vrai centre opérationnel.*

- [ ] **14.** Conversation : star / favorite (DB + UI étoile dorée)
- [ ] **15.** Conversation : snooze jusqu'à date (table `conversation_snoozes`, badge "Snoozed until X")
- [ ] **16.** 🔥 Recherche globale fuzzy (Cmd+K) — `messages.body_text` + sender + subject
- [ ] **17.** Tags custom : CRUD côté Settings + tag par conv (UI chips)
- [ ] **18.** Filtre inbox par tag (en plus des tabs Clients/Promos/Notifs)
- [ ] **19.** Bulk actions : sélection multiple via checkbox + archive/tag/mark-read en masse
- [ ] **20.** Tasks : edit (title, priorité, due, description rich-text)
- [ ] **21.** Tasks : delete avec confirmation
- [ ] **22.** Tasks : subtasks (parent_task_id)
- [ ] **23.** Tasks : drag-drop reorder (sortable_index)
- [ ] **24.** Templates de réponse : CRUD + insertion dans composer avec variables `{{firstName}}`, `{{date}}`
- [ ] **25.** Signature email : éditable dans Settings, auto-append au composer
- [ ] **26.** Calendar : intégration Google Calendar (OAuth scope + sync events)
- [ ] **27.** Calendar : créer event depuis conversation (lien conv → event)

## 🌐 Phase 3 — Multi-provider (28-41)
*Élargir au-delà de Gmail pour tenir la promesse "inbox unifié".*

- [ ] **28.** 🔥 Outlook OAuth via Microsoft Graph (scopes Mail.ReadWrite + Mail.Send)
- [ ] **29.** Outlook sync (delta queries + subscriptions push)
- [ ] **30.** Outlook send avec attachments
- [ ] **31.** Apple Sign In (identité seulement — Apple Developer requis $99/an)
- [ ] **32.** iCloud Mail via IMAP + app-specific password Apple
- [ ] **33.** IMAP générique (config serveur / port / user / pwd)
- [ ] **34.** Multi-inbox : switcher dans sidebar (passer entre Gmail / Outlook / iCloud)
- [ ] **35.** Multi-inbox : vue agrégée "Tous les canaux" (toggleable)
- [ ] **36.** Slack OAuth + DM sync
- [ ] **37.** Slack channel mentions ingestion
- [ ] **38.** WhatsApp Business API integration
- [ ] **39.** LinkedIn InMail (scraping ou API officielle)
- [ ] **40.** Telegram bot setup
- [ ] **41.** Discord DM via bot

## 🤖 Phase 4 — Mue AI expansion (42-55)
*Transformer Mue d'un copilot en un assistant proactif.*

- [ ] **42.** 🔥 Ask Mue chat mode (multi-turn, persistant par conv)
- [ ] **43.** Mue apprend ton style (analyse des 20 derniers mails envoyés → ton)
- [ ] **44.** Auto-rules : "Quand sender = X → catégorie Y" (Settings + DB)
- [ ] **45.** Tone shifter dans le composer (boutons Formal / Casual / Friendly)
- [ ] **46.** Auto-draft replies (background pre-generation pour les 5 dernières convs)
- [ ] **47.** Smart follow-up : "Tu attends une réponse de X depuis 7j, relancer ?"
- [ ] **48.** Action extraction automatique au sync (nouveau mail = tâche détectée éventuelle)
- [ ] **49.** Smart unsubscribe : Mue détecte newsletters → propose unsubscribe groupé
- [ ] **50.** Meeting scheduler : Mue propose 3 créneaux libres dans la réponse
- [ ] **51.** Auto-detect langue + ton (FR / EN bilingual seamless)
- [ ] **52.** Daily digest cron email : "Voici tes 5 mails importants du jour" à 8h
- [ ] **53.** Custom Mue persona : instructions perso dans Settings ("Réponds en formel B2B")
- [ ] **54.** Mue insights dashboard : stats hebdo (mails reçus, tâches créées, temps économisé)
- [ ] **55.** Cost optimization : cache des prompts répétés + fallback haiku→sonnet sur erreurs

## 👥 Phase 5 — Collaboration (56-67)
*Sortir du solo pour ouvrir aux équipes (≥2 personnes).*

- [ ] **56.** Workspaces multiples (créer nouveau workspace, switcher)
- [ ] **57.** Invite teammate par email (token unique)
- [ ] **58.** Roles : owner / admin / member (avec permissions différentes)
- [ ] **59.** Assign conversation à un teammate (avatar + filtre "Mes assignations")
- [ ] **60.** Internal notes par conv (visibles équipe, non envoyées au client)
- [ ] **61.** @mentions dans les notes (notification au mentionné)
- [ ] **62.** Activity log par conv (qui a lu, qui a répondu, quand)
- [ ] **63.** Shared tags équipe
- [ ] **64.** Shared templates équipe (vs perso)
- [ ] **65.** Team-wide search (chercher dans toutes les convs de l'équipe)
- [ ] **66.** Notifications équipe (Slack webhook / email digest)
- [ ] **67.** Permissions granulaires (qui peut connecter un canal, qui peut inviter, etc.)

## 🔒 Phase 6 — Qualité / Sécurité / Compliance (68-79)
*Faire que le produit tienne en audit + en charge.*

- [ ] **68.** 🔥 2FA TOTP optionnel (Supabase Auth MFA)
- [ ] **69.** Sessions actives : liste dans Settings + révocation distante
- [ ] **70.** Audit log compte (login, deconnexion, changements settings)
- [ ] **71.** 🔥 Data export GDPR : "Télécharger toutes mes données" (JSON dump)
- [ ] **72.** 🔥 Privacy policy page (rédigée + accessible)
- [ ] **73.** 🔥 Terms of service page
- [ ] **74.** Cookie consent banner (CNIL-compliant, granulaire)
- [ ] **75.** Tests E2E Playwright (parcours auth, sync, send, task creation)
- [ ] **76.** Lighthouse perf audit : score >90 sur landing + /app
- [ ] **77.** A11y audit WCAG AA (focus management, ARIA, contrastes)
- [ ] **78.** Sentry intégration (error tracking front + server actions)
- [ ] **79.** Rate limiting côté server actions (anti-abuse)

## 🚀 Phase 7 — Launch & growth (80-90)
*Préparer le lancement public + monétisation.*

- [ ] **80.** Landing : section Features détaillée (3-4 features avec screenshots animés)
- [ ] **81.** Landing : section Pricing (Free / Pro / Team)
- [ ] **82.** Landing : section FAQ (10-15 questions)
- [ ] **83.** Landing : témoignages / social proof (logos clients beta)
- [ ] **84.** 🔥 Stripe integration (subscriptions + webhook → DB plan_tier)
- [ ] **85.** Free vs Pro tier : limites (1 inbox / 3 inbox illimité), paywalls UI
- [ ] **86.** Trial 14 jours auto sur Pro (carte requise ou non, à décider)
- [ ] **87.** 🔥 Google OAuth verification (passage In production verified) — Privacy URL + demo vidéo
- [ ] **88.** Changelog public (`/changelog`)
- [ ] **89.** Documentation / Help center (`/docs` ou Notion intégré)
- [ ] **90.** 🚀 Launch Product Hunt + Hacker News + Twitter (post coordonné)

---

## 📊 Métriques à instrumenter dès phase 1

- **Activation rate** : % users qui connectent ≥1 inbox dans les 24h
- **Time-to-aha** : `account_created → first_actionable_task_seen`
- **D7 / D30 retention** : cohortes de signup
- **Mue adoption** : % users qui cliquent ≥1 fois sur Mue dans la 1ère semaine
- **Provider mix** : Gmail vs Outlook vs autres
- **Coût Mue moyen** par user actif (suivi via aiapiflow + future Anthropic verified)

## 🧭 Ordre recommandé d'exécution

1. **Quinzaine 1-2** : Phase 1 (polish + erreurs) — donne sensation premium immédiate
2. **Quinzaine 3-4** : Phase 2 partial (search, star, snooze, edit tasks) — productivité de base
3. **Mois 2** : Phase 6 critique (privacy/terms/GDPR export) — bloquant pour Google verification
4. **Mois 3** : Phase 3 Outlook + Phase 4 Ask Mue chat — différenciation produit
5. **Mois 4** : Phase 5 collaboration light + Phase 7 Stripe + paywalls
6. **Mois 5-6** : verification Google OAuth (en arrière-plan) + landing finitions
7. **Lancement public** quand Phase 1 + 2 + 6 + 7 sont 100%, le reste peut suivre

## ⚠️ Dépendances externes critiques

- **Google OAuth verification** : 2-6 semaines, requis pour ouvrir à >100 users (étape 87)
- **Apple Developer** : 99$/an pour Sign in with Apple + iCloud (étapes 31-32)
- **Anthropic API** : passage de aiapiflow → direct quand volumes augmentent (cost optim étape 55)
- **Stripe** : compte vérifié + KYC pour subscriptions (étape 84)
- **CNIL** : déclaration éventuelle selon volume + audit privacy (étape 72)
