# Spécification UX — Panneau IA agentique « Mue »

> Inspiration : ClickUp Brain. Cible : le copilote **Mue** de Freescale (inbox
> client unifiée multi-canal). Document **UX/UI uniquement** — pas de modèle, API
> ni backend, sauf quand ça change ce que voit l'utilisateur.
>
> Ancrage produit : objets réels de Freescale = **conversations / messages**,
> **clients** (Santé client), **tâches** (Tableau/Kanban), **documents** (devis,
> contrats, briefs), **événements** (Calendar), **discussions Mue**. Le panneau
> existe déjà : `apps/web/components/MuePanel.tsx` (rail droit, surface `.copilot
> .mue2`). Cette spec décrit la cible agentique, pas l'état actuel.

---

## 0. Principe directeur

Le panneau doit dégager **deux sensations simultanées** :

1. **Puissance** — Mue comprend, agit, crée de vrais objets dans Freescale.
2. **Contrôle** — l'utilisateur sait toujours ce que Mue a compris, ce qu'elle
   s'apprête à faire, si elle attend une validation, ce qu'elle a modifié, et où
   retrouver ce qui a été créé.

Règle d'or : **rien d'irréversible ou de massif sans validation explicite.** La
création légère et la planification se font après confirmation conversationnelle ;
la suppression massive est refusée et renvoyée vers une action manuelle.

---

## 1. Description du panneau

| Attribut | Valeur |
|---|---|
| Position | Rail **droit**, 3ᵉ colonne de `.app` (après sidebar + zone principale) |
| Largeur | ~570 px (large, pour afficher prévisualisations et cartes objets) |
| Comportement | **Overlay non-modal** : la page principale reste **visible et compressée**, jamais remplacée |
| Persistance | Le fil de discussion survit à la navigation dans le canvas principal |
| Ouverture | Bouton **« Agent »** dans la topbar + page dédiée **« Mue »** dans la sidebar |
| Fermeture | Chevron double `»»` (replie le rail) ; confirmation si génération en cours |
| Thème | Suit le thème SaaS (clair / système), pas de thème propre |

Le panneau n'est **pas** une modale : l'utilisateur continue de voir sa liste de
conversations / ses tâches / sa fiche client pendant qu'il dialogue avec Mue.

---

## 2. Liste des composants

```
MuePanel (racine, rail droit)
├── Header
│   ├── Sélecteur de discussion  ("Nouvelle discussion ▾")      ← gauche
│   ├── Bouton Mémoire                                          ← droite
│   └── Chevron fermeture »»                                    ← extrême droite
├── Corps (3 états mutuellement exclusifs)
│   ├── État VIDE        → hero + chips d'intention
│   ├── État MÉMOIRE     → vue Mémoire inline (MueMemory)
│   └── État CHAT        → fil de messages
├── Zone de suggestions contextuelles (au-dessus du composer, état vide ou post-réponse)
└── Composer (toujours en bas)
    ├── Textarea ("Besoin d'aide ? Pose une question, recherche ou crée.")
    ├── Bouton "+"        → ajouter contexte / pièce jointe
    ├── Bouton micro      → dictée (si dispo)
    ├── Sélecteur modèle  ("✦ Max ▾")
    └── Bouton Envoyer    → flèche (désactivé si vide ou pendant génération)
```

Composants de message (rendus dans le fil) :
- **Bulle utilisateur** (droite, fond accent)
- **Bulle Mue** (gauche, en-tête `✦ Mue`)
- **Carte objet** (lien cliquable vers tâche / client / doc / event)
- **Carte prévisualisation** (liste structurée + bouton de confirmation intégré)
- **Tracker de progression** (statut + sous-étapes « x/n »)
- **Rangée de suggestions** (2–3 boutons de suite logique)
- **Carte refus** (limite + alternative manuelle)

---

## 3. États du panneau

| État | Déclencheur | Contenu |
|---|---|---|
| **Replié** | Défaut / clic `»»` | Rail masqué, bouton « Agent » visible en topbar |
| **Vide** | Ouverture sans fil actif | Hero `✦ Mue` + chips d'intention + composer |
| **Mémoire** | Clic « Mémoire » | Vue Mémoire inline (surnom, rôle, préférences, mémoire par client) |
| **Saisie** | Focus textarea | Composer actif, chips toujours là |
| **Génération** | Envoi prompt | Bulle user + tracker « J'y travaille… » + bouton **Stop**, composer désactivé |
| **Réponse** | Fin de génération | Bulle Mue + objets cités + 2–3 suggestions |
| **Prévisualisation** | Action à plusieurs objets / destination floue | Carte preview + bouton confirmation |
| **Exécution** | Clic confirmation | Tracker « Création x/n », objets apparaissent dans le canvas |
| **Confirmé** | Fin d'exécution | « C'est fait, N créés » + liens cliquables + suggestions |
| **Refus** | Action risquée/destructive | Message poli + alternative manuelle |

---

## 4. État vide — message d'accueil & intentions

- **Hero** : fleur Mue + titre `Mue` (sobre, pas de baratin).
- **Sous-titre optionnel** : *« À ton service. Demande, cherche ou crée. »*
- **7 chips d'intention** (n'envoient **jamais** directement — ils ouvrent une
  liste de suggestions) :

  `Trouver` · `Rechercher` · `Créer` · `Modifier` · `Analyser` · `Prioriser` · `Planifier`

- **Composer en bas** avec `+`, micro, sélecteur de modèle, envoyer.
- Design léger, suit le thème.

### Suggestions par intention (ancrées Freescale)

| Intention | Suggestions (clic → préremplit le composer) |
|---|---|
| **Trouver** | « Retrouve le dernier message de **Sarah Lemoine** » · « Trouve les devis envoyés ce mois » · « Où en est le projet **Refonte produit V2** ? » |
| **Rechercher** | « Cherche tous les fils où on parle de paiement en retard » · « Recherche approfondie sur les relances en attente » |
| **Créer** | « Crée un devis pour **Jean-Pierre** » · « Crée une tâche : envoyer le contrat à **Thomas Aubry** » · « Rédige une relance pour **David Kim** » |
| **Modifier** | « Reformule ce brouillon en plus chaleureux » · « Change l'échéance de cette tâche à lundi » |
| **Analyser** | « Quels clients me doivent une réponse ? » · « Analyse ma santé client cette semaine » |
| **Prioriser** | « Sur quoi je me concentre maintenant ? » · « Organise ma file selon ce qui compte le plus » · « Trie les nouvelles tâches entrantes » |
| **Planifier** | « Bloque un créneau pour le call découverte » · « Planifie ma semaine à partir de mes tâches » |

> **Règle** : le clic sur une suggestion **préremplit** le textarea, focus dedans,
> curseur en fin. **Aucun envoi automatique.** L'utilisateur garde le doigt sur
> la gâchette (bouton Envoyer).

---

## 5. Conversation IA

Après envoi d'un prompt :

- **Message utilisateur** → bulle alignée à **droite**, fond accent.
- **Réponse Mue** → bulle alignée à **gauche**, en-tête `✦ Mue`.
- **Titre auto** : la discussion reçoit un titre généré (ex. « Relance David Kim »,
  visible dans le sélecteur de discussions). Comportement déjà mocké via
  `mue-discussions.ts` (titres type « Task Triage », « Résume ma semaine »).
- **Historique** conservé, **scroll** vertical, auto-scroll en bas à chaque message.
- **Pendant la génération** : textarea désactivée avec placeholder *« J'y travaille… »*,
  bouton Envoyer remplacé par un **bouton Stop** (carré).

---

## 6. Chargement & exécution — feedback de progression

Mue ne laisse **jamais** l'utilisateur dans un flou d'attente.

- **Statut court** animé : *« Réfléchit… »*, *« Analyse… »*, *« Au travail… »*
  (équivalent FR de « Cookin' / Pondering »).
- **Sous-étapes visibles**, listées en temps réel :
  ```
  ✓ Prend en compte tes 11 tâches
  ✓ Analyse les priorités
  ⟳ Création tâche 3/7…
  ```
- **Progression élément par élément** quand plusieurs objets sont créés
  (« Création tâche 1/7 » → « 7/7 »).
- À chaque étape franchie, la coche passe de `⟳` à `✓`.

---

## 7. Réponse simple — sans action (Niveau 1 → 2)

Quand l'utilisateur **pose une question**, Mue répond **sans rien modifier** :

- Réponse rédigée dans le chat.
- **Objets cités = liens cliquables** (carte objet compacte).
- **Métadonnées utiles** affichées : statut (À faire / En cours / En attente),
  priorité, échéance, client assigné, canal.
- **2–3 suggestions de suite** logiques en fin de réponse.

**Exemple ancré :**

> **User** : « Sur quoi je me concentre maintenant ? »
>
> **Mue** : « 3 fils te réclament en priorité :
> 1. 🔴 **Thomas Aubry** — *Peux-tu m'envoyer le contrat signé ?* · en attente 2 j
> 2. 🟠 **David Kim** — silence depuis 12 j · 6 500 € à suivre
> 3. 🟠 **Alexandre Dupont** — livrables reçus, attend ton retour
>
> Tu veux que je les ajoute dans cet ordre à ta file de travail ? »
>
> *Suggestions :* `Ajoute-les à ma file` · `Rédige une relance pour David Kim` ·
> `Bloque du temps pour le contrat de Thomas`

---

## 8. Liens vers objets du SaaS

Quand Mue mentionne une **tâche, un document, un client, un événement, un projet** :

- L'objet est **cliquable** (carte ou inline link avec icône + label + méta).
- Le clic **ouvre l'objet dans le canvas principal** (la vue correspondante :
  fiche client, fil de conversation, tâche en popover, document, event Calendar).
- Le **panneau Mue reste ouvert à droite** — la conversation n'est pas perdue.
- L'utilisateur peut **inspecter l'objet tout en continuant** à dialoguer.

> Comportement clé : ouvrir un objet = changer le canvas, **jamais** fermer Mue.

---

## 9. Prévisualisation avant création (Niveau 3)

Mue ne crée pas immédiatement si l'action **implique plusieurs objets** ou une
**destination incertaine**. Elle propose d'abord une **carte de prévisualisation
structurée**.

**Exemple ancré :**

> **User** : « Crée-moi toutes mes tâches de la semaine. »
>
> **Mue** : « Voici ce que je propose (7 tâches) :
>
> | Tâche | Échéance | Priorité | Client |
> |---|---|---|---|
> | Envoyer le contrat signé | lun. | 🔴 Haute | Thomas Aubry |
> | Relancer le devis | mar. | 🟠 Moy. | David Kim |
> | … | | | |
>
> Où je les crée ? »
>
> *Boutons :* **`Oui, crée-les dans ma liste perso`** · `Choisir un projet` · `Modifier la liste`

La preview est **éditable mentalement** (l'utilisateur peut répondre « enlève la 3 »
en langage naturel avant de valider).

---

## 10. Confirmation conversationnelle

La validation n'est **pas forcément une modale**. Le plus souvent c'est un
**bouton intégré dans la réponse de Mue**. Le clic **vaut confirmation**.

Exemples de boutons de confirmation :
- `Oui, crée-les dans ma liste perso`
- `Bloque ce créneau`
- `Ajoute-les à ma file de travail`
- `Transforme ce devis en présentation`
- `Crée un document avec cette structure`

Style : bouton plein (accent) pour l'action principale, boutons secondaires
(ghost) pour les alternatives. Une fois cliqué, le bouton devient inactif et
affiche son état (« ⟳ Création… » puis « ✓ Fait »).

---

## 11. Exécution réelle (Niveau 4)

Après validation :

1. Mue **exécute** l'action.
2. Les objets **apparaissent réellement** dans la page principale (la liste de
   tâches se remplit, le devis s'ouvre, l'event se pose dans Calendar).
3. La **progression est visible dans le chat** (tracker x/n).
4. À la fin, Mue **confirme** ce qui a été fait.
5. Les objets créés sont affichés en **liens cliquables**.

> **Exemple :** « C'est fait — **7 tâches** créées dans *Ma liste perso*. »
> (chaque tâche est un lien vers le Tableau).

---

## 12. Flow complet — Création de tâches

```
1. User      : « Crée mes tâches de la semaine »
2. Mue       : tracker « Analyse tes fils… »
3. Mue       : carte PREVIEW (7 tâches, dates, priorités, clients)
               + bouton « Oui, crée-les dans ma liste perso »
4. User      : clique le bouton
5. Mue       : tracker progression
               ⟳ Création tâche 1/7 → ✓ … → 7/7
6. Canvas    : les 7 tâches apparaissent dans le Tableau (vue Tâches)
7. Mue       : « C'est fait, 7 tâches créées dans Ma liste perso. »
               + 7 liens cliquables
8. Mue       : suggestions
               • Bloque du temps dans mon calendrier pour chaque tâche
               • Crée un agent qui trie mon inbox chaque lundi
               • Quels projets clients rapportent le plus vs temps passé ?
```

---

## 13. Flow complet — Création de document

Si la demande est **suffisamment claire**, Mue peut créer **directement** (pas de
preview obligatoire pour un seul objet net).

```
1. User   : « Crée un devis fictif pour Jean-Pierre »
2. Mue    : tracker « Rédige le devis… »
3. Canvas : le document s'ouvre dans le canvas principal
4. Mue    : « Done, voici ton devis. » + lien « Ouvrir le devis »
5. Mue    : suggestions
            • Transformer en présentation client
            • Bloquer un créneau pour le call découverte
            • Sauvegarder mes tarifs pour les prochains devis
```

Panneau Mue **reste à droite** ; le devis s'ouvre **à gauche**.

---

## 14. Flow complet — Gestion calendrier

Mue **lit d'abord** les disponibilités, **propose**, puis crée **après choix**.

```
1. User : « Bloque un créneau lundi pour le call découverte »
2. Mue  : lit le calendrier
          « Tu es libre à partir de 10h lundi.
            Créneaux : 10h · 10h30 · 11h · 11h30 · 12h »   (chips choisissables)
3. User : « 10h c'est parfait »  (ou clic sur le chip 10h)
4. Mue  : crée l'événement
5. Mue  : « C'est posé : lundi 29 juin, 10h00–10h45,
            avec lien Google Meet. »
          + bouton « Voir l'événement »
6. Mue  : suggestions
          • Envoyer l'invitation au client
          • Préparer une note de prep pour le call
```

Confirmation finale **toujours** avec : date, heure, **durée**, fuseau horaire.

---

## 15. Suggestions après réponse (contextuelles)

Après **chaque** réponse ou action, 2–3 suites **contextuelles** (jamais génériques).

| Après… | Suggestions |
|---|---|
| Création de tâches | Bloque du temps pour chaque tâche · Crée un agent qui trie l'inbox le lundi · Quels projets rapportent le plus vs temps passé ? |
| Création de devis | Transforme en présentation client · Bloque un call découverte · Sauvegarde mes tarifs |
| Analyse santé client | Rédige une relance pour le plus silencieux · Bloque du temps pour les relances · Marque les clients à risque |
| Réponse à un message | Propose 2 autres formulations · Programme l'envoi pour demain 9h · Crée une tâche de suivi |

---

## 16. Limites de l'agent (refus gracieux)

Mue **ne peut pas tout faire**. Pour le risqué/destructif : refus poli + explication
+ **alternative manuelle**.

**Exemple :**

> **User** : « Supprime toutes mes tâches. »
>
> **Mue** : « Je ne peux pas supprimer des tâches en masse — c'est une action
> sensible et irréversible. Tu peux les sélectionner dans le **Tableau** puis les
> envoyer à la **Corbeille** d'un clic. »
> *(bouton : `Ouvrir le Tableau`)*

### Matrice d'autorisation

| Type d'action | Politique |
|---|---|
| Réponse / analyse | ✅ Directe (Niveau 1) |
| Recommandation | ✅ Directe, attend une action (Niveau 2) |
| Création légère (1 objet net) | ✅ Possible directe ou confirmation selon contexte |
| Création multiple / destination floue | ⚠️ Preview + confirmation (Niveau 3) |
| Modification légère | ⚠️ Confirmation |
| Planification (calendrier) | ⚠️ Après choix utilisateur d'un créneau |
| Suppression massive | ⛔ **Refus** → renvoi action manuelle |
| Action sensible (envoi externe, partage, paiement) | ⛔ Validation explicite obligatoire |

---

## 17. Fermeture pendant génération

Si l'utilisateur tente de fermer (`»»` ou clic ailleurs) **pendant que Mue
travaille** → modale de confirmation. Jamais d'interruption silencieuse.

```
┌─────────────────────────────────────┐
│  Arrêter de générer ?               │
│                                     │
│  La fermeture annulera la réponse   │
│  en cours.                          │
│                                     │
│        [ Laisser ouvert ]  [ Fermer ]│
└─────────────────────────────────────┘
```
- Bouton secondaire (ghost) : **« Laisser ouvert »** (défaut, focus)
- Bouton principal (danger léger) : **« Fermer »**

---

## 18. Les 4 niveaux d'autonomie

| Niveau | Nom | Mue fait… | Validation |
|---|---|---|---|
| **1** | Réponse simple | Répond, ne modifie rien | Aucune |
| **2** | Recommandation actionnable | Propose objets / organisation, attend l'action | Aucune (l'utilisateur agit) |
| **3** | Action préparée | Prépare création/modification (preview) | **Demande validation** |
| **4** | Action exécutée | Agit réellement dans Freescale | Après validation **ou** si demande non risquée |

---

## 19. Règles transverses

### Règles d'autonomie
1. Toujours classer l'action demandée (N1→N4) avant d'agir.
2. N4 sans validation **uniquement** si : objet unique + destination claire + non sensible.
3. Multiple / flou / sensible → **toujours** passer par N3 (preview + confirm).

### Règles de confirmation
1. Confirmation **conversationnelle** (bouton dans la bulle) par défaut.
2. Modale réservée à : fermeture pendant génération, action sensible irréversible.
3. Le bouton de confirmation montre son cycle de vie : repos → `⟳ …` → `✓ Fait`.

### Règles de feedback (l'utilisateur comprend toujours)
- **Ce que Mue a compris** : reformulation courte en tête de réponse.
- **Ce qu'elle va faire** : preview ou phrase d'intention.
- **Si elle attend** : bouton de confirmation visible.
- **Si elle agit** : tracker x/n.
- **Ce qui a changé** : confirmation finale chiffrée.
- **Où le retrouver** : liens cliquables vers les objets.

### Microcopy recommandée (FR, tutoiement, ton Freescale)
| Contexte | Texte |
|---|---|
| Placeholder composer | « Besoin d'aide ? Pose une question, recherche ou crée. » |
| Génération | « J'y travaille… » |
| Statut court | « Réfléchit… » / « Analyse… » / « Au travail… » |
| Sous-étape | « Création tâche 3/7… » |
| Confirmation tâches | « Oui, crée-les dans ma liste perso » |
| Confirmation créneau | « Bloque ce créneau » |
| Succès création | « C'est fait — 7 tâches créées dans Ma liste perso. » |
| Succès event | « C'est posé : lundi 29 juin, 10h00–10h45, lien Meet inclus. » |
| Refus | « Je ne peux pas faire ça — voici comment le faire toi-même. » |
| Fermeture génération | « Arrêter de générer ? La fermeture annulera la réponse en cours. » |

---

## 20. Tableau des interactions

| # | Action utilisateur | Réaction Mue | Niveau | Canvas affecté |
|---|---|---|---|---|
| 1 | Ouvre le panneau | Hero + chips d'intention | — | Compressé, visible |
| 2 | Clic chip « Prioriser » | Liste de suggestions | — | — |
| 3 | Clic suggestion | Préremplit composer (pas d'envoi) | — | — |
| 4 | Envoie une question | Bulle + analyse + liens + suggestions | 1→2 | — |
| 5 | Clic objet cité | Ouvre l'objet, garde Mue ouvert | — | Change |
| 6 | « Crée mes tâches » | Preview + bouton confirm | 3 | — |
| 7 | Clic « Crée-les » | Tracker x/n + objets apparaissent | 4 | Tâches se remplit |
| 8 | « Crée un devis pour X » | Crée direct + ouvre doc + lien | 4 | Document s'ouvre |
| 9 | « Bloque un créneau » | Propose créneaux → choix → crée | 3→4 | Calendar |
| 10 | « Supprime tout » | Refus + alternative manuelle | — | — |
| 11 | Ferme pendant génération | Modale « Arrêter de générer ? » | — | — |
| 12 | Clic Stop | Interrompt, garde le partiel | — | — |

---

## 21. Recommandations d'implémentation dans Freescale

> Hors-périmètre de Prompt 1 (qui est un audit/spec). Listé ici comme passerelle
> vers les prompts suivants.

1. **Base existante** : `MuePanel.tsx` a déjà le rail droit, le composer, le hero,
   le sélecteur de discussions, la Mémoire inline. Construire la couche agentique
   **par-dessus**, sans casser le chat actuel.
2. **Types de messages** : étendre le modèle de message Mue avec des `kind` :
   `text` (existe), `preview`, `progress`, `object-card`, `suggestions`, `refusal`.
   (Le pattern `kind: "privacy"` / `kind: "scan"` existe déjà — suivre la même voie.)
3. **Cartes objets** : un composant `MueObjectCard` qui mappe `{type, id, label,
   meta}` → carte cliquable → `setActiveConvId` / ouverture fiche / `setView`.
4. **Tracker** : composant `MueProgress` (statut + liste de sous-étapes avec
   états `pending|running|done`).
5. **Confirmation** : un `MueConfirmButton` qui gère le cycle repos→running→done,
   appelle l'action mock (`actions/mue`) puis émet la confirmation + suggestions.
6. **Suggestions** : réutiliser le style des chips existants ; les rendre dans la
   dernière bulle Mue, pas dans le composer.
7. **Mock-first** : tout doit marcher en mode démo (DEMO_MODE) avec `mock-v2.ts` —
   créations de tâches/devis/events purement locales et optimistes (cf. mémoire
   projet : *server actions wipe optimistic task state in mock mode*).
8. **Garde-fou fermeture** : intercepter le clic `»»` quand `pending === true` →
   afficher la modale « Arrêter de générer ? ».

---

*Fin de Prompt 1 — Spécification UX du panneau agentique Mue.*
