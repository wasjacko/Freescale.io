# PRD — Panneau IA agentique « Mue » (build-ready)

> Document **produit / implémentation**. Complète, sans les répéter :
> - [docs/ux-mue-panneau-agentique.md](ux-mue-panneau-agentique.md) → comportements UX détaillés
> - Prototype des 14 écrans (rendu inline dans le chat) → la cible visuelle
>
> Ici on traduit la spéc en **plan de construction** contre le code réel :
> `apps/web/components/MuePanel.tsx`, `lib/actions/mue.ts`, `lib/mue-chat.ts`,
> `lib/mue-discussions.ts`, `lib/mock-v2.ts`. Mock-first (DEMO_MODE).

---

## 1. Concept produit

Mue n'est **pas un chatbot** : c'est un **copilote agentique** logé en sidebar
droite persistante. Il accompagne l'utilisateur partout (Inbox, Tâches, Santé
client, Calendar) **sans quitter la page courante**. Capacités : répondre,
analyser, proposer, créer, modifier, planifier, ouvrir des objets, suggérer des
suites, expliquer ses limites.

**Promesse produit** : *puissant mais jamais flou*. L'utilisateur sait toujours
si Mue **répond / propose / attend / agit**, ce qui a changé, et où le retrouver.

**Existant** : `MuePanel.tsx` a déjà rail droit, composer, hero, sélecteur de
discussions, Mémoire inline, et 2 `kind` de message custom (`privacy`, `scan`).
On **étend** cette base, on ne repart pas de zéro.

---

## 2. Layout & inventaire de composants

Mapping exact de la structure demandée (A/B/C) vers des composants React à créer
ou réutiliser.

### A. Header — `MuePanelHeader` *(existe, à enrichir)*
| Élément | État | Composant |
|---|---|---|
| Nouvelle discussion / retour | ✅ existe (`mue2-disc-btn`) | réutiliser |
| Titre de conversation | ⚠️ à brancher (titre auto) | `mue2-disc-btn` label |
| Menu déroulant (historique) | ✅ existe (`mue2-disc-menu`) | réutiliser |
| Icône historique | ✅ dans le menu | — |
| Icône réduire / fermer | ✅ chevron `»»` | réutiliser |
| Bouton Mémoire | ✅ existe (toggle inline) | réutiliser |

### B. Zone de conversation — `MueThread` *(existe, à enrichir)*
| Élément | État | Composant à créer |
|---|---|---|
| État vide + accueil | ✅ existe (`mue2-hero` + chips) | réutiliser |
| Bulle user (droite) | ✅ `mue2-msg.is-user` | réutiliser |
| Bulle Mue (gauche) | ✅ `mue2-msg.is-mue` | réutiliser |
| **Carte objet cliquable** | ❌ | `MueObjectCard` |
| **Badges de statut** | ⚠️ partiel | `MueBadge` (statut/priorité/date/assigné) |
| **Boutons d'action (confirm)** | ❌ | `MueConfirmButton` |
| **Carte prévisualisation** | ❌ | `MuePreviewCard` |
| **Tracker de progression** | ❌ | `MueProgress` |
| **Rangée de suggestions** | ⚠️ chips existent | `MueSuggestions` |
| **Feedback message** (copier / retry / 👍 / 👎) | ❌ | `MueMsgActions` |

### C. Zone de prompt — `MueComposer` *(existe, à enrichir)*
| Élément | État |
|---|---|
| Champ sticky bas | ✅ |
| Placeholder contextuel | ⚠️ à rendre dynamique (cf. §17) |
| Bouton `+` (contexte) | ✅ |
| Pièce jointe / sélection d'objet (`@`) | ❌ à ajouter |
| Sélecteur de mode IA (`✦ Max ▾`) | ✅ |
| Bouton micro | ✅ |
| Bouton envoyer / **stop** | ⚠️ stop à brancher sur `pending` |

> **Nouveaux composants à créer (7)** : `MueObjectCard`, `MueBadge`,
> `MueConfirmButton`, `MuePreviewCard`, `MueProgress`, `MueSuggestions`,
> `MueMsgActions`.

---

## 3. Modèle de données des messages (le cœur de l'implémentation)

Étendre le type message Mue (suit le pattern `kind` existant). Un seul fil =
liste de `MueMessage`.

```ts
type MueMessage =
  | { id; role:"user"; kind:"text"; content:string }
  | { id; role:"mue";  kind:"text"; content:string; sources?:MueObjectRef[]; suggestions?:string[] }
  | { id; role:"mue";  kind:"progress"; label:string; steps:{label:string; state:"pending"|"running"|"done"}[] }
  | { id; role:"mue";  kind:"preview"; intro:string; items:PreviewItem[]; destination:string; actions:ConfirmAction[] }
  | { id; role:"mue";  kind:"result"; content:string; created:MueObjectRef[]; suggestions?:string[] }
  | { id; role:"mue";  kind:"slots"; intro:string; slots:string[]; onPick:(s)=>void }
  | { id; role:"mue";  kind:"refusal"; reason:string; alternative:string; suggestions?:string[] }

type MueObjectRef = { type:"task"|"conversation"|"client"|"document"|"event"|"project"; id:string; label:string; meta?:string; badges?:Badge[] }
type ConfirmAction = { label:string; variant:"primary"|"ghost"; run:()=>Promise<void> }
```

Rendu : un `switch(kind)` dans `MueThread` choisit le composant (§2.B). C'est
toute la logique d'affichage agentique.

---

## 4. Logique conversationnelle

- User → bulle droite ; Mue → bulle gauche ; historique conservé ; scroll +
  auto-scroll en bas.
- **Titre auto** généré depuis le 1er prompt (mock : règle simple côté client,
  ou champ `title` déjà présent dans `mue-discussions.ts`).
  Exemples : *Prioritization Inquiry · Weekly Planning · Client Quote Creation ·
  Calendar Scheduling · Task Cleanup* (en prod, FR : « Priorisation »,
  « Planification semaine », « Devis client »…).
- Le titre s'affiche dans le sélecteur de discussions du header.

---

## 5. États de chargement (machine d'états)

```
idle → sending → thinking → [responding | previewing | executing] → settled
                    │                                                   │
                    └──────────── stop ────────────────────────────────┘
```

| Phase | UI |
|---|---|
| `thinking` | label « Je réfléchis… » + sous-étape « Analyse du contexte », champ off (« J'y travaille… »), bouton **Stop** |
| `executing` | `MueProgress` : « Création tâche 1/7 », « Lecture du calendrier », « Ouverture du document » |

Garde-fou : tant que `phase !== idle/settled`, fermer le panneau ouvre la modale
§16.

---

## 6 & 7. Réponse informative vs proposition d'action

- **Informative (N1→N2)** : `kind:"text"` avec `sources[]` (cartes objets +
  badges) et `suggestions[]`. Ne modifie rien.
  > *« Tu n'as rien en retard. 5 tâches prioritaires pour lundi : commence par X,
  > puis Y, puis Z. Tu veux que je les ajoute à ta file dans cet ordre ? »*
- **Avec action (N3)** : ajoute des `ConfirmAction` formulées en **langage
  naturel** (`MueConfirmButton`) :
  - « Oui, ajoute-les à ma file de travail »
  - « Crée-les dans ma liste perso » · « Bloque ce créneau »
  - « Transforme ce document en présentation » · « Génère les sous-tâches »
  - « Assigne cette tâche à Marie » · « Change le statut en Terminé »

---

## 8 & 9. Prévisualisation → Exécution

- **Preview** (`kind:"preview"`) avant toute **création multiple** ou **action
  sensible** : items (nom / date / priorité / projet / assigné / liste) + intro
  + question « Je les crée dans cette liste ? » + 3 actions :
  `Oui, crée-les ici` · `Choisir une autre liste` · `Modifier avant création`.
- **Exécution** : `MueProgress` étape par étape → mutation **optimiste locale**
  (mock) → le canvas se met à jour → `kind:"result"` (« C'est fait, 7 tâches
  créées. Voici ton planning. ») + liens cliquables.

> ⚠️ Contrainte projet connue : *en mode mock, les server actions écrasent l'état
> optimiste des tâches* → garder les mutations de tâches **local-only** dans le
> store, pas via server action.

---

## 10. Interaction avec le canvas principal

Clic sur un `MueObjectCard` → ouvre l'objet dans la zone principale **sans
fermer Mue** :

| type | action |
|---|---|
| `conversation` | `setActiveConvId(id)` + `setView("inbox")` |
| `client` | ouvre la fiche (Santé client) |
| `task` | popover/Tableau |
| `document` | ouvre le doc dans le canvas |
| `event` | `setView("calendar")` + scroll event |

Le fil reste visible → l'utilisateur peut enchaîner une action sur l'objet ouvert.

---

## 11 / 12 / 13. Les 3 flows de création

**Document** : demande claire → création **directe** → doc s'ouvre dans le canvas
→ confirmation + lien + suggestions (« Transforme en présentation », « Planifie
un call », « Sauvegarde ces tarifs »).

**Tâches** : demande → `preview` → confirm → `progress` 1/7…7/7 → apparition dans
le Tableau → `result` + suggestions (« Bloque du temps », « Priorise-les »,
« Crée un agent de relance le lundi »).

**Calendrier** : demande → lit les dispos → `kind:"slots"` (« 10h, 10h30, 11h… »)
→ choix user → crée l'event → confirme avec date/heure/**durée**/fuseau + « Voir
l'événement » + suggestions (« Prépare l'ordre du jour », « Crée une note »).

---

## 14. Suggestions contextuelles (jamais génériques)

`suggestions[]` dépend du dernier `result` :
| Après | Suggestions |
|---|---|
| Tâches | Bloque du temps · Priorise selon l'urgence · Agent de relance le lundi |
| Document | Transforme en présentation · Envoie au client · Crée une tâche de suivi |
| Événement | Prépare l'ordre du jour · Crée une note de réunion · Ajoute une relance |

---

## 15. Gestion des limites (`kind:"refusal"`)

Action destructive/sensible → pas d'exécution → explication + alternative.
> *« Je ne peux pas supprimer toutes tes tâches directement. Sélectionne-les en
> masse et supprime-les depuis la Corbeille. »* + bouton « Ouvrir le Tableau ».

Matrice (rappel) : réponse/reco = direct · création légère = direct ou confirm ·
multiple/flou/sensible = preview+confirm · suppression massive = **refus** ·
action externe = validation explicite.

---

## 16. Fermeture pendant génération

Clic `»»` quand `phase ∈ {thinking, executing}` → modale :
- Titre : **« Arrêter de générer ? »**
- Texte : « La fermeture annulera la réponse en cours. »
- Boutons : **« Laisser ouvert »** (ghost, défaut) · **« Fermer »** (danger)

Jamais d'interruption silencieuse.

---

## 17. Microcopy (FR, tutoiement — valeurs exactes à câbler)

| Contexte | Texte |
|---|---|
| Placeholder vide | « Posez une question, créez, recherchez, @ pour mentionner » |
| Placeholder après conversation | « Dites à l'IA ce qu'elle doit faire ensuite » |
| Chargement | « J'y travaille… » |
| Réflexion | « Je prends en compte le contexte… » |
| Action | « Création tâche 1/7… » |
| Confirmation | « C'est fait. » |
| Limite | « Je ne peux pas faire cette action directement, mais voici comment faire. » |

---

## 18. Règle UX principale

À tout instant, lisible sans effort : Mue **répond** seulement / **propose** une
action / **attend** une validation / **agit** réellement — + ce qui a été créé,
où le retrouver, comment continuer. Chaque `kind` de message encode visuellement
exactement un de ces états.

---

## 19. Plan de build (phasé, mock-first)

| Phase | Livrable | Fichiers |
|---|---|---|
| **P0 — fondations** | Type `MueMessage` étendu + `switch(kind)` dans le thread | `lib/mue-chat.ts`, `MuePanel.tsx` |
| **P1 — primitives** | `MueObjectCard`, `MueBadge`, `MueSuggestions`, `MueMsgActions` | `components/mue/*` |
| **P2 — flow tâches** | `MuePreviewCard` + `MueConfirmButton` + `MueProgress` + mutation locale Tableau | + `lib/store` |
| **P3 — canvas link** | clic objet → `setActiveConvId`/`setView` sans fermer Mue | `MuePanel.tsx` |
| **P4 — document & agenda** | flow devis (ouvre canvas) + `kind:"slots"` calendrier | `CalendarView`, doc canvas |
| **P5 — garde-fous** | `kind:"refusal"` + modale « Arrêter de générer ? » + placeholder dynamique | `MuePanel.tsx` |

**Définition de fini (par phase)** : typecheck vert, rendu vérifié au navigateur
(preview), mutation visible dans le canvas, aucune action sensible sans confirm.

---

*Fin du PRD — Panneau agentique Mue. Prochaine étape concrète recommandée : P0+P2
(le flow tâches est le plus démontrable avec les mocks existants).*
