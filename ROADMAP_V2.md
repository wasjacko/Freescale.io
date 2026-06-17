---
title: Freescale V2 — Roadmap UI
type: roadmap
status: in-progress
created: 2026-06-17
scope: UI-only (mock, zéro backend)
tags:
  - freescale
  - roadmap
  - ui
  - v2
---

# 🦎 Freescale V2 — Roadmap UI

> [!info] Proposition de valeur (la boussole de cette roadmap)
> **Nous aidons les freelances tech à récupérer jusqu'à 2 à 3 heures par semaine sur le suivi client et l'organisation de leur activité, grâce à un copilote qui centralise l'information, réduit le temps de recherche et priorise les actions à mener.**

> [!warning] Périmètre
> **100% UI, 0 fonctionnel.** Tout est branché sur la couche mock existante (`apps/web/lib/dev-mock.ts` + `DataContext`, mode `DEV_NO_AUTH`). Réponses de Mue *canned*, intégrations = *chips visuels*, compteur d'heures = *chiffre figé*, mutations *locales*. Objectif : un prototype cliquable et démo-ready qui **raconte** la propal — pas qui la fait tourner. Le backend (RAG, urgence live, intégrations réelles) viendra dans une V3.

> [!note] Principes de build
> - Cohérent avec le design system actuel : rail 96px (icône + label empilés), cadres `frame` (border transparent + box-shadow inset strokes), indigo Mue `--mue-cta`, tokens radius.
> - Chaque écran incarne **un pilier** et matérialise les **heures gagnées**.
> - Réutiliser avant de créer : `Inbox`, `Thread`, `TodayView`, `MuePanel`, `CommandPalette` comme briques de style.

---

## 🗺 Vue d'ensemble — 5 phases · 41 étapes

| Phase | Nom | Pilier porté | Étapes | Estim. |
|---|---|---|---|---|
| **0** | Fondations V2 | (socle) | 1–5 | ~3,5 j |
| **1** | Le Plan du Jour | 🎯 Prioriser | 6–12 | ~4 j |
| **2** | Le Hub Client / Projet | 🗂 Centraliser | 13–25 | ~9 j |
| **3** | Ask Mue | 🔍 Réduire la recherche | 26–32 | ~3,5 j |
| **4** | Preuve, cohérence & démo | (les 3) | 33–41 | ~6,5 j |

**Total : ~26,5 j de build UI ≈ 5-6 semaines.** Ordre choisi par impact/effort : on branche d'abord ce qui est rapide et visible (Plan du jour), puis l'écran « wow » (Hub client), puis la signature (Ask Mue).

---

## 🅾️ Phase 0 — Fondations V2 (socle)

> [!todo] But : données mock riches + briques visuelles communes avant de poser les écrans.

1. **Modèle mock enrichi** — étendre `dev-mock.ts` : 4-5 clients riches (réutiliser Sarah Lemoine, Luc Mercier, Capucine Roy, Thomas Aubry), avec Projet, Fichiers, Factures, jalons. · *1 j*
2. **Types UI** — `Client`, `Project`, `FileItem`, `Invoice`, `ActionItem`, `MueAnswer` dans `types.ts`. · *0,5 j*
3. **Tokens V2** — couleurs de statut (en cours / à risque / en retard), severity, badges intégrations. · *0,5 j*
4. **Briques atomiques** — `StatusPill`, `IntegrationChip`, `SourceChip`, `ProgressBar`, `SectionCard`. · *1 j*
5. **Nav rail V2** — ajouter « Plan du jour », « Clients », « Mue » au rail (style empilé déjà en place). · *0,5 j*

**🎯 Sortie :** coquille V2 prête, mock crédible, composants réutilisables.

---

## 🅐 Phase 1 — Le Plan du Jour 🎯 *(pilier Prioriser — la home)*

> [!todo] But : à l'ouverture, le freelance voit **quoi faire maintenant**, pas une boîte de réception.

6. **`DayPlan.tsx`** — bloc « Ton plan du jour » en tête de Today + sous-ligne « Mue a priorisé N actions ce matin ». · *0,5 j*
7. **`ActionCard.tsx`** — carte action : titre, client + avatar canal, tag de raison, échéance, CTA. · *1 j*
8. **Tri d'urgence simulé** — ordre mock : en retard > en attente >48h > dû aujourd'hui > relance à faire. · *0,5 j*
9. **États visuels** — urgent (rouge), en attente (ambre), planifié (neutre), fait (check). · *0,5 j*
10. **Interactions locales** — cocher / snooze / ouvrir, la carte sort de la liste avec animation. · *0,5 j*
11. **Empty state** — « Tout est sous contrôle 🎉 » + illustration. · *0,5 j*
12. **Compteur inline** — « ~2h40 gagnées cette semaine » dans le header du plan. · *0,5 j*

**🎯 Sortie :** pilier **Prioriser** incarné. La home répond à « par quoi je commence ? ».

---

## 🅱️ Phase 2 — Le Hub Client / Projet 🗂 *(pilier Centraliser — l'écran wow)*

> [!todo] But : un endroit unique par client — comms + tâches + code + cash + ce que Mue sait.

13. **`ClientsView.tsx`** — grille de cartes clients (avatar, nom, statut projet, dernier contact, badge « X en attente »). · *1 j*
14. **`ClientCard.tsx`** — mini-indicateurs : canaux actifs, facture, échéance proche. · *0,5 j*
15. **Filtres/tri grille** — actifs / à risque / par dernier contact (UI only). · *0,5 j*
16. **`ClientHub.tsx`** — layout vue 360 : header client + onglets. · *1 j*
17. **Onglet Aperçu** — timeline unifiée mock (messages tous canaux + tâches + events). · *1 j*
18. **Onglet Conversations** — fils de ce client (styles inbox réutilisés). · *0,5 j*
19. **Onglet Tâches** — tâches liées (styles Today réutilisés). · *0,5 j*
20. **Onglet Projet** — barre de progression + jalons mock + statut. · *1 j*
21. **Onglet Fichiers** — galerie mock (icônes par type, date). · *0,5 j*
22. **Onglet Facturation** — factures mock (payée / en attente / en retard) + total. · *0,5 j*
23. **Onglet « Ce que Mue sait »** — faits / préférences appris (mock, façon AI Knowledge). · *0,5 j*
24. **Chips intégrations tech** — header client : GitHub `repo lié`, Linear `5 issues`, Stripe `facture en retard` (visuels). · *0,5 j*
25. **Lien inbox → client** — depuis un thread, bouton « Voir la fiche client ». · *0,5 j*

**🎯 Sortie :** pilier **Centraliser** + spécificité **freelance tech** incarnés. Le 360 client est l'écran de démo le plus fort.

---

## 🅲 Phase 3 — Ask Mue 🔍 *(pilier Réduire la recherche)*

> [!todo] But : « demande, ne cherche pas. » Une question → une réponse sourcée (en mock).

26. **`AskMue.tsx`** — barre proéminente, placeholder « Demande à Mue : où en est Dupont ? ». · *0,5 j*
27. **Carte réponse** — texte + puces, ton Mue indigo. · *0,5 j*
28. **Sources mock** — `SourceChip` sous la réponse (« 3 messages · 1 tâche · 1 fichier »). · *0,5 j*
29. **`mock-answers.ts`** — 4-6 paires question→réponse pré-écrites + repli générique. · *0,5 j*
30. **États** — « Mue réfléchit » (typing/skeleton), réponse, vide. · *0,5 j*
31. **Questions suggérées** — chips cliquables pour guider la démo. · *0,5 j*
32. **Accès** — depuis le rail « Mue » + ⌘K. · *0,5 j*

**🎯 Sortie :** pilier **Réduire la recherche** incarné (mock). L'effet « copilote qui connaît mon activité ».

---

## 🅳 Phase 4 — Preuve, cohérence & démo

> [!todo] But : matérialiser les 2-3h, unifier l'ensemble, rendre la démo fluide.

33. **`TimeSavedWidget.tsx`** — compteur « ~2h40 gagnées » (topbar/home) + tooltip détail mock. · *0,5 j*
34. **Bilan de la semaine** — section mock : temps gagné + actions traitées + clients suivis. · *1 j*
35. **Rail V2 final** — ordre : Plan du jour · Clients · Inbox · Mue · Calendar. · *0,5 j*
36. **Couper le générique** — masquer / re-cadrer Kanban brut & Calendar vide (ils diluent la promesse). · *0,5 j*
37. **Pass cohérence design** — strokes, radius, indigo, espacements sur tous les nouveaux écrans. · *1 j*
38. **États vides + skeletons** — partout, jamais de « Loading… ». · *0,5 j*
39. **Responsive < 768px** — drawer client, plan du jour, Ask Mue. · *1 j*
40. **Parcours démo scripté** — chemin cliquable Plan du jour → Hub client → Ask Mue → Bilan. · *0,5 j*
41. **Aligner la landing** — `public/home` : screenshots & sections sur les nouveaux écrans. · *1 j*

**🎯 Sortie :** prototype V2 cohérent de bout en bout, démo-ready, qui **montre** les 2-3h gagnées.

---

## ✅ Définition de « Done » (V2 UI)

- [ ] Les 3 piliers ont chacun une **surface dédiée** identifiable en < 5 s.
- [ ] On peut faire une **démo cliquable** complète sans toucher au backend.
- [ ] Le bénéfice **« 2-3h/semaine »** est visible à l'écran (compteur + bilan).
- [ ] La spécificité **freelance tech** est lisible (chips GitHub/Linear/Stripe).
- [ ] Design **100% cohérent** avec le rail + cadres existants.
- [ ] La **landing** reflète les vrais écrans.

---

## 🔗 Liens

- Hub projet : [[Freescale]]
- Roadmap produit complète (avec backend) : [[ROADMAP_100]]
- Tech connexions canaux : [[Stack/Connexions canaux]]

> [!quote] Rappel
> La V2 UI **prouve la vision**. La V3 la **branche** (RAG sur `mue_memories.embedding`, urgence live via `lib/urgency.ts`, intégrations réelles). Cet ordre fait de l'UI un *test de désir* avant d'investir l'ingénierie.
