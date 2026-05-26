# Freescale - Experience mobile-first et application iPhone App Store

## Decision produit

Freescale doit devenir un SaaS mobile-first sur l'ensemble du parcours et
disposer d'une vraie application iPhone publiable sur l'App Store : site
public, pricing, authentification, application connectee, reglages et client
iOS natif. La version telephone n'est pas une interface bureau comprimee ni
une simple WebView du site. Elle est la forme prioritaire du produit, pensee
pour agir rapidement au pouce.

Cette specification complete
`2026-05-26-task-first-today-design.md`. Le centre de gravite du produit est
la tache : Mue augmente la capacite de l'utilisateur a collecter et clarifier
les actions, mais Freescale reste utile sans appel IA et sans canal connecte.

La V1 iPhone est une application compagnon gratuite : elle permet
d'utiliser un compte Freescale et ses droits existants, mais ne vend pas
d'abonnement, ne presente pas de prix et ne dirige pas l'utilisateur vers un
achat externe depuis l'application.

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

### Deux clients coherents, un backend partage

Le client App Store est une application `apps/mobile` construite avec Expo /
React Native. Elle utilise des ecrans et une navigation iPhone natifs ; elle
ne charge pas l'application web dans une WebView.

Le client web Next.js continue d'exister et recoit une interface responsive
coherente avec le meme parcours mobile. Les deux clients partagent les
contrats metier, l'identite Supabase et une API Freescale authentifiee. Le
client iPhone ne depend pas des server actions propres a Next.js.

Cette approche est preferee a :

- Capacitor ou une WebView autour du site, qui offrirait peu de valeur native
  et augmenterait le risque de refus pour fonctionnalite minimale ;
- une implementation SwiftUI integralement separee, dont le cout de
  developpement et de maintenance ralentirait fortement la premiere
  publication.

## Distribution App Store V1

### Capacites natives justifiant l'application

- Navigation native iPhone pour `Aujourd'hui`, `Inbox`, `Taches`,
  `Calendrier` et `Plus`.
- Cache local de l'accueil et des taches recentes pour consultation hors
  connexion.
- Creation et completion de taches optimistes, synchronisees lorsque le
  reseau revient.
- Rappels locaux de taches, actives uniquement apres choix explicite de
  l'utilisateur.
- Stockage securise de la session sur l'appareil et retour dans l'app via
  deep link pour les authentifications/connexions externes.

Inbox et Mue peuvent exiger une connexion reseau en V1. Les notifications
push serveur, widgets et partage iOS ne sont pas necessaires a la premiere
soumission.

### Modele commercial dans l'app iPhone

- L'application iPhone est telechargeable gratuitement.
- Aucun achat integre n'est implemente en V1.
- Aucun prix, paywall, bouton `Passer a Pro`, checkout ou lien incitant a
  souscrire sur le web n'est affiche dans l'application native.
- Un utilisateur deja abonne hors de l'app conserve l'acces aux capacites
  correspondant a son compte.
- Le site web conserve le pricing et le checkout Stripe existants.

Cette strategie suit le modele d'application compagnon gratuite d'un service
web payant, sans achat ni appel a acheter dans l'app. L'acceptation finale
reste soumise a la revue Apple.

### Obligations de publication

- Proposer `Sign in with Apple` dans l'app native en plus de Google.
- Permettre d'initier la suppression du compte depuis l'application.
- Rendre accessibles la politique de confidentialite et le support.
- Preparer un compte de demonstration, des notes de review et une version
  TestFlight verifiable.
- Documenter pour Apple les fonctions natives, le fonctionnement hors
  connexion et l'absence de vente dans l'app.

References Apple officielles :

- App Store Review Guidelines :
  <https://developer.apple.com/app-store/review/guidelines/>
- Offering account deletion in your app :
  <https://developer.apple.com/support/offering-account-deletion-in-your-app/>

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
- Sur le web, limites d'essai et upgrade : accessibles dans les reglages ou
  contextualises au moment pertinent ; pas de bandeau permanent bloquant
  l'action principale.
- Dans l'app iPhone, aucune incitation d'upgrade n'est presentee.

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
- Dans l'app native, Apple et Google sont proposes de maniere equivalente ;
  les parcours OAuth utilisent un contexte systeme securise puis un deep
  link de retour vers l'app.
- Un utilisateur habituel qui choisit Google ou Apple est conduit directement
  dans le produit apres authentification.
- L'ecran expliquant les permissions Google ne s'affiche que lors d'une
  premiere autorisation ou lorsqu'une nouvelle permission doit réellement
  etre accordee.
- Les erreurs de connexion sont expliquees sur place, sans casser la
  navigation de retour.

## Application connectee : navigation iPhone et web mobile

### Shell

Dans l'app iPhone et dans le web mobile, le shell comprend :

- une barre haute compacte avec le titre de la vue active et les actions
  contextuelles necessaires ;
- une barre basse fixe avec cinq destinations :
  `Aujourd'hui`, `Inbox`, `Taches`, `Calendrier`, `Plus` ;
- une feuille `Plus` contenant Mue, AI Knowledge, canaux, reglages et compte.

La sidebar bureau n'est pas affichee au chargement mobile et ne recouvre
jamais l'ecran par defaut. Sur tablette et bureau, la navigation existante
peut redevenir laterale et les panneaux peuvent se presenter en colonnes.

Le web peut afficher les informations de plan dans ses reglages. Le client
iPhone n'affiche aucune destination d'achat ou d'upgrade.

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
- Le compte et la deconnexion restent faciles a trouver. Les details
  d'abonnement restent accessibles sur le web ; l'app iPhone applique les
  droits existants sans presenter de parcours commercial.

## Donnees, API et architecture technique cible

### Donnees

- `Aujourd'hui` utilise les taches reelles chargees dans le contexte de
  donnees existant sur le web et par l'API dans l'app native.
- Le modele/adaptateur de tache expose l'echeance ISO deja stockee afin de
  classer fiablement retard, aujourd'hui et avenir.
- Sur le web, la creation rapide reutilise l'action de creation manuelle
  existante ; dans l'app iPhone, elle utilise l'endpoint API equivalent.
- Mue n'effectue une collecte que sur action volontaire et ne cree pas
  automatiquement plusieurs taches depuis l'accueil.
- Un stockage local iPhone conserve la vue task-first et une file de
  mutations de taches en attente de synchronisation.
- Aucune migration de schema n'est supposee dans la conception ; le plan API
  verifiera si les champs existants suffisent a resoudre les conflits de
  synchronisation, et proposera une migration seulement si elle est
  necessaire.

### API partagee

L'API Cloudflare/Hono actuelle, aujourd'hui centree sur le webhook Stripe,
est etendue par des endpoints authentifies consommables par l'app native :

- session/profil et suppression de compte ;
- lecture, creation et completion des taches ;
- donnees `Aujourd'hui` necessaires a l'accueil hors-ligne ;
- conversations et detail d'une conversation ;
- donnees agenda/calendrier ;
- requetes Mue explicitement declenchees.

Les endpoints valident la session Supabase et les droits de workspace cote
serveur. Aucune cle privilegiee ni logique Stripe n'est embarquee dans
l'application.

### Composants web cibles

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

### Ecrans natifs cibles

L'application Expo comprend :

- navigation racine d'authentification et onglets connectes ;
- ecran natif task-first `Aujourd'hui` et stockage local des taches ;
- ecrans `Inbox`, conversation, `Taches`, agenda et `Plus` ;
- ecrans compte, confidentialite, support et suppression de compte ;
- acces Mue volontaire depuis `Plus`, `Aujourd'hui` et une conversation.

## Ordre d'implementation

La portee est trop large pour un seul plan d'execution. Elle est livree en
tranches ordonnees, chacune avec son plan et sa verification :

1. fondation App Store : contrat/API authentifiee des taches, projet Expo,
   login Apple/Google, navigation native et accueil `Aujourd'hui` task-first
   avec cache/synchronisation minimale ;
2. fonctions natives principales : Inbox/conversation, taches completes,
   agenda, Mue, AI Knowledge et compte/suppression ;
3. web mobile coherent : shell responsive, accueil task-first, parcours
   applicatifs, auth, landing et pricing ;
4. preparation publication : rappels locaux, confidentialite/support,
   accessibilite, TestFlight, dossier de review et verification multi-device.

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
- Hors ligne dans l'app iPhone : montrer les donnees mises en cache, signaler
  la synchronisation en attente et ne perdre aucune mutation utilisateur.
- Ecran tres etroit ou clavier ouvert : les CTA essentiels et le composeur
  restent accessibles.

## Verification attendue

### Fonctionnelle

- Un utilisateur sans Gmail et sans Mue cree, consulte et termine une tache
  depuis son telephone.
- L'ouverture de `Aujourd'hui` ne lance aucun appel automatique a Mue.
- Une collecte Mue n'aboutit a une tache qu'apres confirmation utilisateur.
- Un utilisateur habituel se reconnecte avec Google ou Apple sans revoir une
  page explicative inutile lorsque les permissions sont deja valides.
- Les taches consultees, creees ou completees hors ligne dans l'app native se
  synchronisent correctement au retour du reseau.

### Parcours mobile

- Les destinations principales sont accessibles depuis la barre basse.
- Le parcours Inbox liste -> conversation -> reponse -> retour fonctionne
  sans chevauchement du clavier ou des barres fixes.
- Le calendrier est utilisable en agenda sur telephone.
- Mue, AI Knowledge, les reglages et le compte sont trouvables depuis
  `Plus`.

### Conformite App Store

- L'application native ne contient ni prix, ni achat, ni lien d'upgrade.
- `Sign in with Apple`, suppression de compte, confidentialite et support
  sont accessibles et fonctionnels.
- Une build TestFlight est controlee avec un compte review avant soumission.
- Les notes de review decrivent les capacites natives et les acces de test.

### Qualite visuelle et technique

- Tests cibles sur l'API authentifiee, le cache/sync natif, le shell mobile,
  `Aujourd'hui`, les flux auth modifies et toute logique de classement des
  taches.
- Verification visuelle dans le navigateur aux largeurs petit mobile, grand
  mobile, tablette et bureau pour site public, auth et application.
- Verification sur simulateur/appareil iPhone pour navigation, safe areas,
  clavier, hors-ligne, authentification et rappels locaux.
- Controle qu'aucun texte, menu, dialogue, composeur ou CTA n'est coupe,
  masque ou inaccessible.
- Verification d'accessibilite de base : focus, libelles, contrastes et
  cibles tactiles.

## Hors scope

- Application Android pour la premiere soumission.
- Achat integre Apple, paywall natif ou redirection d'achat depuis l'app.
- Notifications push serveur, widgets iOS ou extensions de partage.
- Fonctionnement hors ligne de l'Inbox et de Mue en V1.
- Creation automatique de taches par Mue sans confirmation utilisateur.
