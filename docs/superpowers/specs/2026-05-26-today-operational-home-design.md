# Freescale - Accueil operationnel Aujourd'hui

## Intention

Freescale aide un independant a transformer une inbox chargee en actions. La premiere vue apres connexion doit donc repondre immediatement a une question : **que dois-je faire maintenant ?**

Un dashboard de metriques ne resout pas ce besoin. L'accueil devient une vue `Aujourd'hui`, pilotee par Mue mais controlee par l'utilisateur.

## Experience retenue

- `Aujourd'hui` est la destination d'arrivee et le premier item de navigation.
- Un en-tete sobre presente le nombre d'actions detectees et une phrase de brief Mue.
- La zone principale liste au maximum quelques conversations actionnables, avec leur raison et leur priorite.
- Chaque priorite propose deux sorties concretes : ouvrir la conversation ou creer une tache.
- Un rail compact permet de voir l'etat de travail (non lus, taches ouvertes, conversations) et de rejoindre l'inbox ou les taches.
- L'inbox reste la vue de controle detaillee, pas l'accueil.

## Reductions de friction

- L'encart d'introduction Mue dans l'inbox disparait pour les utilisateurs deja actifs.
- La banniere d'essai ne s'affiche que lorsqu'une decision devient necessaire : essai expire ou trois jours restants.
- Les emails automatises evidents (alertes emploi, promotions de remise) ne doivent plus polluer la categorie `Clients`.

## Hors scope

- Pas de page analytique a base de KPI.
- Pas de modification de facturation ou de quota Mue.
- Pas de reclassement retroactif automatique des conversations deja categorisees manuellement.

## Criteres d'acceptation

- Un utilisateur connecte arrive sur `Aujourd'hui`.
- Il peut ouvrir la conversation source ou creer une tache depuis une recommandation.
- La navigation permet toujours d'acceder a l'inbox, aux taches, au calendrier et a AI Knowledge.
- Les alertes emploi recorrentes sont classees en notifications et une remise retail evidente en promotion.
- L'ecran est lisible, sans bandeau commercial non urgent et sans ancien panneau de bienvenue duplique.
