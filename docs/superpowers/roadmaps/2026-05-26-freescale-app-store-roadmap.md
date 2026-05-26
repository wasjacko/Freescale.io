# Freescale - Roadmap App Store iPhone

## But

Publier une application iPhone Freescale viable sur l'App Store, centree sur
les taches et utilisable sans Mue, tout en preservant le SaaS web et les
comptes existants.

La V1 iPhone est une application compagnon gratuite : elle reconnait les
droits d'un compte existant, mais ne montre ni prix, ni achat, ni lien
d'upgrade. Le checkout Stripe reste sur le web.

## Point de depart

- Le produit actif est une application Next.js dans `apps/web`, avec les
  principaux comportements sous forme de server actions.
- Le service `apps/api` en Hono/Cloudflare Worker ne sert actuellement que
  des endpoints techniques et le webhook Stripe ; il ne peut pas encore
  alimenter un client iPhone.
- Supabase fournit l'authentification, les workspaces et les donnees.
- Aucun projet Expo/iOS, stockage local mobile ou pipeline TestFlight
  n'existe encore.
- Gmail est deja connecte avec le scope `gmail.modify`, scope Google
  restreint qui requiert un parcours de verification pour une distribution
  publique.

## Definition de la V1 publiable

L'application soumise a Apple doit permettre de :

- se connecter avec Apple ou Google ;
- arriver sur `Aujourd'hui`, creer une tache et la terminer sans canal email
  ni appel Mue ;
- retrouver `Taches`, un agenda mobile, `Inbox`, une conversation et les
  actions Mue explicitement demandees ;
- consulter les taches recentes hors ligne, ajouter/terminer une tache hors
  ligne et synchroniser au retour du reseau ;
- activer un rappel local sur une tache ;
- acceder a `Compte`, confidentialite, support et suppression du compte ;
- fonctionner sans aucune interface d'achat ou d'incitation a souscrire
  depuis l'app iPhone.

## Voies de travail

La livraison comporte cinq voies qui avancent dans cet ordre de dependance :

| Voie | Resultat | Depend de |
| --- | --- | --- |
| Conformite & distribution | Compte Apple, OAuth, politique, TestFlight, dossier review | Decision produit |
| API mobile securisee | Contrats et endpoints consommables par iPhone | Supabase existant |
| Application iPhone | Client Expo natif task-first | API et auth |
| Web mobile | Experience navigateur coherente avec l'app | Design task-first |
| Publication | Verification, screenshots, build et soumission | Toutes les voies P0 |

## Jalons

Les durees ci-dessous sont des ordres de grandeur d'implementation et
n'incluent pas les delais de validation Apple ou Google.

### J0 - Verrous de publication et architecture

**Objectif :** ne pas developper une app qui se ferait bloquer tardivement par
les comptes, les permissions ou le modele commercial.

**Travail :**

- Creer/valider le compte Apple Developer, le Bundle ID Freescale, l'entree
  App Store Connect et la configuration EAS/TestFlight.
- Fixer noir sur blanc la regle iPhone : aucun prix, aucune page billing,
  aucun CTA d'achat externe et aucune mention incitant a s'abonner.
- Configurer le provider Apple dans Supabase et les identifiants OAuth iOS
  Google ; definir les schemes/universal links de retour vers l'app.
- Auditer le statut de verification Google du projet OAuth. Le scope
  `gmail.modify` est `Restricted` ; si Freescale stocke ou transmet ces
  donnees, planifier verification de scope et security assessment.
- Publier/mettre a niveau les pages web de confidentialite, support et
  suppression, qui serviront de references App Store.

**Sortie attendue :**

- Identifiants et environnements de build disponibles.
- Checklist Apple/Google documentee avec proprietaire et statut de chaque
  exigence.
- Decision ferme sur ce qui apparait dans l'app native concernant le plan :
  rien de commercial.

**Estimation :** 1 a 3 jours de travail interne, delais externes separes.

### J1 - API Freescale partagee et authentifiee

**Objectif :** creer un backend mobile stable avant de construire les ecrans
iPhone.

**Travail :**

- Extraire les contrats JSON partages dans `packages/types` : profil,
  workspace actif, tache, resume `Aujourd'hui`, conversation, message,
  evenement agenda et erreurs API.
- Ajouter dans `apps/api` un middleware Bearer Supabase et une resolution de
  workspace qui refuse toute ressource hors du membre connecte.
- Implementer la premiere surface API :
  `GET /v1/me`, `GET /v1/today`, `GET /v1/tasks`,
  `POST /v1/tasks`, `PATCH /v1/tasks/:id/complete` et
  `DELETE /v1/account`.
- Exposer `due_at` et une version/horodatage exploitable par la future file
  de synchronisation mobile ; n'ajouter une migration que si les colonnes
  actuelles ne permettent pas de resoudre les conflits.
- Tester l'authentification, l'isolation workspace, les validations de
  payload, les echecs reseau et la suppression de compte.

**Sortie attendue :**

- Un utilisateur authentifie peut lire son accueil, creer/terminer une tache
  et supprimer son compte par API.
- Une requete non authentifiee ou visant un autre workspace est refusee.
- Les contrats partages sont utilisables par l'app Expo et le web.

**Estimation :** 4 a 7 jours.

### J2 - Application iPhone task-first utilisable

**Objectif :** produire le premier client natif testable sur appareil, utile
sans email et sans Mue.

**Travail :**

- Creer `apps/mobile` avec Expo/React Native, configuration EAS, variables
  d'environnement, scheme de deep link et themes Freescale.
- Implementer l'auth native Apple/Google avec Supabase, en stockant la
  session dans un stockage securise.
- Construire la navigation native : onglets `Aujourd'hui`, `Inbox`,
  `Taches`, `Calendrier`, `Plus`, avec safe areas et etats de session.
- Implementer `Aujourd'hui` : capture rapide, `A faire maintenant`,
  `A organiser ensuite`, completion de tache et etats vides/erreur.
- Ajouter le cache local des taches et une file de mutations optimistes pour
  creation/completion hors ligne, avec statut de synchronisation visible.
- Construire `Plus > Compte` avec confidentialite, support, deconnexion et
  suppression de compte.

**Sortie attendue :**

- Build developpement installee sur iPhone/simulateur.
- Parcours Apple/Google -> `Aujourd'hui` -> creation -> completion
  fonctionnel.
- Mode avion : les taches chargees restent visibles ; une mutation en attente
  se synchronise apres reconnexion.
- Aucun element billing ou upgrade dans l'app.

**Estimation :** 7 a 12 jours.

### J3 - Produit quotidien natif complet

**Objectif :** rendre l'app suffisamment riche pour correspondre a la promesse
Freescale et ne pas ressembler a une simple todo app.

**Travail :**

- Completer l'API et l'app pour la liste `Taches` : filtres, priorites,
  echeances, edition et etats termines.
- Implementer l'agenda mobile chronologique et les operations d'evenements
  necessaires.
- Exposer les conversations et messages par API ; construire la navigation
  `Inbox` -> thread et la reponse lorsque le canal le permet.
- Gerer la connexion/reconnexion Gmail ou Outlook via navigateur systeme et
  deep link, sans bloquer l'usage manuel des taches.
- Exposer Mue par endpoints limites et authentifies : collecte volontaire de
  suggestions de taches, resume ou aide en conversation ; chaque creation de
  tache reste confirmee.
- Exposer le flux utile d'AI Knowledge par API et donner acces a sa
  consultation depuis `Plus`, avec etats vide, chargement et erreur natifs.

**Sortie attendue :**

- Les cinq onglets iPhone sont fonctionnels.
- Une conversation peut etre ouverte et traitee depuis un compte canal valide.
- Mue n'agit que sur demande et ne rend jamais les taches inaccessibles.
- Le compte de demonstration couvre un parcours review clair.

**Estimation :** 8 a 14 jours, hors validation OAuth Google.

### J4 - Web mobile coherent et message produit

**Objectif :** eviter que le site mobile et l'app native racontent deux
produits differents.

**Travail :**

- Transformer l'accueil web connecte en version task-first conforme a la spec
  deja validee : aucune analyse Mue automatique, capture et completion
  directes, fonctionnement sans canal.
- Ajouter le shell web mobile : barre basse, `Plus`, Inbox liste/thread,
  taches tactiles et calendrier agenda.
- Corriger auth web pour les utilisateurs recurrents et finaliser le toast de
  session expiree non bloquant.
- Recentrer landing et pricing sur la collecte/realisation des taches ; Mue
  apparait comme accelerateur.
- Conserver billing et checkout uniquement sur le site.

**Sortie attendue :**

- Le site responsive est utilisable sur mobile et coherent avec les
  screenshots App Store.
- Les parcours d'achat web restent intacts et ne fuient pas dans le client
  iPhone.

**Estimation :** 6 a 10 jours.

### J5 - TestFlight, qualite et soumission

**Objectif :** presenter une application solide, verifiable et conforme a
Apple.

**Travail :**

- Ajouter les rappels locaux avec permission explicite, creation/annulation
  liee a une tache et etat clairement visible.
- Verifier safe areas, clavier, VoiceOver/libelles, Dynamic Type raisonnable,
  contrastes, mode avion et erreurs API sur appareils/simulateurs iPhone.
- Tester l'absence de tout lien/prix/CTA commercial dans le binaire iPhone.
- Preparer icone, screenshots, description App Store, URL support, URL
  confidentialite et declaration de donnees collectees.
- Fournir un compte review et des notes expliquant : usage sans Gmail,
  fonctions hors ligne, login Apple, suppression de compte et modele
  compagnon gratuit.
- Distribuer une beta TestFlight, corriger les retours critiques, puis
  soumettre a la review.

**Sortie attendue :**

- Build TestFlight validee sur le parcours complet.
- Checklist Apple et Google sans bloqueur P0 connu.
- Soumission App Store envoyee avec dossier review reproductible.

**Estimation :** 4 a 8 jours internes, plus delais de review.

## Priorites De Lancement

### P0 - Requis avant soumission

- App native Expo avec auth Apple/Google et session securisee.
- API authentifiee, isolation workspace et suppression de compte.
- `Aujourd'hui` et `Taches` utilisables sans Mue ni Gmail.
- Cache/offline et synchronisation minimale des taches.
- Inbox/thread utilisables avec un compte email autorise.
- Agenda mobile, acces Mue volontaire et compte/support/confidentialite.
- Acces AI Knowledge depuis `Plus`.
- Aucune fonctionnalite de vente dans l'app iPhone.
- TestFlight, compte review et verification des politiques.

### P1 - Apres premiere soumission ou en mise a jour

- Notifications push serveur et digest mobile.
- Widgets iOS et partage vers Freescale.
- Mode hors ligne de l'Inbox.
- Android.
- Achat integre Apple, uniquement si la strategie commerciale change.

## Risques Critiques Et Decisions

| Risque | Impact | Mitigation / decision |
| --- | --- | --- |
| Google `gmail.modify` restreint | La connexion Gmail publique peut etre retardee | Demarrer l'audit OAuth en J0 ; ne pas conditionner `Aujourd'hui` a Gmail |
| Refus Apple pour achat externe | Rejet App Store | Ne montrer aucun prix, CTA ou lien d'achat dans l'app ; citer la regle 3.1.3(f) dans les notes review |
| App percue comme wrapper web | Rejet ou mauvaise retention | Client Expo natif, offline taches, rappels locaux, navigation native |
| Server actions web non reutilisables | Client mobile bloque | Construire l'API Hono et les contrats avant les ecrans natifs |
| Synchronisation hors ligne conflictuelle | Perte ou duplication de taches | Mutations idempotentes/versionnees et tests de reconnexion dans J1/J2 |
| Scope trop vaste avant beta | Sortie repoussee | Geler P0 ; reporter push, widgets, Android et offline inbox |

## Plans D'Implementation A Produire

La roadmap est executee par plans techniques separes, dans cet ordre :

1. `API mobile auth + taches + contrats` : J1 et les pre-requis techniques de
   J0.
2. `Application iPhone auth + Today offline` : J2.
3. `Application iPhone quotidien complet` : J3.
4. `Web mobile task-first` : J4.
5. `App Store readiness et TestFlight` : J5.

Chaque plan commencera par des tests en echec, precisera les fichiers et
commandes, et sera committe/valide avant execution.

## Sources De Conformite

- Apple App Store Review Guidelines, notamment `3.1.3(f)` et les exigences
  de login : <https://developer.apple.com/app-store/review/guidelines/>
- Apple, suppression de compte dans l'app :
  <https://developer.apple.com/support/offering-account-deletion-in-your-app/>
- Google, classification des scopes Gmail dont `gmail.modify` :
  <https://developers.google.com/workspace/gmail/api/auth/scopes>
- Supabase, deep linking mobile :
  <https://supabase.com/docs/guides/auth/native-mobile-deep-linking>
- Supabase, Sign in with Apple :
  <https://supabase.com/docs/guides/auth/auth-apple>
