# Freescale - Refonte mobile-first de l'application connectee, direction C

## Decision

La refonte mobile de l'application connectee adopte la direction C validee :
un accueil premium porte par un grand brief Mue, suivi immediatement par la
capture de tache et la liste des actions reelles.

Cette specification complete :

- `2026-05-26-task-first-today-design.md`
- `2026-05-26-mobile-first-freescale-design.md`

Elle ajuste la doctrine "task-first" sans la renverser : Mue devient le
signal visuel et narratif fort de l'accueil, mais les taches restent la
valeur de base. L'utilisateur doit pouvoir creer, consulter et terminer une
tache meme si Mue est indisponible, si aucun canal n'est connecte ou si un
quota est atteint.

## Objectif utilisateur

Sur telephone, un utilisateur habituel doit comprendre en moins de cinq
secondes :

1. ce qui merite son attention aujourd'hui ;
2. comment ajouter une tache tout de suite ;
3. comment consulter ses messages ;
4. ou retrouver Mue, les taches completes, l'agenda, les reglages et le
   compte.

L'application ne doit pas ressembler a une version bureau compressee. Elle
doit fonctionner comme un produit mobile : une colonne, actions au pouce,
navigation basse, conversation plein ecran, composeur degage.

## Direction visuelle

### Systeme

- DM Sans sur toutes les surfaces applicatives mobiles.
- Toile claire, cartes blanches, texte proche du noir, bordures fines.
- Boutons principaux noirs en pill.
- Cibles tactiles de `44px` minimum.
- Rayon modere sur les surfaces de travail ; rayon plus expressif sur les
  surfaces Mue.
- Ombres sobres, principalement pour separer les panneaux mobiles et les
  feuilles.

### Usage des couleurs

- Le noir structure les actions primaires et la navigation active.
- Le violet/corail/bleu doux est reserve a Mue : brief, suggestions,
  entree dans `Plus`, resultats d'analyse.
- Les surfaces standards comme `Inbox`, `Taches`, `Agenda` et reglages
  restent calmes, blanches et lisibles.

### Regle Mue

Mue peut mener visuellement sur l'accueil, mais ne doit jamais devenir une
condition pour utiliser Freescale. Toute action Mue cree une suggestion ou
une synthese qui demande confirmation avant d'ecrire une tache.

## Architecture de l'experience mobile

### Navigation principale

Sur web mobile et dans l'app iPhone cible, les destinations principales sont :

- `Aujourd'hui`
- `Inbox`
- `Taches`
- `Agenda`
- `Plus`

La barre basse est visible sur les ecrans principaux. Elle n'est pas visible
dans une conversation plein ecran, afin de laisser de la place a la lecture
et au composeur.

`Plus` contient :

- Mue Copilot
- AI Knowledge
- Canaux connectes
- Calendriers
- Parametres
- Aide et support
- Confidentialite
- Compte

Sur bureau, la sidebar existante peut rester l'interface principale. La
refonte mobile ne supprime pas la navigation bureau ; elle ajoute une
structure adaptee aux petits ecrans.

## Ecrans cibles

### `Aujourd'hui`

`Aujourd'hui` devient l'ecran d'entree par defaut apres connexion.

Ordre du contenu :

1. en-tete court avec date et salutation ;
2. grand brief Mue premium ;
3. capture rapide de tache ;
4. liste `A faire maintenant` basee sur les taches reelles ;
5. acces secondaire vers les suggestions Mue ou les taches completes si
   necessaire.

Le brief Mue affiche une accroche comme :

`3 actions meritent votre attention.`

Il explique que les actions seront preparees comme taches a confirmer une
par une. Le bouton principal du brief est :

`Voir les suggestions`

Au chargement, la carte de brief peut afficher un etat cache, un etat vide
ou un etat d'appel a action. Une nouvelle analyse fraiche ne part pas en
mode bloquant et ne cache pas la capture de tache. Si une analyse automatique
non bloquante est retenue pendant l'implementation, elle doit etre explicite
dans le plan et verifier que les taches restent utilisables pendant le
chargement.

La capture rapide reste visible dans le premier ecran utile. Elle permet de
creer une tache sans ouvrir de canal et sans declencher Mue.

La liste `A faire maintenant` affiche les taches non terminees qui sont :

- en retard ;
- dues aujourd'hui ;
- de priorite haute.

Si le brief mentionne trois actions, l'interface doit afficher soit trois
actions, soit une formulation coherente qui ne promet pas un nombre absent de
la liste.

### `Inbox`

L'inbox mobile est une liste lisible et compacte.

Elle comprend :

- titre et compteur ;
- recherche ;
- bouton filtre ;
- onglets principaux sous forme de pills ;
- action secondaire `Trier avec Mue` ;
- lignes de conversation avec expediteur, extrait, heure, canal et etat.

Mue ne remplace pas la lecture de l'inbox. Le tri avec Mue est volontaire et
contextuel.

### Conversation

Une conversation s'ouvre en plein ecran.

Structure :

- bouton retour visible ;
- titre centre avec contact et canal ;
- menu secondaire ;
- messages lisibles en pile verticale ;
- resultat Mue eventuel dans une carte claire ;
- composeur fixe en bas, au-dessus de la safe area et du clavier.

Le resultat Mue doit etre explicitement lie a une action utilisateur. La
carte utilise une formulation comme :

`MUE - RESULTAT DE VOTRE DEMANDE`

Si Mue propose une tache, le bouton confirme une seule creation :

`Creer cette tache`

Mue ne cree pas automatiquement toutes les taches d'une conversation.

### `Taches`

La vue `Taches` reste l'espace d'organisation complet.

Sur mobile, elle utilise :

- en-tete avec compteur ;
- action `+` ou bouton `Nouvelle tache` ;
- filtres tactiles `Aujourd'hui`, `A venir`, `Terminees` ;
- action secondaire `Collecter depuis l'inbox avec Mue` ;
- liste verticale avec checkbox, titre, source, echeance et priorite ;
- bouton flottant `Nouvelle tache` si l'action n'est pas visible dans
  l'en-tete.

Les interactions dependantes du hover ne sont pas obligatoires sur mobile.
Le drag peut rester disponible si fiable, mais chaque action critique doit
avoir une alternative visible.

### `Agenda`

L'agenda mobile est une vue chronologique, pas une grille bureau compressee.

La V1 de cette refonte peut se limiter a preparer le shell mobile et les
styles necessaires si l'agenda complet necessite une iteration separee. Dans
ce cas, l'entree `Agenda` doit rester accessible sans casser la navigation.

### `Plus`

`Plus` remplace la sidebar secondaire sur mobile.

Il presente Mue en premier sous forme de carte premium, puis les fonctions
secondaires en listes simples. Le compte reste visible en bas de l'ecran ou
de la feuille, avec acces aux reglages et a la deconnexion.

Dans l'app iPhone cible, `Plus` ne doit afficher aucun prix, checkout,
upgrade ou lien d'achat externe.

## Etats et cas limites

### Aucun canal connecte

L'ecran `Aujourd'hui` ne doit pas etre remplace par un ecran de connexion
Gmail.

L'etat affiche :

- un brief Mue calme indiquant que la collecte depuis messages sera
  disponible apres connexion ;
- la capture rapide de tache ;
- la liste des taches existantes, si elle existe ;
- un CTA secondaire `Connecter un canal`.

### Aucune tache

L'accueil propose d'abord :

- `Creer ma premiere tache`
- champ de capture rapide

Mue peut apparaitre comme raccourci secondaire si des conversations existent.

### Mue indisponible

Un echec Mue affiche un message discret ou un etat dans la carte de brief.
La liste de taches et la capture manuelle restent visibles.

L'erreur ne doit pas vider la page ni bloquer la navigation.

### Quota Mue atteint

L'utilisateur voit un message court expliquant que l'analyse est limitee.
Sur web, un upgrade peut etre accessible depuis le contexte approprie ou les
reglages. Dans l'app iPhone, aucun paywall ni achat n'est affiche.

### Session expiree

La session expiree est signalee par un toast discret, puis un retour propre
vers l'authentification. Pas de topbar persistante qui masque la navigation.

## Composants cibles

Les noms exacts peuvent suivre les conventions du code, mais les frontieres
attendues sont :

- `MobileAppHeader` : titre, date, action contextuelle, profil.
- `MobileBottomNav` : cinq destinations, etat actif, libelles accessibles.
- `MobileMoreSheet` ou `MobileMoreView` : Mue, outils secondaires, compte.
- `TodayBriefCard` : brief Mue avec etats `ready`, `loading`, `empty`,
  `error`, `quota`, `no-channel`.
- `QuickTaskCapture` : creation rapide sans modal.
- `TodayTaskList` : taches reelles a faire maintenant.
- `MobileInboxList` : recherche, tabs, filtre, tri Mue, lignes compactes.
- `MobileThreadView` : conversation plein ecran et composeur mobile.
- `MobileTasksView` : filtres tactiles, liste, FAB ou action header.

Les composants doivent rester decouples des appels Mue automatiques. Le
brief peut afficher un etat non bloquant au chargement, mais les suggestions
et les creations de tache doivent etre chargees uniquement apres une
intention utilisateur ou selon une logique explicitement validee dans le
plan.

## Donnees et comportement

### Source des taches

`Aujourd'hui` et `Taches` consomment les taches reelles du contexte de
donnees existant. Les suggestions Mue ne sont pas des taches tant qu'elles
ne sont pas confirmees.

### Mue

Mue peut fournir :

- brief du jour ;
- suggestions de taches depuis conversations ;
- synthese de conversation ;
- aide a la reponse.

Chaque action Mue est volontaire et doit afficher un etat de chargement.
Chaque creation de tache issue de Mue demande confirmation individuelle.

### Refresh et cache

La refonte web mobile peut reutiliser le cache et le `router.refresh`
existants. Elle ne requiert pas de nouvelle migration de schema. Si le plan
d'implementation detecte un manque pour classer les taches par echeance ou
statut, il devra proposer une modification separee.

## Responsive

### Mobile

- Une seule colonne.
- Marges principales autour de `16px`.
- Barre basse fixe avec safe area.
- Aucun scroll horizontal.
- Pas de sidebar visible par defaut.
- Conversation plein ecran.
- Composeur visible au-dessus du clavier.

### Tablette

- Une ou deux colonnes selon l'espace.
- La barre basse peut rester si la largeur est proche du mobile.
- Le panneau Mue peut devenir une colonne secondaire seulement si les taches
  restent visibles.

### Bureau

- La sidebar et les colonnes existantes peuvent rester.
- La direction visuelle doit etre harmonisee avec le mobile, mais le plan
  peut traiter le bureau comme adaptation secondaire.

## Accessibilite et qualite UX

- Tous les controles tactiles mesurent au moins `44px`.
- Les icones seules ont un libelle accessible.
- Les etats actifs ne reposent pas uniquement sur la couleur.
- Les textes secondaires ne descendent pas sous `12px` sur mobile.
- Le focus reste visible.
- Les erreurs expliquent quoi faire ensuite.
- Le clavier ne masque pas le composeur.
- Les toasts ne bloquent pas la navigation.
- L'utilisateur peut revenir de toute conversation a la liste.

## Hors scope

- Refonte complete du bureau au-dela de l'harmonisation necessaire.
- Application Android.
- Paiement in-app Apple.
- Notifications push serveur.
- Creation automatique de toutes les suggestions Mue.
- Fonctionnement hors ligne complet de l'inbox ou de Mue.
- Refonte de la landing page publique.

## Verification attendue

### Fonctionnelle

- `/app` ouvre `Aujourd'hui` par defaut pour un nouvel utilisateur.
- `Aujourd'hui` ne lance pas d'analyse Mue bloquante au chargement.
- La creation rapide de tache fonctionne sans canal connecte.
- Les taches existantes sont visibles et cochables sans Mue.
- Une suggestion Mue cree une tache seulement apres confirmation.
- Une conversation mobile permet retour, lecture, suggestion Mue et reponse.

### Visuelle

- Verification a `375px`, `390px`, `430px`, `768px` et desktop.
- Aucun texte ne deborde des boutons, pills, lignes de tache ou cartes.
- La barre basse ne masque pas le contenu.
- Le composeur de conversation reste visible et utilisable.
- Les surfaces Mue sont premium mais n'ecrasent pas les actions.

### Technique

- Tests cibles pour le comportement de `TodayView`.
- Tests ou verification manuelle pour absence d'appel Mue automatique au
  chargement de `Aujourd'hui`.
- Verification des etats `no-channel`, `empty-tasks`, `mue-error`,
  `quota`.
- Verification Playwright ou navigateur avec captures mobile avant push.
