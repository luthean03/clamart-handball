# Plan 3 — journal d'exécution (décisions et points reportés)

Extrait du registre d'exécution (subagent-driven-development), 15/10/2026. Branche `plan-3-notifications`
(partie de `main` 61f90ff). Tâches 1 à 10 faites et relues ; tâche 11 et étapes nécessitant Firebase reportées.

## Décisions (rulings)
- R1 : Task 6 étapes 4–6 (push, projet Firebase, premier passage réel) reportées après la fusion — le workflow ne tourne que sur `main` — coût si faux : ces étapes viennent un peu plus tard.
- R2 : Task 8 étape 8 (development build) et Task 11 (bout en bout) attendent `app/google-services.json` — le plugin React Native Firebase ne compile pas sans — coût : problèmes de build découverts plus tard.
- R3 : Task 5 étape 6 : rendu de contrôle depuis la fixture avec l'écusson de Levallois injecté (la fixture précède Task 4) — coût : aucun.
- R4 : Task 4 ne commite pas `site/data` ni `collecteur/cache` régénérés localement (le robot commite les données sur `main` : conflits de PR) — coût : `logo_adversaire` apparaît au premier passage après fusion.
- Task 6 : `mkdir -p site/notifs` avant `git add` (le `git add` du plan échouait, code 128, sans dossier) — coût : aucun.
- Task 8 : synchronisations des abonnements mises en file (`planifierSynchro`, état relu au départ de chaque cycle) — le code du plan pouvait laisser un abonnement orphelin après des bascules rapides — coût : un peu de code.
- Task 8 : relecture de l'autorisation Android seulement après le chargement du store (`pret`) — la réhydratation écrasait la valeur relue — coût : aucun.
- Task 9 : bloc « Activer les notifications » dans les Réglages quand l'autorisation est « inconnue » — après « Plus tard » l'autorisation n'était plus jamais demandée — coût : un bloc de plus.
- Task 10 : pas de garde sur une notification initiale pendant le tout premier lancement — aucun sujet n'est abonné avant l'accueil — coût : une session sans écran d'accueil.
- Task 10 : bouton « Voir » du bandeau à 48 dp (`CONTENU_BOUTON`) — la contrainte globale l'emporte sur le code du plan — coût : aucun.
- Revue finale : `mkdir -p collecteur/etat` avant `git add` (chaque passage échouait sans secret) ; étape images non bloquante (`continue-on-error`, spec §4.4) ; checkout de la tête de branche et `git pull --rebase` avant les push ; corps de la réponse FCM gardé dans l'erreur ; rafraîchissement des données à la réception d'une notification (spec §5.5) et `Cache-Control: no-cache` sur `club.json` ; bandeau titre + corps ; spec §4.3 et README mis à jour.

## À faire au premier development build (avant toute diffusion)
- Petite icône de notification : sans icône monochrome, Android affiche un carré blanc. Le plugin messaging exige un drawable existant (expo-notifications ou plugin de config).
- Vérifier que le manifeste fusionné déclare `POST_NOTIFICATIONS` (sinon rien n'arrive sur Android 13+).
- Vérifier sur appareil que « Voir » affiche le score frais, la position du bandeau au-dessus des onglets, l'avertissement éventuel « no background message handler ».
- Plan 4 : `google-services.json` pour un build EAS (variable de fichier EAS + `app.config`).

## Points mineurs reportés
- T1 : garde de longueur sur `CAS["noms"]` ; `\d`/`\s` Unicode en Python contre ASCII en JS.
- T2 : tri sur la chaîne ISO brute (décalages +01/+02) ; tests manquants (ordre résultats/rappels, rappel sans salle, rappel déjà envoyé, limite des 60 jours) ; horodatage corrompu → exception (désormais non bloquante pour la publication) ; `Message` non hachable.
- T3 : `--test ""` ; tous les envois en échec → code 0 ; pas de délai explicite au rafraîchissement du jeton ; pas de test `main` « registre existant → envoi et mise à jour ».
- T4 : nom de fichier d'écusson sans extension non testé.
- T5 : cache d'écusson corrompu et « déjà au registre → pas d'image » non testés ; `avec_images` sans garde de type ; segment d'URL vide ; écusson non carré étiré.
- T6 : `continue-on-error` masque une erreur de code dans l'étape d'envoi.
- T7 : le test de migration ne détecte pas l'absence des valeurs par défaut.
- T8 : `convertir`, la porte Android 13 et la table de relecture non testés ; iOS renvoie « accordee » sans demande ; Android ≤ 12 : notifications coupées dans les réglages système non détectées (`hasPermission`).
- T9 : ligne + interrupteur = deux arrêts pour un lecteur d'écran ; double appui sur « Activer » ; interrupteurs non grisés quand bloqué ; tests manquants (appui sur la ligne, `autorisation.tsx`, branche `bienvenue`).
- T10 : tests manquants (derby dans VueMatch, lien invalide, nettoyage, paramètres tableau) ; navigation au démarrage à froid avant que le routeur soit prêt avalée sans trace ; notification touchée sur la fiche déjà ouverte → écran en double.
