# Freescale - Accueil Aujourd'hui centre sur les taches

## Decision produit

Cette specification remplace le principe Mue-first de
`2026-05-26-today-operational-home-design.md`.

Freescale doit etre utile sans IA : sa valeur de base est de collecter,
clarifier et terminer les taches qui emergent du travail quotidien. Mue ne
fabrique plus l'accueil ; il accelere volontairement la collecte de taches
depuis les conversations.

## Objectif utilisateur

En ouvrant Freescale, l'utilisateur doit repondre en quelques secondes a :

1. Qu'est-ce que je dois faire maintenant ?
2. Puis-je noter une nouvelle action immediatement ?
3. Si ma boite mail contient du travail cache, puis-je demander a Mue de
   m'aider a l'extraire ?

## Experience `Aujourd'hui`

`Aujourd'hui` reste la destination par defaut. Elle ne lance aucune analyse
Mue a son ouverture et fonctionne meme sans canal connecte.

### En-tete

- Salutation et date, puis titre derive des taches reelles : par exemple
  `3 taches a traiter aujourd'hui.` ou `Votre journee est degagee.`
- Action primaire `Nouvelle tache`, toujours disponible.
- Action secondaire plus discrete `Collecter avec Mue`, disponible lorsque
  des conversations existent.

### Capture rapide

- Une zone de saisie immediatement visible permet d'ajouter une tache sans
  changer de page.
- Le flux rapide cree une tache de priorite moyenne sans echeance a partir du
  titre. Le bouton `Nouvelle tache` ouvre le formulaire complet existant pour
  definir priorite et echeance avant creation.
- Une creation reussie apparait dans la liste sans perdre le contexte de
  l'accueil.

### Liste `A faire maintenant`

- Source : taches existantes, jamais recommandations IA non confirmees.
- Affiche les taches non terminees qui sont dues aujourd'hui, en retard ou de
  priorite haute.
- Chaque ligne permet de cocher la tache, lit clairement son echeance et sa
  priorite, et conserve un acces a la conversation si elle en provient dans
  une iteration ulterieure.
- Les taches urgentes et en retard sont placees avant les autres.

### Liste `A organiser ensuite`

- Regroupe les autres taches ouvertes, limitees aux prochaines lignes utiles
  pour ne pas reconstruire toute la page `Tasks`.
- Un lien `Voir toutes les taches` ouvre la vue complete, qui reste l'espace
  de classement, sous-taches et reorganisation.

### Collecte avec Mue

- Mue n'apparait pas comme condition d'utilisation de la page.
- Un bouton volontaire lance l'analyse des conversations uniquement apres
  action utilisateur.
- Les suggestions sont presentees comme propositions, avec confirmation avant
  creation de chaque tache ; aucune creation automatique depuis l'accueil.
- L'absence de canal masque l'action Mue mais ne remplace jamais le tableau de
  taches par un ecran de connexion.

## Etats et erreurs

- Sans tache : afficher un etat calme centre sur `Creer ma premiere tache`,
  avec la collecte Mue seulement comme raccourci facultatif si disponible.
- Sans canal : la creation et les taches restent pleinement visibles.
- Analyse Mue indisponible ou quota atteint : notification discrete ; la
  liste de taches ne change pas.
- Echec de creation ou de completion : conserver la tache visible et afficher
  un toaster d'erreur.

## Architecture cible

- `TodayView` consomme directement `tasks` et `toggleTask` depuis
  `DataContext`.
- `Task` et son adaptateur exposent l'echeance ISO deja stockee dans
  `due_at`, afin de distinguer de facon fiable retard, aujourd'hui et a venir
  sans modification de schema.
- La creation rapide reutilise l'action existante `createTask` ; le formulaire
  complet reutilise `NewTaskModal`.
- La collecte Mue reutilise `dailyBriefing`, mais uniquement dans le handler
  du bouton dedie. Les items renvoyes sont des suggestions confirmables via
  `createTaskFromBrief`.
- Les listes derivees (`maintenant` et `ensuite`) sont calculees localement a
  partir des taches chargees ; aucun nouvel appel serveur n'est requis pour
  afficher l'accueil.

## Hors scope

- Pas de changement du schema de donnees des taches.
- Pas de lien conversation/tache enrichi sur la ligne `Aujourd'hui`.
- Pas de creation automatique de toutes les suggestions Mue.
- Pas de suppression de la vue `Tasks`, qui conserve ses fonctions de gestion
  avancee.

## Verification attendue

- L'ouverture de `Aujourd'hui` ne contient aucun appel automatique a
  `dailyBriefing`.
- La page montre et permet de completer des taches lorsque zero canal est
  connecte.
- La creation manuelle est l'action dominante et fonctionne sans Mue.
- Une action utilisateur explicite peut obtenir des suggestions Mue puis en
  creer une en tache.
- Le rendu reste propre en bureau et mobile, avec la liste utile visible sans
  obstruction commerciale.
