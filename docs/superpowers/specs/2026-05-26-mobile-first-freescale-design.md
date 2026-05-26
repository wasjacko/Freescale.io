# Freescale - Experience mobile-first complete

## Decision produit

Freescale doit devenir un SaaS mobile-first sur l'ensemble du parcours :
site public, pricing, authentification, application connectee et reglages.
La version telephone n'est pas une interface bureau comprimee. Elle est la
forme prioritaire du produit, pensee pour agir rapidement au pouce.

Cette specification complete
`2026-05-26-task-first-today-design.md`. Le centre de gravite du produit est
la tache : Mue augmente la capacite de l'utilisateur a collecter et clarifier
les actions, mais Freescale reste utile sans appel IA et sans canal connecte.

## Promesse utilisateur

En arrivant depuis un telephone, un utilisateur doit pouvoir :

1. comprendre immediatement ce qu'il peut faire avec Freescale ;
2. se connecter ou revenir au produit sans etapes pedagogiques repetitives ;
3. voir ce qu'il doit faire maintenant et ajouter une tache en quelques
   secondes ;
4. retrouver une conversation, une tache, son agenda, Mue ou ses reglages en
   quelques taps previsibles ;
5. utiliser l'ensemble du produit sans contenu masque par un menu, une barre
   fixe, le clavier virtuel ou une zone sure systeme.

## Approche retenue

### Shell mobile natif et vues adaptatives

Les routes, donnees et fonctions metier existantes sont conservees. Chaque
surface obtient cependant un comportement adapte au tactile, avec une
navigation mobile stable et des modes de presentation specifiques lorsque le
format bureau n'est pas utilisable sur petit ecran.

Cette approche est preferee a :

- une compression CSS de l'interface bureau, qui conserverait une hierarchie
  confuse et des interactions peu tactiles ;
- une seconde application mobile independante, qui dupliquerait les flux et
  augmenterait le risque de divergence.

## Regles d'interface communes

### Base mobile

- La mise en page de base cible le telephone en une colonne, puis les
  breakpoints `min-width` enrichissent tablette et bureau.
- Les marges principales sont de `16px` sur telephone ; les panneaux occupent
  toute la largeur utile.
- Toute action tactile interactive mesure au moins `44px` dans son axe
  principal.
- Les contenus defilants reservent l'espace de la navigation basse, du
  clavier et des safe areas.
- Le premier viewport expose une action ou une information utile, jamais une
  grande surface decorative qui repousse le travail.

### Direction visuelle

- Typographie DM Sans dans tout le produit.
- Toile claire, texte proche du noir et bordures fines pour l'interface de
  travail.
- Boutons dominants noirs et pills coherents sur pages publiques, auth et
  application.
- Couleurs et gradients Mue reserves aux surfaces Mue, illustrations et
  moments de marque ; ils ne remplacent pas la hierarchie fonctionnelle.
- Ombres sobres et cartes simples : la densite doit servir la lecture rapide
  plutot que produire un aspect marketing dans l'application.

### Etats transversaux

- Chargement : squelettes courts et stables, sans changement brutal de
  structure.
- Erreur temporaire ou hors ligne : toast discret avec possibilite de
  relancer, sans obstruer la navigation.
- Session expiree : toast discret puis redirection propre vers la connexion,
  sans topbar persistante.
- Limites d'essai et upgrade : accessibles dans `Plus` et les reglages, ou
  contextualises au moment pertinent ; pas de bandeau permanent bloquant
  l'action principale.

## Site public et acquisition

### Navigation et hero

- La navigation mobile affiche le wordmark, une action primaire et un bouton
  menu ; les liens secondaires vivent dans une feuille ou un panneau menu.
- Le hero tient dans une seule colonne avec titre court, explication directe
  et CTA principal visible sans chercher.
- La demonstration produit montre la capture et le suivi de taches issus des
  messages ; Mue est presente comme le copilote qui aide a les collecter et
  les prioriser.

### Message produit

La landing et le pricing decrivent d'abord la valeur autonome :
centraliser ses messages, collecter les actions importantes et terminer le
travail depuis une seule liste. Mue est un avantage premium et un gain de
vitesse, pas une condition pour que le produit ait du sens.

### Pricing

- Les cartes de plan passent en pile sur telephone.
- L'offre et l'action recommandees sont lisibles avant les details longs.
- Les limites liees a Mue sont distinguees des capacites de base de gestion
  des taches.

## Authentification et retour au produit

- Les formulaires sont en pleine largeur utile, avec controles de `44px`
  minimum et une action principale evidente.
- Un utilisateur habituel qui choisit Google est conduit directement dans le
  produit apres authentification.
- L'ecran expliquant les permissions Google ne s'affiche que lors d'une
  premiere autorisation ou lorsqu'une nouvelle permission doit réellement
  etre accordee.
- Les erreurs de connexion sont expliquees sur place, sans casser la
  navigation de retour.

## Application connectee : navigation mobile

### Shell

Sur telephone, le shell comprend :

- une barre haute compacte avec le titre de la vue active et les actions
  contextuelles necessaires ;
- une barre basse fixe avec cinq destinations :
  `Aujourd'hui`, `Inbox`, `Taches`, `Calendrier`, `Plus` ;
- une feuille `Plus` contenant Mue, AI Knowledge, canaux, reglages, compte et
  informations de plan.

La sidebar bureau n'est pas affichee au chargement mobile et ne recouvre
jamais l'ecran par defaut. Sur tablette et bureau, la navigation existante
peut redevenir laterale et les panneaux peuvent se presenter en colonnes.

### Navigation et accessibilite

- La destination active est identifiee visuellement et textuellement.
- Les icones possedent un libelle accessible.
- Le bouton retour d'une conversation ou d'un sous-ecran est toujours
  visible en mobile.
- Les feuilles et dialogues piegent correctement le focus et se ferment avec
  une action explicite.

## Ecran `Aujourd'hui`

La specification task-first existante reste la source de verite
fonctionnelle. Son adaptation mobile impose :

- destination d'ouverture apres connexion ;
- en-tete court avec un compteur derive des taches reelles ;
- capture rapide immediatement visible et bouton `Ajouter` tactile ;
- section `A faire maintenant` comprenant taches en retard, dues aujourd'hui
  ou hautement prioritaires, cochables sans ouvrir un detail ;
- section `A organiser ensuite` limitee, puis lien vers la vue complete ;
- bouton secondaire `Collecter avec Mue`, uniquement lorsqu'il peut produire
  des suggestions pertinentes ;
- aucune analyse Mue au chargement et aucune dependance a un canal connecte.

Une suggestion Mue est toujours confirmee individuellement avant creation
d'une tache.

## Inbox et conversation

### Liste mobile

- La liste de conversations est l'ecran initial de l'Inbox.
- Recherche, onglets principaux et compteurs restent visibles sous forme
  compacte ; les filtres secondaires s'ouvrent dans une feuille.
- Chaque ligne expose expediteur, sujet/extrait, canal, heure et etat non lu
  sans obliger au defilement horizontal.

### Conversation mobile

- Un tap ouvre une conversation en plein ecran, avec retour vers la liste.
- Le composeur reste utilisable au-dessus de la barre basse et du clavier.
- Les outils secondaires sont regroupes dans un menu plutot que repartis sur
  une barre trop chargee.
- Les commandes Mue sur la conversation sont lancees explicitement par
  l'utilisateur.

## Vue `Taches`

- La vue demeure l'espace complet de classement et de suivi.
- Sur mobile, elle utilise une liste compacte verticale avec checkbox, titre,
  priorite, echeance et menu d'actions.
- Les filtres de premier niveau sont `Aujourd'hui`, `A venir` et
  `Terminees`.
- La creation d'une tache reste accessible en permanence.
- Les interactions dependant d'une souris, notamment hover ou drag comme
  action unique, sont remplacees par des commandes tactiles explicites.

## Vue `Calendrier`

- Telephone : vue agenda chronologique par jour, avec changement de date
  simple et acces aux taches/evenements du jour.
- Tablette et bureau : la grille calendrier existante peut rester disponible
  lorsqu'elle est lisible et manipulable.
- Aucune grille hebdomadaire complete ne doit etre forcee dans une largeur
  mobile.

## Mue et AI Knowledge

- Mue est accessible depuis `Plus`, depuis une conversation et depuis
  `Collecter avec Mue` dans `Aujourd'hui`.
- Sur mobile, son interface s'ouvre en feuille ou en vue dediee ; elle ne
  disparait pas sans alternative lorsque le panneau lateral bureau est
  masque.
- Mue garde sa surface de marque plus expressive, sans repousser les taches
  ni bloquer leur creation.
- AI Knowledge est accessible depuis `Plus` avec une presentation verticale
  compacte de la recherche et des resultats.

## Reglages et compte

- Les reglages sont accessibles depuis `Plus`.
- Chaque sous-page mobile affiche un en-tete avec retour, titre et action
  eventuelle ; la navigation des rubriques devient liste ou onglets
  horizontaux accessibles.
- Les champs, connexions, membres, templates et elements de facturation sont
  empiles et ne creent aucun tableau horizontal inutilisable.
- Le compte, la deconnexion et l'etat de l'abonnement restent faciles a
  trouver, sans occuper en permanence la surface de travail.

## Donnees et architecture technique cible

### Donnees

- Aucun schema de base de donnees n'est requis pour la refonte mobile.
- `Aujourd'hui` utilise les taches reelles chargees dans le contexte de
  donnees existant.
- Le modele/adaptateur de tache expose l'echeance ISO deja stockee afin de
  classer fiablement retard, aujourd'hui et avenir.
- La creation rapide reutilise l'action de creation manuelle existante.
- Mue n'effectue une collecte que sur action volontaire et ne cree pas
  automatiquement plusieurs taches depuis l'accueil.

### Composants cibles

Les frontieres de composants attendues sont :

- `MobileAppHeader` : titre et actions contextuelles de la vue active ;
- `MobileBottomNav` : navigation principale stable ;
- `MobileMoreSheet` : acces aux fonctions secondaires et au compte ;
- blocs task-first reutilisables de `Aujourd'hui` ;
- presentation mobile liste/thread de l'Inbox ;
- presentation mobile liste de `Taches` ;
- presentation agenda mobile de `Calendrier` ;
- adaptations responsive des surfaces publiques, auth et reglages.

Les noms exacts pourront suivre les conventions du code existant, mais chaque
unite doit garder une responsabilite unique et testable.

## Ordre d'implementation

La portee est large ; elle sera livree en tranches coherentes sur le meme
produit, sans application parallele :

1. fondation mobile du shell et accueil `Aujourd'hui` task-first ;
2. Inbox, conversation, taches, calendrier, Mue et AI Knowledge mobiles ;
3. reglages, auth, landing et pricing coherents avec le nouveau message ;
4. passe de finition responsive, accessibilite et verification visuelle
   multi-tailles.

Chaque tranche doit laisser l'application utilisable et testable.

## Erreurs et cas limites

- Zero tache : proposer d'en creer une, sans forcer Mue.
- Zero canal : `Aujourd'hui` et `Taches` restent utilisables ; la collecte
  depuis messages est simplement indisponible.
- Mue indisponible, quota atteint ou analyse en echec : toast discret et
  aucune perte de tache existante.
- Session expiree : retour a l'authentification avec information discrete.
- Echec de creation ou completion de tache : maintenir le contexte visible et
  permettre une nouvelle tentative.
- Ecran tres etroit ou clavier ouvert : les CTA essentiels et le composeur
  restent accessibles.

## Verification attendue

### Fonctionnelle

- Un utilisateur sans Gmail et sans Mue cree, consulte et termine une tache
  depuis son telephone.
- L'ouverture de `Aujourd'hui` ne lance aucun appel automatique a Mue.
- Une collecte Mue n'aboutit a une tache qu'apres confirmation utilisateur.
- Un utilisateur habituel se reconnecte avec Google sans revoir une page
  explicative inutile lorsque les permissions sont deja valides.

### Parcours mobile

- Les destinations principales sont accessibles depuis la barre basse.
- Le parcours Inbox liste -> conversation -> reponse -> retour fonctionne
  sans chevauchement du clavier ou des barres fixes.
- Le calendrier est utilisable en agenda sur telephone.
- Mue, AI Knowledge, les reglages et le compte sont trouvables depuis
  `Plus`.

### Qualite visuelle et technique

- Tests cibles sur le shell mobile, `Aujourd'hui`, les flux auth modifies et
  toute logique de classement des taches.
- Verification visuelle dans le navigateur aux largeurs petit mobile, grand
  mobile, tablette et bureau pour site public, auth et application.
- Controle qu'aucun texte, menu, dialogue, composeur ou CTA n'est coupe,
  masque ou inaccessible.
- Verification d'accessibilite de base : focus, libelles, contrastes et
  cibles tactiles.

## Hors scope

- Application mobile native iOS ou Android.
- Notifications push natives.
- Modification du schema de donnees ou nouvelle logique de synchronisation
  serveur non necessaire aux vues definies ici.
- Creation automatique de taches par Mue sans confirmation utilisateur.
