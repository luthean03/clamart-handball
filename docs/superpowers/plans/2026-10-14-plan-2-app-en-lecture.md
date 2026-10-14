# Plan 2 — App en lecture (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire l'app Android Expo du Clamart Handball, sans notifications : Accueil, Matchs, Équipes, fiche équipe, fiche match, Buteurs, premier lancement, Réglages, hors ligne, thème clair/sombre. Les notifications, leur demande d'autorisation et leurs réglages arrivent au Plan 3 ; le lien vers la politique de confidentialité au Plan 4.

**Architecture:** App Expo (TypeScript, expo-router, fichiers sous `app/src/app/`). Les données viennent d'un seul fichier `club.json` (Plan 1), téléchargé et mis en cache par TanStack Query (persisté dans AsyncStorage). Toute la logique est faite de fonctions pures dans `src/donnees/` (dates, sélecteurs, résumé de carte) et `src/donnees/phrase.ts` ; les écrans sont des composants « Vue » qui reçoivent données et callbacks en props (testés avec React Native Testing Library) ; les fichiers de route sont de fines couches qui branchent le routeur, le cache et le stockage local (zustand). Interface en react-native-paper (Material 3) aux couleurs du club.

**Tech Stack:** Expo (dernier SDK stable via `create-expo-app@latest`), React Native, TypeScript, expo-router, react-native-paper 5, @tanstack/react-query 5 (+ persist-client, async-storage-persister), zustand 5, @react-native-async-storage/async-storage, expo-calendar, expo-web-browser, expo-clipboard, @expo-google-fonts/nunito, jest-expo, @testing-library/react-native.

**Spec:** [docs/superpowers/specs/2026-10-14-clamart-handball-app-design.md](../specs/2026-10-14-clamart-handball-app-design.md) (§5, §6, §7, §8 étape 2). Contrat de direction visuelle : [.impeccable/surfaces/app-src-app-tabs-index-tsx.md](../../../.impeccable/surfaces/app-src-app-tabs-index-tsx.md). Maquettes de référence : `.impeccable/mocks/decision/challenger-warm.html` (Accueil) et `canon.html` (Matchs).

**Prérequis :** Plan 1 terminé — `partage/fixtures/club-2026-10-13.json` existe et `URL_DONNEES` (`https://<compte>.github.io/clamart-handball/data/club.json`) répond avec `version_schema: 2`.

## Global Constraints

- Interface et textes en français uniquement.
- Couleurs : uniquement via le thème (`useThemeClub()`) ; aucune valeur hexadécimale en dehors de `src/theme/couleurs.ts`. Rouge `#DB0000` (clair) / `#FF6B5E` (sombre) réservé à l'actionnable (bouton plein, onglet actif, cloche suivie).
- Contrastes AA : texte ≥ 4,5:1, composant d'action ≥ 3:1, en clair et en sombre (test automatique, Task 6).
- Police Nunito ; jamais `allowFontScaling={false}` ; aucune hauteur de texte figée ; noms longs sur 2 lignes maximum puis ellipse.
- Cibles tactiles ≥ 48 dp (composants Paper par défaut ; pas de zone cliquable plus petite).
- Le résultat n'est jamais porté par la seule couleur : V/N/D écrits, libellés lecteur d'écran (« Clamart Seniors F 1 32, Ent. Suresnes / Nanterre 22, victoire »).
- Mineurs jamais nommés : buteurs affichés seulement si `equipe.stats_joueurs === true`.
- Phrases de résultat jamais dévalorisantes (pas d'adjectif sur une défaite).
- L'heure de mise à jour des données est toujours visible sur l'Accueil ; jamais de « direct ».
- Les dates de match FFHB sont en heure de Paris avec décalage (`2026-10-11T16:15:00+02:00`) : jour et heure affichés = partie locale du texte. « Maintenant » = heure de l'appareil (public en France).
- Plan 2 doit tourner dans **Expo Go** (aucun module natif hors SDK Expo). Firebase arrive au Plan 3.
- Identifiant Android `fr.clamarthandball.app`, schéma `clamart://`.
- Logo : `assets/logo-clamart.png` tel quel, jamais redessiné ni déformé.

## Review Focus

1. **Wi-fi à portail captif** (la requête renvoie une page HTML en 200) : traité comme une erreur réseau, les données en cache restent affichées avec le bandeau hors ligne. Test : `refuse une réponse illisible (portail wi-fi)` (Task 2).
2. **Équipe suivie qui disparaît des données** (fin de saison, renommage dans `config.json`) : elle est retirée des suivis, signalée dans Réglages, et l'Accueil ne plante pas. Tests : `retirerInconnus` (Task 7) et `ignore une équipe suivie absente des données` (Task 11).
3. **Noms d'adversaires très longs + police système agrandie** (« ASSOCIATION SPORTIVE ST-CYR/FONTENAY HANDBALL 78 ») : 2 lignes maximum, le score reste visible. Test : `limite un nom long à deux lignes` (Task 9) + vérification émulateur à 1,3× (Task 16).
4. **Lien vers un match qui n'existe plus** (ancien lien, match retiré) : « Match introuvable » et bouton retour, pas d'écran blanc. Test : `match introuvable` (Task 14).
5. **Hors saison : aucun match daté** : l'onglet Matchs affiche « Aucun match programmé pour le moment. » au lieu d'une liste vide. Test : `aucun match daté` (Task 12).

---

## File Structure

```
app/
  app.json                      config Expo (nom, package, schéma, icône, extra.urlDonnees)
  package.json                  scripts test/typecheck, config jest
  tsconfig.json
  assets/logo-clamart.png       copie de ../assets/logo-clamart.png
  test/
    globalSetup.js              TZ=Europe/Paris pour des tests déterministes
    setup.ts                    mocks (AsyncStorage, safe-area, expo-router, expo-*)
    donnees.ts                  fixture typée + instants de référence
    rendu.tsx                   render() avec SafeArea + Paper
  src/
    config.ts                   URL des données, version de schéma supportée, URL Play Store
    donnees/
      types.ts                  types du contrat club.json v2
      source.ts                 chargerClub() : fetch + validation
      dates.ts                  jours, heures, week-end de référence, libellés
      selecteurs.ts             fonctions pures sur Club
      phrase.ts                 nomLisible, phraseResultat, scoreTexte, ordinal
      resume.ts                 resumeCarte() : que montrer sur la carte d'une équipe
      requetes.ts               QueryClient, persistance, useClub()
      maintenant.ts             useMaintenant()
    suivi/suivi.ts              store zustand persistant (équipes suivies, premier lancement)
    theme/
      couleurs.ts               palettes clair/sombre (seul fichier avec des hex)
      contraste.ts              ratio de contraste WCAG
      theme.ts                  thèmes Paper MD3 + useThemeClub()
    actions/actions.ts          agenda, itinéraire, liens, presse-papiers
    composants/
      PastilleResultat.tsx      pastille V/N/D + Forme
      LigneMatch.tsx            ligne de match façon app de scores
      EnTeteSection.tsx
      BandeauEtat.tsx           hors ligne / données anciennes
      EtatSansDonnees.tsx       chargement / erreur sans cache
      CarteEquipe.tsx           carte « Mes équipes » de l'Accueil
      BarreOnglets.tsx          barre de navigation Material 3
    ecrans/
      VueAccueil.tsx  VueMatchs.tsx  VueEquipes.tsx  VueEquipe.tsx
      VueMatch.tsx    VueButeurs.tsx VueReglages.tsx VueBienvenue.tsx
    app/                        routes expo-router (fines)
      _layout.tsx               fournisseurs : polices, cache, thème
      bienvenue.tsx  reglages.tsx
      (tabs)/_layout.tsx  (tabs)/index.tsx  (tabs)/matchs.tsx  (tabs)/equipes.tsx  (tabs)/buteurs.tsx
      equipe/[collectif].tsx    match/[id].tsx
partage/phrases-cas.json        cas de test des phrases, partagés avec le notifieur (Plan 3)
```

Les tests sont à côté du code (`x.test.ts(x)`).

---

### Task 1: Environnement Android, squelette Expo et Jest

**Files:**
- Create: `app/` (via create-expo-app), `app/test/globalSetup.js`, `app/test/setup.ts`, `app/test/donnees.ts`, `app/test/sanite.test.ts`, `app/assets/logo-clamart.png`
- Modify: `app/package.json`, `app/app.json`, `app/tsconfig.json`
- Delete: `app/App.tsx`, `app/index.ts`

**Interfaces:**
- Consumes: `partage/fixtures/club-2026-10-13.json` (Plan 1), `URL_DONNEES` (Plan 1, Task 3).
- Produces: `test/donnees.ts` exporte `club: Club` (ajouté en Task 2, voir Step 9), `DIM_SOIR`, `MAR_SOIR`, `MER_MIDI` (`Date`) ; commandes `npm test`, `npm run typecheck`.

- [ ] **Step 1: Installer Android Studio (action de l'utilisateur, guidée)**

Sur la machine il n'y a ni SDK Android, ni émulateur, ni JDK récent (seulement Java 8). Guider l'utilisateur :
1. Télécharger et installer **Android Studio** (developer.android.com/studio) — il fournit le SDK, l'émulateur et un JDK 17+.
2. Premier lancement : *Standard setup*, accepter les licences du SDK (c'est l'utilisateur qui accepte).
3. *Device Manager → Create device → Pixel 8 → API 35 (Google Play) → Finish*.
4. Variables d'environnement Windows (utilisateur) : `ANDROID_HOME = %LOCALAPPDATA%\Android\Sdk` ; ajouter `%ANDROID_HOME%\platform-tools` et `%ANDROID_HOME%\emulator` au `Path`. Ouvrir un nouveau terminal.

Vérifier :

```bash
adb version
emulator -list-avds
```

Expected: une version d'adb et `Pixel_8_API_35` (ou nom équivalent).

- [ ] **Step 2: Créer le projet Expo**

```bash
cd /e/MobileApp
npx create-expo-app@latest app --template blank-typescript
cd app
rm -f App.tsx index.ts
mkdir -p assets && cp ../assets/logo-clamart.png assets/logo-clamart.png
```

- [ ] **Step 3: Installer les dépendances**

`npx expo install` choisit les versions compatibles avec le SDK du projet : ne pas fixer de version à la main.

```bash
cd /e/MobileApp/app
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar expo-font expo-splash-screen @expo-google-fonts/nunito react-native-paper @react-native-async-storage/async-storage expo-calendar expo-web-browser expo-clipboard
npm install @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-async-storage-persister zustand
npx expo install jest-expo jest @types/jest -- --save-dev
npm install --save-dev @testing-library/react-native
```

Expected: aucune erreur `ERESOLVE`. En cas de conflit de peer dependency signalé par npm, relancer la commande concernée avec `npx expo install --fix`.

- [ ] **Step 4: Configurer `package.json`**

Dans `app/package.json` : mettre `"main": "expo-router/entry"`, ajouter aux `scripts` :

```json
    "test": "jest",
    "typecheck": "tsc --noEmit"
```

et ajouter la clé racine :

```json
  "jest": {
    "preset": "jest-expo",
    "globalSetup": "./test/globalSetup.js",
    "setupFilesAfterEnv": ["./test/setup.ts"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-paper|react-native-vector-icons|@tanstack/.*)"
    ]
  }
```

- [ ] **Step 5: Configurer `app.json`**

Garder les clés générées par le modèle (dont `newArchEnabled` s'il existe) et fixer/ajouter celles-ci dans `"expo"`. Remplacer `<compte>` par le compte GitHub noté au Plan 1, Task 3 :

```json
    "name": "Clamart Handball",
    "slug": "clamart-handball",
    "scheme": "clamart",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/logo-clamart.png",
    "userInterfaceStyle": "automatic",
    "android": {
      "package": "fr.clamarthandball.app",
      "edgeToEdgeEnabled": true,
      "adaptiveIcon": { "foregroundImage": "./assets/logo-clamart.png", "backgroundColor": "#DB0000" },
      "blockedPermissions": ["android.permission.READ_CALENDAR", "android.permission.WRITE_CALENDAR"]
    },
    "plugins": [
      "expo-router",
      "expo-font",
      ["expo-splash-screen", { "image": "./assets/logo-clamart.png", "imageWidth": 160, "backgroundColor": "#DB0000" }]
    ],
    "extra": { "urlDonnees": "https://<compte>.github.io/clamart-handball/data/club.json" }
```

Supprimer les entrées `splash`/`icon` du modèle qui pointent vers des images d'exemple supprimées. Ne pas activer `experiments.typedRoutes` : des routes ciblées par des boutons n'existent qu'à partir des Tasks 13–15 et `tsc` échouerait entre-temps. Les permissions d'agenda sont bloquées : on passe par l'écran système d'ajout d'événement (`createEventInCalendarAsync`), qui n'en a pas besoin.

- [ ] **Step 6: Configurer TypeScript**

`app/tsconfig.json` :

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "resolveJsonModule": true
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 7: Fichiers de test communs**

`app/test/globalSetup.js` :

```js
// Fuseau fixe : les tests de dates donnent le même résultat sur toutes les machines.
module.exports = async () => {
  process.env.TZ = 'Europe/Paris';
};
```

`app/test/setup.ts` :

```ts
import '@testing-library/react-native/extend-expect';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => {
  const routeur = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
  const Vide = () => null;
  return {
    __routeur: routeur,
    useRouter: () => routeur,
    useLocalSearchParams: jest.fn(() => ({})),
    Redirect: Vide,
    Stack: Object.assign(Vide, { Screen: Vide }),
    Tabs: Object.assign(Vide, { Screen: Vide }),
  };
});
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'opened' })) }));
jest.mock('expo-calendar', () => ({ createEventInCalendarAsync: jest.fn(() => Promise.resolve({ action: 'saved' })) }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
```

`app/test/donnees.ts` (version provisoire, complétée en Task 2) :

```ts
import fixture from '../../partage/fixtures/club-2026-10-13.json';

export const fixtureBrute = fixture;
/** Dimanche 11 oct. 2026, 22 h 41 : le soir des matchs. */
export const DIM_SOIR = new Date('2026-10-11T22:41:00+02:00');
/** Mardi 13 oct. 2026, 19 h 05 : après la dernière collecte (16 h 41). */
export const MAR_SOIR = new Date('2026-10-13T19:05:00+02:00');
/** Mercredi 14 oct. 2026, midi : on regarde le week-end suivant. */
export const MER_MIDI = new Date('2026-10-14T12:00:00+02:00');
```

`app/test/sanite.test.ts` :

```ts
import { fixtureBrute } from './donnees';

test('la fixture partagée est au format v2', () => {
  expect(fixtureBrute.version_schema).toBe(2);
  expect(fixtureBrute.collectifs).toHaveLength(11);
});

test('les tests tournent en heure de Paris', () => {
  expect(new Date('2026-10-13T14:41:53Z').getHours()).toBe(16);
});
```

- [ ] **Step 8: Lancer les tests**

Run: `cd /e/MobileApp/app && npm test`
Expected: 2 PASS.

- [ ] **Step 9: Commit**

```bash
cd /e/MobileApp
git add app
git commit -m "App : squelette Expo, expo-router, Jest

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Types du contrat et chargement des données

**Files:**
- Create: `app/src/donnees/types.ts`, `app/src/config.ts`, `app/src/donnees/source.ts`, `app/src/donnees/source.test.ts`
- Modify: `app/test/donnees.ts`

**Interfaces:**
- Consumes: fixture (Task 1).
- Produces:
  - Types `Resultat`, `Salle`, `Buteur`, `Match`, `LigneClassement`, `Bilan`, `Equipe`, `Collectif`, `ButeurClub`, `Club`, `MatchAvecEquipe` (= `Match & { equipe: Equipe }`).
  - `config.ts` : `URL_DONNEES: string`, `URL_AGENDAS: string` (se termine par `agenda/`), `VERSION_SCHEMA_MIN = 2`, `VERSION_SCHEMA_MAX = 2`, `URL_PLAY_STORE: string`.
  - `chargerClub(url: string, chercher?: typeof fetch): Promise<Club>` — rejette une `Error` de `name` `'ErreurReseau'` (pas de réseau, HTTP ≠ 2xx, JSON illisible) ou `'SchemaInconnu'` (`version_schema` absent, < MIN ou > MAX).
  - `test/donnees.ts` exporte aussi `club: Club`.

- [ ] **Step 1: Écrire les types**

`app/src/donnees/types.ts` :

```ts
/** Contrat de club.json, version_schema 2 (produit par collecteur/collecte.py). */
export type Resultat = 'V' | 'N' | 'D';

export interface Salle {
  nom: string | null;
  adresse: string | null;
}

export interface Buteur {
  joueur: string;
  numero: number | null;
  buts: number;
}

export interface Match {
  id: string;
  /** ISO avec décalage de Paris, ou null si pas encore programmé. */
  date: string | null;
  journee: number | null;
  domicile: boolean;
  adversaire: string;
  score_nous: number | null;
  score_eux: number | null;
  mt_nous: number | null;
  mt_eux: number | null;
  resultat: Resultat | null;
  url_ffhb: string;
  feuille_de_match: string | null;
  salle?: Salle | null;
  /** Seniors uniquement. */
  buteurs?: Buteur[];
}

export interface LigneClassement {
  place: number | null;
  equipe: string;
  points: number | null;
  joues: number | null;
  gagnes: number | null;
  nuls: number | null;
  perdus: number | null;
  bp: number | null;
  bc: number | null;
  diff: number | null;
  nous: boolean;
}

export interface Bilan {
  joues: number;
  victoires: number;
  nuls: number;
  defaites: number;
  bp: number;
  bc: number;
}

export interface Equipe {
  id: string;
  nom: string;
  libelle_ffhb: string;
  competition: string;
  detail: string;
  organisateur: string | null;
  niveau: string;
  categorie: string;
  genre: string;
  phase: string | null;
  poule: string | null;
  url_ffhb: string;
  stats_joueurs: boolean;
  classement: LigneClassement[] | null;
  matchs: Match[];
  bilan: Bilan;
  forme: string;
  place?: number | null;
  nb_equipes?: number;
  collectif: string;
}

export interface Collectif {
  id: string;
  nom: string;
  categorie: string;
  genre: string;
  equipes: string[];
}

export interface ButeurClub {
  joueur: string;
  equipes: string[];
  matchs: number;
  buts: number;
  record: number;
  moyenne: number;
}

export interface Club {
  version_schema: number;
  club: { nom: string; id_ffhb: string };
  saison: string;
  /** ISO UTC de la dernière collecte. */
  mis_a_jour: string;
  source: string;
  collectifs: Collectif[];
  equipes: Equipe[];
  buteurs_club: ButeurClub[];
  erreurs: string[];
}

export type MatchAvecEquipe = Match & { equipe: Equipe };
```

- [ ] **Step 2: Écrire la configuration**

`app/src/config.ts` :

```ts
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as { urlDonnees?: string };

/** club.json publié par le Plan 1 (app.json → extra.urlDonnees). */
export const URL_DONNEES: string = extra.urlDonnees ?? '';
/** Dossier des agendas .ics publiés à côté de club.json. */
export const URL_AGENDAS: string = URL_DONNEES.replace(/club\.json$/, 'agenda/');
export const VERSION_SCHEMA_MIN = 2;
export const VERSION_SCHEMA_MAX = 2;
export const URL_PLAY_STORE = 'market://details?id=fr.clamarthandball.app';
```

- [ ] **Step 3: Compléter `test/donnees.ts`**

Remplacer son contenu par :

```ts
import fixture from '../../partage/fixtures/club-2026-10-13.json';
import type { Club } from '../src/donnees/types';

export const fixtureBrute = fixture;
/** Données réelles du 13/10/2026 (14 équipes, 11 collectifs). */
export const club = fixture as unknown as Club;
/** Dimanche 11 oct. 2026, 22 h 41 : le soir des matchs. */
export const DIM_SOIR = new Date('2026-10-11T22:41:00+02:00');
/** Mardi 13 oct. 2026, 19 h 05 : après la dernière collecte (16 h 41). */
export const MAR_SOIR = new Date('2026-10-13T19:05:00+02:00');
/** Mercredi 14 oct. 2026, midi : on regarde le week-end suivant. */
export const MER_MIDI = new Date('2026-10-14T12:00:00+02:00');
```

- [ ] **Step 4: Écrire les tests du chargement**

`app/src/donnees/source.test.ts` :

```ts
import { fixtureBrute } from '../../test/donnees';
import { chargerClub } from './source';

function reponse(corps: unknown, ok = true, status = 200): typeof fetch {
  return jest.fn(() =>
    Promise.resolve({ ok, status, json: () => Promise.resolve(corps) } as unknown as Response),
  ) as unknown as typeof fetch;
}

test('renvoie le club au format v2', async () => {
  const club = await chargerClub('https://exemple/club.json', reponse(fixtureBrute));
  expect(club.collectifs).toHaveLength(11);
});

test('refuse un schéma plus récent que l’app', async () => {
  await expect(chargerClub('u', reponse({ ...fixtureBrute, version_schema: 3 }))).rejects.toMatchObject({
    name: 'SchemaInconnu',
  });
});

test('refuse un fichier v1 sans version', async () => {
  const { version_schema: _v, ...v1 } = fixtureBrute;
  await expect(chargerClub('u', reponse(v1))).rejects.toMatchObject({ name: 'SchemaInconnu' });
});

test('erreur réseau', async () => {
  const sansReseau = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as unknown as typeof fetch;
  await expect(chargerClub('u', sansReseau)).rejects.toMatchObject({ name: 'ErreurReseau' });
});

test('HTTP 404', async () => {
  await expect(chargerClub('u', reponse({}, false, 404))).rejects.toMatchObject({
    name: 'ErreurReseau',
    message: 'Réponse 404',
  });
});

test('refuse une réponse illisible (portail wi-fi)', async () => {
  const html = jest.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError('Unexpected token <')) }),
  ) as unknown as typeof fetch;
  await expect(chargerClub('u', html)).rejects.toMatchObject({ name: 'ErreurReseau' });
});
```

- [ ] **Step 5: Lancer pour vérifier l'échec**

Run: `npm test -- src/donnees/source.test.ts`
Expected: FAIL, `Cannot find module './source'`

- [ ] **Step 6: Implémenter `app/src/donnees/source.ts`**

```ts
import { VERSION_SCHEMA_MAX, VERSION_SCHEMA_MIN } from '../config';
import type { Club } from './types';

function erreur(name: 'ErreurReseau' | 'SchemaInconnu', message: string): Error {
  const e = new Error(message);
  e.name = name;
  return e;
}

/** Télécharge et valide club.json. Les erreurs sont reconnaissables à leur `name`. */
export async function chargerClub(url: string, chercher: typeof fetch = fetch): Promise<Club> {
  let reponse: Response;
  try {
    reponse = await chercher(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw erreur('ErreurReseau', 'Pas de connexion');
  }
  if (!reponse.ok) throw erreur('ErreurReseau', `Réponse ${reponse.status}`);
  let club: Club;
  try {
    club = (await reponse.json()) as Club;
  } catch {
    throw erreur('ErreurReseau', 'Réponse illisible');
  }
  const version = typeof club?.version_schema === 'number' ? club.version_schema : 1;
  if (version < VERSION_SCHEMA_MIN || version > VERSION_SCHEMA_MAX) {
    throw erreur('SchemaInconnu', `Format de données ${version} non pris en charge`);
  }
  return club;
}
```

- [ ] **Step 7: Lancer les tests et le contrôle de types**

Run: `npm test -- src/donnees/source.test.ts && npm run typecheck`
Expected: 6 PASS ; `tsc` sans erreur.

- [ ] **Step 8: Commit**

```bash
git add app/src app/test
git commit -m "App : types du contrat v2 et chargement de club.json

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Dates et week-end de référence

**Files:**
- Create: `app/src/donnees/dates.ts`, `app/src/donnees/dates.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `jourDuMatch(iso: string): string` (`'2026-10-11'`), `heureDuMatch(iso: string): string` (`'16:15'`)
  - `jourLocal(date: Date): string`, `decalerJour(jour: string, n: number): string`, `jourDeSemaine(jour: string): number` (0 = dimanche)
  - `interface Weekend { vendredi: string; samedi: string; dimanche: string }`, `weekendDeReference(aujourdhui: string): Weekend`
  - `libelleJour(jour: string, format?: 'court' | 'long'): string` (`'sam. 10 oct.'` / `'samedi 10 oct.'`)
  - `libelleWeekend(w: Weekend): string` (`'10–11 oct.'`)
  - `libelleMiseAJour(iso: string, maintenant: Date): string`, `donneesAnciennes(iso: string, maintenant: Date): boolean`, `salutation(maintenant: Date): string`

- [ ] **Step 1: Écrire les tests**

`app/src/donnees/dates.test.ts` :

```ts
import {
  decalerJour, donneesAnciennes, heureDuMatch, jourDuMatch, jourLocal, libelleJour, libelleMiseAJour,
  libelleWeekend, salutation, weekendDeReference,
} from './dates';

const W_10_11 = { vendredi: '2026-10-09', samedi: '2026-10-10', dimanche: '2026-10-11' };

test('jour et heure lus dans le texte FFHB (heure de Paris)', () => {
  expect(jourDuMatch('2026-10-11T16:15:00+02:00')).toBe('2026-10-11');
  expect(heureDuMatch('2026-10-11T16:15:00+02:00')).toBe('16:15');
});

test('jourLocal et decalerJour', () => {
  expect(jourLocal(new Date('2026-10-11T23:30:00+02:00'))).toBe('2026-10-11');
  expect(decalerJour('2026-10-31', 1)).toBe('2026-11-01');
  expect(decalerJour('2026-10-01', -1)).toBe('2026-09-30');
});

test('week-end de référence : lundi et mardi regardent le week-end passé', () => {
  expect(weekendDeReference('2026-10-12')).toEqual(W_10_11); // lundi
  expect(weekendDeReference('2026-10-13')).toEqual(W_10_11); // mardi
});

test('week-end de référence : du mercredi au dimanche, celui de la semaine', () => {
  expect(weekendDeReference('2026-10-14').samedi).toBe('2026-10-17'); // mercredi
  expect(weekendDeReference('2026-10-16').samedi).toBe('2026-10-17'); // vendredi
  expect(weekendDeReference('2026-10-10')).toEqual(W_10_11); // samedi
  expect(weekendDeReference('2026-10-11')).toEqual(W_10_11); // dimanche
});

test('libellés de jours et de week-end', () => {
  expect(libelleJour('2026-10-10')).toBe('sam. 10 oct.');
  expect(libelleJour('2026-10-11', 'long')).toBe('dimanche 11 oct.');
  expect(libelleWeekend(W_10_11)).toBe('10–11 oct.');
  expect(libelleWeekend(weekendDeReference('2026-10-29'))).toBe('31 oct.–1 nov.');
});

test('libellé de mise à jour', () => {
  const iso = '2026-10-13T14:41:53+00:00'; // 16 h 41 à Paris
  expect(libelleMiseAJour(iso, new Date('2026-10-13T19:05:00+02:00'))).toBe('mis à jour à 16:41');
  expect(libelleMiseAJour(iso, new Date('2026-10-14T08:00:00+02:00'))).toBe('mis à jour mar. 13 oct. à 16:41');
});

test('données anciennes au-delà de 36 h', () => {
  const iso = '2026-10-13T14:41:53+00:00';
  expect(donneesAnciennes(iso, new Date('2026-10-14T20:00:00+02:00'))).toBe(false);
  expect(donneesAnciennes(iso, new Date('2026-10-15T08:00:00+02:00'))).toBe(true);
});

test('salutation selon l’heure', () => {
  expect(salutation(new Date('2026-10-13T17:59:00+02:00'))).toBe('Bonjour !');
  expect(salutation(new Date('2026-10-13T18:00:00+02:00'))).toBe('Bonsoir !');
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- src/donnees/dates.test.ts`
Expected: FAIL, `Cannot find module './dates'`

- [ ] **Step 3: Implémenter `app/src/donnees/dates.ts`**

```ts
const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const JOURS_LONGS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const deux = (n: number) => String(n).padStart(2, '0');

/** Les dates FFHB portent le décalage de Paris : la partie locale du texte est l'heure à afficher. */
export const jourDuMatch = (iso: string): string => iso.slice(0, 10);
export const heureDuMatch = (iso: string): string => iso.slice(11, 16);

const minuitUTC = (jour: string) => new Date(`${jour}T00:00:00Z`);
export const jourDeSemaine = (jour: string): number => minuitUTC(jour).getUTCDay();

export function decalerJour(jour: string, n: number): string {
  const d = minuitUTC(jour);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 'AAAA-MM-JJ' de l'instant, à l'heure de l'appareil. */
export function jourLocal(date: Date): string {
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}`;
}

export interface Weekend {
  vendredi: string;
  samedi: string;
  dimanche: string;
}

/** Lundi et mardi : le week-end qui vient de se jouer. Du mercredi au dimanche : celui de la semaine. */
export function weekendDeReference(aujourdhui: string): Weekend {
  const js = jourDeSemaine(aujourdhui);
  const versSamedi = js === 0 ? -1 : js <= 2 ? -(js + 1) : 6 - js;
  const samedi = decalerJour(aujourdhui, versSamedi);
  return { vendredi: decalerJour(samedi, -1), samedi, dimanche: decalerJour(samedi, 1) };
}

export function libelleJour(jour: string, format: 'court' | 'long' = 'court'): string {
  const d = minuitUTC(jour);
  const nom = (format === 'long' ? JOURS_LONGS : JOURS_COURTS)[d.getUTCDay()];
  return `${nom} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
}

export function libelleWeekend(w: Weekend): string {
  const s = minuitUTC(w.samedi);
  const d = minuitUTC(w.dimanche);
  return s.getUTCMonth() === d.getUTCMonth()
    ? `${s.getUTCDate()}–${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`
    : `${s.getUTCDate()} ${MOIS[s.getUTCMonth()]}–${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
}

export function libelleMiseAJour(iso: string, maintenant: Date): string {
  const d = new Date(iso);
  const heure = `${deux(d.getHours())}:${deux(d.getMinutes())}`;
  return jourLocal(d) === jourLocal(maintenant)
    ? `mis à jour à ${heure}`
    : `mis à jour ${libelleJour(jourLocal(d))} à ${heure}`;
}

const TRENTE_SIX_HEURES = 36 * 60 * 60 * 1000;
export function donneesAnciennes(iso: string, maintenant: Date): boolean {
  return maintenant.getTime() - Date.parse(iso) > TRENTE_SIX_HEURES;
}

export function salutation(maintenant: Date): string {
  return maintenant.getHours() >= 18 ? 'Bonsoir !' : 'Bonjour !';
}
```

- [ ] **Step 4: Lancer les tests**

Run: `npm test -- src/donnees/dates.test.ts`
Expected: 8 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/donnees/dates.ts app/src/donnees/dates.test.ts
git commit -m "App : dates, week-end de référence et libellés

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Sélecteurs

**Files:**
- Create: `app/src/donnees/selecteurs.ts`, `app/src/donnees/selecteurs.test.ts`

**Interfaces:**
- Consumes: types (Task 2), `jourDuMatch`, `Weekend` (Task 3), `club`, `DIM_SOIR`, `MAR_SOIR` (test/donnees).
- Produces (toutes pures, ordre chronologique, matchs sans date en dernier) :
  - `equipesDuCollectif(club, id): Equipe[]`, `equipePrincipale(club, id): Equipe | undefined` (première équipe avec classement, sinon la première)
  - `tousLesMatchs(club): MatchAvecEquipe[]`, `matchsDuCollectif(club, id)`, `matchsDuJour(club, jour)`, `matchsDuWeekend(club, w)`, `matchParId(club, id): MatchAvecEquipe | undefined`
  - `joursAvecMatchs(club): string[]`, `jourParDefaut(jours, aujourdhui): string | undefined`
  - `prochainMatch(club, id, maintenant): MatchAvecEquipe | undefined`, `dernierResultat(club, id)`
  - `scoreEnAttente(m: Match, maintenant: Date): boolean`
  - `serieEnCours(matchs: Match[]): { resultat: Resultat; longueur: number } | undefined`, `formeRecente(matchs: Match[], n = 5): Resultat[]`
  - `libelleCategorie(c: string): string`, `rangCategorie(c: string): number`
  - `collectifsParCategorie(club): { categorie: string; titre: string; collectifs: Collectif[] }[]`
  - `grouperParCategorie(matchs: MatchAvecEquipe[]): { categorie: string; titre: string; matchs: MatchAvecEquipe[] }[]`
  - `interface ButeurEquipe { joueur: string; buts: number; matchs: number }`, `buteursDuCollectif(club, id): ButeurEquipe[]`

- [ ] **Step 1: Écrire les tests (valeurs réelles du 13/10/2026)**

`app/src/donnees/selecteurs.test.ts` :

```ts
import { club, DIM_SOIR, MAR_SOIR } from '../../test/donnees';
import { weekendDeReference } from './dates';
import {
  buteursDuCollectif, collectifsParCategorie, dernierResultat, equipePrincipale, equipesDuCollectif,
  grouperParCategorie, jourParDefaut, joursAvecMatchs, matchParId, matchsDuCollectif, matchsDuJour,
  matchsDuWeekend, prochainMatch, scoreEnAttente, serieEnCours,
} from './selecteurs';

const W_10_11 = weekendDeReference('2026-10-13');

test('un collectif regroupe ses compétitions', () => {
  expect(equipesDuCollectif(club, 'seniors-m').map((e) => e.id)).toEqual([
    '32546-clamart-handball', '33403-clamart-handball', '33244-clamart-handball',
  ]);
  expect(equipePrincipale(club, 'seniors-m')?.id).toBe('32546-clamart-handball');
  expect(equipePrincipale(club, 'seniors-f-1')?.place).toBe(3);
});

test('matchs du week-end des 10 et 11 octobre', () => {
  const matchs = matchsDuWeekend(club, W_10_11);
  expect(matchs).toHaveLength(11);
  expect(new Set(matchs.map((m) => m.equipe.collectif)).size).toBe(10);
  const instants = matchs.map((m) => Date.parse(m.date!));
  expect([...instants].sort((a, b) => a - b)).toEqual(instants);
});

test('matchs d’un jour', () => {
  expect(matchsDuJour(club, '2026-10-11')).toHaveLength(4);
  expect(matchsDuJour(club, '2026-10-10')).toHaveLength(7);
});

test('les matchs sans date sont en fin de liste', () => {
  const matchs = matchsDuCollectif(club, 'seniors-f-1');
  expect(matchs[0].date).not.toBeNull();
  expect(matchs[matchs.length - 1].date).toBeNull();
});

test('prochain match et dernier résultat', () => {
  expect(prochainMatch(club, 'seniors-f-1', DIM_SOIR)?.id).toBe('2729291');
  expect(prochainMatch(club, 'seniors-m', DIM_SOIR)?.id).toBe('2734038');
  expect(prochainMatch(club, 'u18-m', DIM_SOIR)).toBeUndefined();
  expect(dernierResultat(club, 'seniors-f-1')?.id).toBe('2644292');
  expect(dernierResultat(club, 'u11-mixte-3')).toBeUndefined();
});

test('match par identifiant', () => {
  expect(matchParId(club, '2644292')?.equipe.id).toBe('32542-clamart-handball-1');
  expect(matchParId(club, 'inexistant')).toBeUndefined();
});

test('score en attente : match commencé sans résultat', () => {
  const m = matchsDuWeekend(club, W_10_11).find((x) => x.equipe.collectif === 'u11-mixte-3')!;
  expect(scoreEnAttente(m, MAR_SOIR)).toBe(true);
  expect(scoreEnAttente(m, new Date('2026-10-09T12:00:00+02:00'))).toBe(false);
});

test('série en cours', () => {
  expect(serieEnCours(matchsDuCollectif(club, 'seniors-f-1'))).toEqual({ resultat: 'V', longueur: 3 });
  expect(serieEnCours(matchsDuCollectif(club, 'u13-f'))).toEqual({ resultat: 'D', longueur: 5 });
  expect(serieEnCours(matchsDuCollectif(club, 'u11-mixte-3'))).toBeUndefined();
});

test('jours avec matchs et jour par défaut', () => {
  const jours = joursAvecMatchs(club);
  expect(jours).toHaveLength(18);
  expect(jours[0]).toBe('2026-09-12');
  expect(jourParDefaut(jours, '2026-10-11')).toBe('2026-10-11');
  expect(jourParDefaut(jours, '2026-10-12')).toBe('2026-10-17');
  expect(jourParDefaut(jours, '2027-06-01')).toBe('2027-02-27');
  expect(jourParDefaut([], '2026-10-12')).toBeUndefined();
});

test('collectifs et matchs groupés par catégorie, seniors d’abord', () => {
  const groupes = collectifsParCategorie(club);
  expect(groupes.map((g) => g.titre)).toEqual(['Seniors', 'U18', 'U15', 'U13', 'U11']);
  expect(groupes[0].collectifs.map((c) => c.id)).toEqual(['seniors-f-1', 'seniors-f-1b', 'seniors-m']);
  expect(grouperParCategorie(matchsDuJour(club, '2026-10-11')).map((g) => g.titre)).toEqual(['Seniors', 'U13', 'U11']);
});

test('buteurs d’un collectif : seniors seulement', () => {
  const buteurs = buteursDuCollectif(club, 'seniors-f-1');
  expect(buteurs[0]).toEqual({ joueur: 'Diara DORILAS', buts: 38, matchs: 5 });
  expect(buteursDuCollectif(club, 'u18-f')).toEqual([]);
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- src/donnees/selecteurs.test.ts`
Expected: FAIL, `Cannot find module './selecteurs'`

- [ ] **Step 3: Implémenter `app/src/donnees/selecteurs.ts`**

```ts
import { jourDuMatch, type Weekend } from './dates';
import type { Club, Collectif, Equipe, Match, MatchAvecEquipe, Resultat } from './types';

const instant = (m: Match) => (m.date ? Date.parse(m.date) : Number.POSITIVE_INFINITY);

export function equipesDuCollectif(club: Club, id: string): Equipe[] {
  return club.equipes.filter((e) => e.collectif === id);
}

export function equipePrincipale(club: Club, id: string): Equipe | undefined {
  const equipes = equipesDuCollectif(club, id);
  return equipes.find((e) => e.classement) ?? equipes[0];
}

export function tousLesMatchs(club: Club): MatchAvecEquipe[] {
  return club.equipes
    .flatMap((equipe) => equipe.matchs.map((m) => ({ ...m, equipe })))
    .sort((a, b) => instant(a) - instant(b));
}

export const matchsDuCollectif = (club: Club, id: string) =>
  tousLesMatchs(club).filter((m) => m.equipe.collectif === id);

export const matchsDuJour = (club: Club, jour: string) =>
  tousLesMatchs(club).filter((m) => m.date !== null && jourDuMatch(m.date) === jour);

export const matchsDuWeekend = (club: Club, w: Weekend) =>
  tousLesMatchs(club).filter(
    (m) => m.date !== null && jourDuMatch(m.date) >= w.vendredi && jourDuMatch(m.date) <= w.dimanche,
  );

export const matchParId = (club: Club, id: string) => tousLesMatchs(club).find((m) => m.id === id);

export function joursAvecMatchs(club: Club): string[] {
  return [...new Set(tousLesMatchs(club).flatMap((m) => (m.date ? [jourDuMatch(m.date)] : [])))].sort();
}

/** Aujourd'hui s'il y a des matchs, sinon le prochain jour de match, sinon le dernier. */
export function jourParDefaut(jours: string[], aujourdhui: string): string | undefined {
  return jours.find((j) => j >= aujourdhui) ?? jours[jours.length - 1];
}

export const prochainMatch = (club: Club, id: string, maintenant: Date) =>
  matchsDuCollectif(club, id).find(
    (m) => m.resultat === null && m.date !== null && Date.parse(m.date) >= maintenant.getTime(),
  );

export function dernierResultat(club: Club, id: string): MatchAvecEquipe | undefined {
  const joues = matchsDuCollectif(club, id).filter((m) => m.resultat !== null);
  return joues[joues.length - 1];
}

/** Match commencé dont le score n'est pas encore publié sur la FFHB. */
export const scoreEnAttente = (m: Match, maintenant: Date) =>
  m.resultat === null && m.date !== null && Date.parse(m.date) < maintenant.getTime();

export function serieEnCours(matchs: Match[]): { resultat: Resultat; longueur: number } | undefined {
  const joues = matchs.filter((m) => m.resultat !== null);
  const dernier = joues[joues.length - 1]?.resultat;
  if (!dernier) return undefined;
  let longueur = 0;
  for (let i = joues.length - 1; i >= 0 && joues[i].resultat === dernier; i--) longueur++;
  return { resultat: dernier, longueur };
}

export const formeRecente = (matchs: Match[], n = 5): Resultat[] =>
  matchs.filter((m) => m.resultat !== null).slice(-n).map((m) => m.resultat as Resultat);

export const libelleCategorie = (c: string) => (c === 'seniors' ? 'Seniors' : c);
/** Seniors, puis U18, U15, U13, U11… */
export const rangCategorie = (c: string) => (c === 'seniors' ? 0 : 100 - Number(c.replace(/\D/g, '') || 0));

export function collectifsParCategorie(club: Club) {
  const categories = [...new Set(club.collectifs.map((c) => c.categorie))].sort(
    (a, b) => rangCategorie(a) - rangCategorie(b),
  );
  return categories.map((categorie) => ({
    categorie,
    titre: libelleCategorie(categorie),
    collectifs: club.collectifs.filter((c): c is Collectif => c.categorie === categorie),
  }));
}

export function grouperParCategorie(matchs: MatchAvecEquipe[]) {
  const categories = [...new Set(matchs.map((m) => m.equipe.categorie))].sort(
    (a, b) => rangCategorie(a) - rangCategorie(b),
  );
  return categories.map((categorie) => ({
    categorie,
    titre: libelleCategorie(categorie),
    matchs: matchs.filter((m) => m.equipe.categorie === categorie),
  }));
}

export interface ButeurEquipe {
  joueur: string;
  buts: number;
  matchs: number;
}

/** Buteurs d'un collectif, toutes compétitions. Vide pour les jeunes (stats_joueurs = false). */
export function buteursDuCollectif(club: Club, id: string): ButeurEquipe[] {
  const parJoueur = new Map<string, ButeurEquipe>();
  for (const m of matchsDuCollectif(club, id)) {
    if (!m.equipe.stats_joueurs) continue;
    for (const b of m.buteurs ?? []) {
      const e = parJoueur.get(b.joueur) ?? { joueur: b.joueur, buts: 0, matchs: 0 };
      e.buts += b.buts;
      e.matchs += 1;
      parJoueur.set(b.joueur, e);
    }
  }
  return [...parJoueur.values()]
    .filter((b) => b.buts > 0)
    .sort((a, b) => b.buts - a.buts || a.joueur.localeCompare(b.joueur));
}
```

- [ ] **Step 4: Lancer les tests**

Run: `npm test -- src/donnees/selecteurs.test.ts`
Expected: 11 PASS. Si `buteursDuCollectif(...)[0].matchs` diffère de 5, vérifier dans la fixture le nombre de matchs où « Diara DORILAS » figure parmi les buteurs (`buteurs_club` indique 5) avant de toucher au code.

- [ ] **Step 5: Commit**

```bash
git add app/src/donnees/selecteurs.ts app/src/donnees/selecteurs.test.ts
git commit -m "App : sélecteurs purs sur les données du club

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Noms lisibles et phrase de résultat (signature)

**Files:**
- Create: `partage/phrases-cas.json`, `app/src/donnees/phrase.ts`, `app/src/donnees/phrase.test.ts`

**Interfaces:**
- Consumes: types (Task 2).
- Produces:
  - `nomLisible(brut: string): string` — « ENT. SURESNES / NANTERRE » → « Ent. Suresnes / Nanterre »
  - `interface Phrase { titre: string; sousTitre?: string }`
  - `phraseResultat(m: Pick<Match, 'resultat' | 'score_nous' | 'score_eux' | 'adversaire'>, serie?: { resultat: Resultat; longueur: number } | null): Phrase | undefined`
  - `scoreTexte(m: Pick<Match, 'score_nous' | 'score_eux'>): string` (`'32–22'`), `ordinal(n: number): string` (`'1er'`, `'3e'`)
  - `partage/phrases-cas.json` : `{ noms: {brut, attendu}[], phrases: {match, serie, attendu}[] }` — réutilisé par le notifieur Python (Plan 3).

- [ ] **Step 1: Écrire les cas partagés**

`partage/phrases-cas.json` :

```json
{
  "commentaire": "Cas partagés app (Jest) et notifieur (pytest). Règle : jamais d'adjectif sur une défaite.",
  "noms": [
    { "brut": "ENT. SURESNES / NANTERRE", "attendu": "Ent. Suresnes / Nanterre" },
    { "brut": "PARIS SC 1D", "attendu": "Paris SC 1D" },
    { "brut": "ASSOCIATION SPORTIVE ST-CYR/FONTENAY HANDBALL 78", "attendu": "Association Sportive St-Cyr/Fontenay Handball 78" },
    { "brut": "PARIS ST-GERMAIN HB 3", "attendu": "Paris St-Germain HB 3" },
    { "brut": "AC BOULOGNE-BILLANCOURT", "attendu": "AC Boulogne-Billancourt" },
    { "brut": "ASV CHATENAY-MALABRY 2", "attendu": "ASV Chatenay-Malabry 2" },
    { "brut": "STADE DE VANVES 1", "attendu": "Stade de Vanves 1" },
    { "brut": "MARTIGUA SCL", "attendu": "Martigua SCL" },
    { "brut": "UNION SPORTIVE MUNICIPALE DE MALAKOFF 3", "attendu": "Union Sportive Municipale de Malakoff 3" },
    { "brut": "GYMNASE DU PETIT CLAMART", "attendu": "Gymnase du Petit Clamart" },
    { "brut": "salle jacques duclos", "attendu": "Salle Jacques Duclos" },
    { "brut": "HANDBALL CLUB D'ISSY", "attendu": "Handball Club d'Issy" }
  ],
  "phrases": [
    {
      "match": { "resultat": "V", "score_nous": 32, "score_eux": 22, "adversaire": "ENT. SURESNES / NANTERRE" },
      "serie": { "resultat": "V", "longueur": 3 },
      "attendu": { "titre": "Victoire contre Ent. Suresnes / Nanterre", "sousTitre": "3e victoire de suite" }
    },
    {
      "match": { "resultat": "D", "score_nous": 21, "score_eux": 22, "adversaire": "LEVALLOIS SC 1D" },
      "serie": { "resultat": "D", "longueur": 1 },
      "attendu": { "titre": "Défaite d'un but contre Levallois SC 1D" }
    },
    {
      "match": { "resultat": "V", "score_nous": 20, "score_eux": 19, "adversaire": "PARIS SC 1D" },
      "serie": null,
      "attendu": { "titre": "Victoire d'un but contre Paris SC 1D" }
    },
    {
      "match": { "resultat": "N", "score_nous": 25, "score_eux": 25, "adversaire": "CELLOIS HB" },
      "serie": null,
      "attendu": { "titre": "Match nul contre Cellois HB" }
    },
    {
      "match": { "resultat": "D", "score_nous": 6, "score_eux": 23, "adversaire": "AC BOULOGNE-BILLANCOURT" },
      "serie": { "resultat": "D", "longueur": 5 },
      "attendu": { "titre": "Défaite contre AC Boulogne-Billancourt" }
    },
    {
      "match": { "resultat": "V", "score_nous": 27, "score_eux": 24, "adversaire": "PARIS UNIVERSITE CLUB 3" },
      "serie": { "resultat": "V", "longueur": 2 },
      "attendu": { "titre": "Victoire contre Paris Universite Club 3" }
    },
    {
      "match": { "resultat": null, "score_nous": null, "score_eux": null, "adversaire": "CELLOIS HB" },
      "serie": null,
      "attendu": null
    }
  ]
}
```

- [ ] **Step 2: Écrire les tests**

`app/src/donnees/phrase.test.ts` :

```ts
import cas from '../../../partage/phrases-cas.json';
import { nomLisible, ordinal, phraseResultat, scoreTexte } from './phrase';
import type { Match, Resultat } from './types';

type CasPhrase = {
  match: Pick<Match, 'resultat' | 'score_nous' | 'score_eux' | 'adversaire'>;
  serie: { resultat: Resultat; longueur: number } | null;
  attendu: { titre: string; sousTitre?: string } | null;
};

test.each(cas.noms)('nomLisible($brut)', ({ brut, attendu }) => {
  expect(nomLisible(brut)).toBe(attendu);
});

test.each(cas.phrases as CasPhrase[])('phraseResultat %#', ({ match, serie, attendu }) => {
  expect(phraseResultat(match, serie) ?? null).toEqual(attendu);
});

test('jamais de vocabulaire dévalorisant, même pour un gros écart', () => {
  const p = phraseResultat({ resultat: 'D', score_nous: 26, score_eux: 45, adversaire: 'PARIS ST-GERMAIN HB 3' });
  expect(p?.titre).toBe('Défaite contre Paris St-Germain HB 3');
});

test('score et ordinal', () => {
  expect(scoreTexte({ score_nous: 32, score_eux: 22 })).toBe('32–22');
  expect(ordinal(1)).toBe('1er');
  expect(ordinal(3)).toBe('3e');
});
```

- [ ] **Step 3: Lancer pour vérifier l'échec**

Run: `npm test -- src/donnees/phrase.test.ts`
Expected: FAIL, `Cannot find module './phrase'`

- [ ] **Step 4: Implémenter `app/src/donnees/phrase.ts`**

```ts
import type { Match, Resultat } from './types';

const MINUSCULES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'sur', 'en', 'd', 'l', 'a', 'au', 'aux']);
const ABREVIATIONS = new Set(['st', 'ste']);
const SIGLES = new Set(['AC', 'AS', 'ASV', 'ASM', 'US', 'USM', 'UC', 'ES', 'CA', 'CO', 'OC', 'SO', 'CSM', 'AAS']);
const SEPARATEUR = /^[\s\-/.'’]+$/;

/** Nom FFHB en capitales → nom lisible. Sigles (SC, HB, ASV…) et numéros conservés. */
export function nomLisible(brut: string): string {
  let premier = true;
  return brut
    .trim()
    .split(/([\s\-/.'’]+)/)
    .map((morceau) => {
      if (!morceau || SEPARATEUR.test(morceau)) return morceau;
      const estPremier = premier;
      premier = false;
      if (/\d/.test(morceau)) return morceau;
      const bas = morceau.toLowerCase();
      if (!estPremier && MINUSCULES.has(bas)) return bas;
      const capitale = bas.charAt(0).toUpperCase() + bas.slice(1);
      if (ABREVIATIONS.has(bas)) return capitale;
      const enCapitales = morceau === morceau.toUpperCase();
      if (enCapitales && (SIGLES.has(morceau) || (morceau.length <= 3 && !/[AEIOUY]/.test(morceau)))) return morceau;
      return capitale;
    })
    .join('');
}

export interface Phrase {
  titre: string;
  sousTitre?: string;
}

/** Signature de l'app : le résultat dit en une phrase. Jamais d'adjectif sur une défaite. */
export function phraseResultat(
  m: Pick<Match, 'resultat' | 'score_nous' | 'score_eux' | 'adversaire'>,
  serie?: { resultat: Resultat; longueur: number } | null,
): Phrase | undefined {
  if (!m.resultat || m.score_nous === null || m.score_eux === null) return undefined;
  const adversaire = nomLisible(m.adversaire);
  const dUnBut = Math.abs(m.score_nous - m.score_eux) === 1 ? " d'un but" : '';
  const titre =
    m.resultat === 'N'
      ? `Match nul contre ${adversaire}`
      : `${m.resultat === 'V' ? 'Victoire' : 'Défaite'}${dUnBut} contre ${adversaire}`;
  if (serie?.resultat === 'V' && serie.longueur >= 3) {
    return { titre, sousTitre: `${serie.longueur}e victoire de suite` };
  }
  return { titre };
}

export const scoreTexte = (m: Pick<Match, 'score_nous' | 'score_eux'>) => `${m.score_nous}–${m.score_eux}`;
export const ordinal = (n: number) => (n === 1 ? '1er' : `${n}e`);
```

- [ ] **Step 5: Lancer les tests**

Run: `npm test -- src/donnees/phrase.test.ts`
Expected: 21 PASS (12 noms + 7 phrases + 2).

- [ ] **Step 6: Commit**

```bash
git add partage/phrases-cas.json app/src/donnees/phrase.ts app/src/donnees/phrase.test.ts
git commit -m "App : noms lisibles et phrase de résultat, cas partagés

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Thème du club (clair / sombre)

**Files:**
- Create: `app/src/theme/couleurs.ts`, `app/src/theme/contraste.ts`, `app/src/theme/theme.ts`, `app/src/theme/theme.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `interface Paire { fond: string; texte: string }`, `interface Palette { fond, carte, texte, texteDoux, titre, action, surAction, ligne, indicateur, surIndicateur, surligne: string; victoire, nul, defaite: Paire }`, `clair: Palette`, `sombre: Palette`
  - `contraste(a: string, b: string): number`
  - `POLICES = { normal: 'Nunito_500Medium', gras: 'Nunito_700Bold', titre: 'Nunito_800ExtraBold' }`
  - `type ThemeClub = MD3Theme & { club: Palette; rayonCarte: number }`, `themeClair`, `themeSombre`, `useThemeClub(): ThemeClub`

- [ ] **Step 1: Écrire les tests de contraste**

`app/src/theme/theme.test.ts` :

```ts
import { contraste } from './contraste';
import { clair, sombre, type Palette } from './couleurs';
import { themeClair, themeSombre } from './theme';

function paires(p: Palette): [string, string, string, number][] {
  return [
    ['texte / fond', p.texte, p.fond, 4.5],
    ['texte / carte', p.texte, p.carte, 4.5],
    ['texte doux / carte', p.texteDoux, p.carte, 4.5],
    ['texte doux / fond', p.texteDoux, p.fond, 4.5],
    ['texte doux / surligné', p.texteDoux, p.surligne, 4.5],
    ['titre / carte', p.titre, p.carte, 4.5],
    ['titre / fond', p.titre, p.fond, 4.5],
    ['texte sur action', p.surAction, p.action, 4.5],
    ['action / carte', p.action, p.carte, 3],
    ['action / fond', p.action, p.fond, 3],
    ['indicateur d’onglet', p.surIndicateur, p.indicateur, 4.5],
    ['victoire', p.victoire.texte, p.victoire.fond, 4.5],
    ['nul', p.nul.texte, p.nul.fond, 4.5],
    ['défaite', p.defaite.texte, p.defaite.fond, 4.5],
    ['victoire sur carte', p.victoire.texte, p.carte, 4.5],
  ];
}

describe.each([['clair', clair], ['sombre', sombre]] as const)('palette %s', (_nom, palette) => {
  test.each(paires(palette))('%s ≥ %#', (_libelle, a, b, minimum) => {
    expect(contraste(a, b)).toBeGreaterThanOrEqual(minimum);
  });
});

test('contraste de référence', () => {
  expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
});

test('les rôles Material pointent vers la palette', () => {
  expect(themeClair.colors.primary).toBe(clair.action);
  expect(themeClair.colors.background).toBe(clair.fond);
  expect(themeSombre.dark).toBe(true);
  expect(themeSombre.colors.surface).toBe(sombre.carte);
  expect(themeClair.rayonCarte).toBe(20);
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- src/theme/theme.test.ts`
Expected: FAIL, `Cannot find module './contraste'`

- [ ] **Step 3: Implémenter les trois fichiers**

`app/src/theme/couleurs.ts` :

```ts
/** Seul fichier de l'app autorisé à contenir des couleurs en dur. Couleurs du club relevées sur le logo. */
export interface Paire {
  fond: string;
  texte: string;
}

export interface Palette {
  fond: string;
  carte: string;
  texte: string;
  texteDoux: string;
  /** Scores et titres : bleu nuit de l'écusson. */
  titre: string;
  /** Rouge du club, réservé à ce qui est actionnable. */
  action: string;
  surAction: string;
  ligne: string;
  indicateur: string;
  surIndicateur: string;
  surligne: string;
  victoire: Paire;
  nul: Paire;
  defaite: Paire;
}

export const clair: Palette = {
  fond: '#FBF6EE',
  carte: '#FFFFFF',
  texte: '#2A2622',
  texteDoux: '#6E655D',
  titre: '#142A3D',
  action: '#DB0000',
  surAction: '#FFFFFF',
  ligne: '#EFE7DC',
  indicateur: '#FADAD3',
  surIndicateur: '#7A1005',
  surligne: '#FFF1E0',
  victoire: { fond: '#E3F1E8', texte: '#1B5E3B' },
  nul: { fond: '#EBEEF2', texte: '#3D4A57' },
  defaite: { fond: '#F1E9E4', texte: '#6B4A3E' },
};

export const sombre: Palette = {
  fond: '#142A3D',
  carte: '#1E3549',
  texte: '#F4EFE6',
  texteDoux: '#B4C0CC',
  titre: '#FFFEF0',
  action: '#FF6B5E',
  surAction: '#2A0A06',
  ligne: '#2C4256',
  indicateur: '#5A1D18',
  surIndicateur: '#FFDAD4',
  surligne: '#26425A',
  victoire: { fond: '#21483A', texte: '#BFE8CF' },
  nul: { fond: '#2C4256', texte: '#D5DCE3' },
  defaite: { fond: '#4A3430', texte: '#F0D2C6' },
};
```

`app/src/theme/contraste.ts` :

```ts
/** Ratio de contraste WCAG 2.x entre deux couleurs #RRGGBB. */
export function contraste(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, v] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * v;
  };
  const [clair, fonce] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (fonce + 0.05);
}
```

`app/src/theme/theme.ts` :

```ts
import { configureFonts, MD3DarkTheme, MD3LightTheme, useTheme, type MD3Theme } from 'react-native-paper';
import { clair, sombre, type Palette } from './couleurs';

export const POLICES = {
  normal: 'Nunito_500Medium',
  gras: 'Nunito_700Bold',
  titre: 'Nunito_800ExtraBold',
} as const;

export type ThemeClub = MD3Theme & { club: Palette; rayonCarte: number };

// fontWeight 'normal' : sur Android, un poids explicite sur une police personnalisée la remplace par Roboto.
const base = configureFonts({ config: { fontFamily: POLICES.normal, fontWeight: 'normal' } });
const polices = {
  ...base,
  headlineSmall: { ...base.headlineSmall, fontFamily: POLICES.titre },
  titleLarge: { ...base.titleLarge, fontFamily: POLICES.titre },
  titleMedium: { ...base.titleMedium, fontFamily: POLICES.gras },
  labelLarge: { ...base.labelLarge, fontFamily: POLICES.gras },
};

function construire(socle: MD3Theme, p: Palette, dark: boolean): ThemeClub {
  return {
    ...socle,
    dark,
    roundness: 4,
    fonts: polices,
    rayonCarte: 20,
    club: p,
    colors: {
      ...socle.colors,
      primary: p.action,
      onPrimary: p.surAction,
      primaryContainer: p.indicateur,
      onPrimaryContainer: p.surIndicateur,
      secondaryContainer: p.indicateur,
      onSecondaryContainer: p.surIndicateur,
      background: p.fond,
      onBackground: p.texte,
      surface: p.carte,
      onSurface: p.texte,
      surfaceVariant: p.surligne,
      onSurfaceVariant: p.texteDoux,
      outline: p.texteDoux,
      outlineVariant: p.ligne,
      elevation: { level0: 'transparent', level1: p.carte, level2: p.carte, level3: p.carte, level4: p.carte, level5: p.carte },
    },
  };
}

export const themeClair = construire(MD3LightTheme, clair, false);
export const themeSombre = construire(MD3DarkTheme, sombre, true);
export const useThemeClub = () => useTheme<ThemeClub>();
```

- [ ] **Step 4: Lancer les tests et le contrôle de types**

Run: `npm test -- src/theme/theme.test.ts && npm run typecheck`
Expected: 32 PASS (15 paires × 2 + 2) ; `tsc` sans erreur.

- [ ] **Step 5: Commit**

```bash
git add app/src/theme
git commit -m "App : thème du club clair et sombre, contrastes vérifiés

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Équipes suivies (stockage local)

**Files:**
- Create: `app/src/suivi/suivi.ts`, `app/src/suivi/suivi.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `useSuivi` (store zustand persistant, clé AsyncStorage `'clamart-suivi'`) avec l'état `{ suivis: string[]; bienvenueFaite: boolean; retires: string[] }` et les actions `basculer(id)`, `definirSuivis(ids)`, `terminerBienvenue()`, `retirerInconnus(valides: string[]): string[]`, `effacerRetires()`
  - `useSuiviPret(): boolean` — vrai quand l'état a été relu depuis le stockage.

- [ ] **Step 1: Écrire les tests**

`app/src/suivi/suivi.test.ts` :

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSuivi } from './suivi';

beforeEach(() => useSuivi.setState({ suivis: [], bienvenueFaite: false, retires: [] }));
const etat = () => useSuivi.getState();

test('basculer ajoute puis retire', () => {
  etat().basculer('seniors-m');
  expect(etat().suivis).toEqual(['seniors-m']);
  etat().basculer('seniors-m');
  expect(etat().suivis).toEqual([]);
});

test('definirSuivis dédoublonne', () => {
  etat().definirSuivis(['u18-f', 'u18-f', 'seniors-m']);
  expect(etat().suivis).toEqual(['u18-f', 'seniors-m']);
});

test('retirerInconnus retire et mémorise les équipes disparues', () => {
  useSuivi.setState({ suivis: ['seniors-m', 'ancienne-equipe'] });
  expect(etat().retirerInconnus(['seniors-m', 'u18-f'])).toEqual(['ancienne-equipe']);
  expect(etat().suivis).toEqual(['seniors-m']);
  expect(etat().retires).toEqual(['ancienne-equipe']);
  etat().effacerRetires();
  expect(etat().retires).toEqual([]);
});

test('retirerInconnus ne change rien si tout est connu', () => {
  useSuivi.setState({ suivis: ['seniors-m'], retires: [] });
  expect(etat().retirerInconnus(['seniors-m'])).toEqual([]);
  expect(etat().retires).toEqual([]);
});

test('le premier lancement est mémorisé sur le téléphone', async () => {
  etat().basculer('u13-m');
  etat().terminerBienvenue();
  await new Promise((r) => setTimeout(r, 0));
  const sauve = JSON.parse((await AsyncStorage.getItem('clamart-suivi')) ?? '{}');
  expect(sauve.state).toEqual({ suivis: ['u13-m'], bienvenueFaite: true, retires: [] });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- src/suivi/suivi.test.ts`
Expected: FAIL, `Cannot find module './suivi'`

- [ ] **Step 3: Implémenter `app/src/suivi/suivi.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface EtatSuivi {
  /** Ids de collectifs suivis (ex. 'seniors-m'). */
  suivis: string[];
  bienvenueFaite: boolean;
  /** Collectifs retirés car absents des données, à signaler dans Réglages. */
  retires: string[];
  basculer: (id: string) => void;
  definirSuivis: (ids: string[]) => void;
  terminerBienvenue: () => void;
  retirerInconnus: (valides: string[]) => string[];
  effacerRetires: () => void;
}

export const useSuivi = create<EtatSuivi>()(
  persist(
    (set, get) => ({
      suivis: [],
      bienvenueFaite: false,
      retires: [],
      basculer: (id) =>
        set(({ suivis }) => ({ suivis: suivis.includes(id) ? suivis.filter((s) => s !== id) : [...suivis, id] })),
      definirSuivis: (ids) => set({ suivis: [...new Set(ids)] }),
      terminerBienvenue: () => set({ bienvenueFaite: true }),
      retirerInconnus: (valides) => {
        const { suivis, retires } = get();
        const absents = suivis.filter((s) => !valides.includes(s));
        if (absents.length) set({ suivis: suivis.filter((s) => valides.includes(s)), retires: [...retires, ...absents] });
        return absents;
      },
      effacerRetires: () => set({ retires: [] }),
    }),
    {
      name: 'clamart-suivi',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ suivis, bienvenueFaite, retires }) => ({ suivis, bienvenueFaite, retires }),
    },
  ),
);

/** Vrai quand les équipes suivies ont été relues depuis le téléphone. */
export function useSuiviPret(): boolean {
  const [pret, setPret] = useState(() => useSuivi.persist.hasHydrated());
  useEffect(() => {
    const arreter = useSuivi.persist.onFinishHydration(() => setPret(true));
    if (useSuivi.persist.hasHydrated()) setPret(true);
    return arreter;
  }, []);
  return pret;
}
```

- [ ] **Step 4: Lancer les tests**

Run: `npm test -- src/suivi/suivi.test.ts`
Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/suivi
git commit -m "App : équipes suivies et premier lancement, stockés sur le téléphone

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Cache des données et horloge

**Files:**
- Create: `app/src/donnees/requetes.ts`, `app/src/donnees/requetes.test.tsx`, `app/src/donnees/maintenant.ts`

**Interfaces:**
- Consumes: `chargerClub` (Task 2), `URL_DONNEES` (Task 2).
- Produces:
  - `CLE_CLUB = ['club'] as const`, `UN_MOIS: number`, `creerClientRequetes(): QueryClient`, `persisteur` (AsyncStorage, clé `'clamart-cache-v1'`), `brancherPremierPlan(): () => void`
  - `useClub(): { club: Club | undefined; chargement: boolean; erreur: Error | null; horsLigne: boolean; rafraichir: () => void; rafraichissement: boolean }`
  - `useMaintenant(): Date` — mis à jour chaque minute et au retour au premier plan.

- [ ] **Step 1: Écrire les tests**

`app/src/donnees/requetes.test.tsx` :

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { fixtureBrute } from '../../test/donnees';
import { CLE_CLUB, useClub } from './requetes';

function enveloppe(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
const nouveauClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

afterEach(() => jest.restoreAllMocks());

test('charge le club', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(fixtureBrute) }),
  ) as unknown as typeof fetch;
  const { result } = renderHook(() => useClub(), { wrapper: enveloppe(nouveauClient()) });
  await waitFor(() => expect(result.current.club).toBeDefined());
  expect(result.current.horsLigne).toBe(false);
  expect(result.current.chargement).toBe(false);
});

test('hors ligne : garde les données en cache et le signale', async () => {
  const client = nouveauClient();
  client.setQueryData(CLE_CLUB, fixtureBrute);
  global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as unknown as typeof fetch;
  const { result } = renderHook(() => useClub(), { wrapper: enveloppe(client) });
  await act(async () => {
    await result.current.rafraichir();
  });
  await waitFor(() => expect(result.current.horsLigne).toBe(true));
  expect(result.current.club?.saison).toBe('2026-2027');
});

test('sans cache ni réseau : erreur, pas de données', async () => {
  global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as unknown as typeof fetch;
  const { result } = renderHook(() => useClub(), { wrapper: enveloppe(nouveauClient()) });
  await waitFor(() => expect(result.current.erreur?.name).toBe('ErreurReseau'));
  expect(result.current.club).toBeUndefined();
  expect(result.current.horsLigne).toBe(false);
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- src/donnees/requetes.test.tsx`
Expected: FAIL, `Cannot find module './requetes'`

- [ ] **Step 3: Implémenter**

`app/src/donnees/requetes.ts` :

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, QueryClient, useQuery } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { URL_DONNEES } from '../config';
import { chargerClub } from './source';
import type { Club } from './types';

export const CLE_CLUB = ['club'] as const;
export const UN_MOIS = 1000 * 60 * 60 * 24 * 30;

export function creerClientRequetes(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { gcTime: UN_MOIS, staleTime: 5 * 60 * 1000, retry: 1 } },
  });
}

export const persisteur = createAsyncStoragePersister({ storage: AsyncStorage, key: 'clamart-cache-v1' });

/** Rafraîchit les données au retour au premier plan (si elles ont plus de 5 min). */
export function brancherPremierPlan(): () => void {
  const abonnement = AppState.addEventListener('change', (etat) => focusManager.setFocused(etat === 'active'));
  return () => abonnement.remove();
}

export function useClub() {
  const q = useQuery<Club, Error>({ queryKey: CLE_CLUB, queryFn: () => chargerClub(URL_DONNEES) });
  return {
    club: q.data,
    chargement: q.isPending,
    erreur: q.error,
    /** Le dernier rafraîchissement a échoué mais des données en cache sont affichées. */
    horsLigne: q.isError && q.data !== undefined,
    rafraichir: () => q.refetch(),
    rafraichissement: q.isRefetching,
  };
}
```

`app/src/donnees/maintenant.ts` :

```ts
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** L'heure courante, actualisée chaque minute et au retour dans l'app. */
export function useMaintenant(): Date {
  const [maintenant, setMaintenant] = useState(() => new Date());
  useEffect(() => {
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') setMaintenant(new Date());
    });
    const minuterie = setInterval(() => setMaintenant(new Date()), 60_000);
    return () => {
      abonnement.remove();
      clearInterval(minuterie);
    };
  }, []);
  return maintenant;
}
```

- [ ] **Step 4: Lancer les tests**

Run: `npm test -- src/donnees/requetes.test.tsx && npm run typecheck`
Expected: 3 PASS ; `tsc` sans erreur.

- [ ] **Step 5: Commit**

```bash
git add app/src/donnees/requetes.ts app/src/donnees/requetes.test.tsx app/src/donnees/maintenant.ts
git commit -m "App : cache hors ligne des données et horloge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Composants de base

**Files:**
- Create: `app/test/rendu.tsx`, `app/src/composants/PastilleResultat.tsx`, `app/src/composants/LigneMatch.tsx`, `app/src/composants/EnTeteSection.tsx`, `app/src/composants/BandeauEtat.tsx`, `app/src/composants/EtatSansDonnees.tsx`, `app/src/composants/composants.test.tsx`

**Interfaces:**
- Consumes: thème (Task 6), dates (Task 3), sélecteurs (Task 4), phrase (Task 5), `URL_PLAY_STORE` (Task 2).
- Produces:
  - `rendu(ui: ReactElement, theme?: ThemeClub)` (test)
  - `LIBELLES: Record<Resultat, string>`, `<PastilleResultat resultat />`, `<Forme resultats />`
  - `<LigneMatch match maintenant onPress afficherCompetition? />` (testID `ligne-match`)
  - `<EnTeteSection titre detail? />`
  - `<BandeauEtat horsLigne miseAJour maintenant />` (rien si tout va bien)
  - `<EtatSansDonnees chargement erreur reessayer />`

- [ ] **Step 1: Écrire l'outil de rendu de test**

`app/test/rendu.tsx` :

```tsx
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { themeClair, type ThemeClub } from '../src/theme/theme';

export function rendu(ui: ReactElement, theme: ThemeClub = themeClair) {
  return render(
    <SafeAreaProvider>
      <PaperProvider theme={theme}>{ui}</PaperProvider>
    </SafeAreaProvider>,
  );
}
```

- [ ] **Step 2: Écrire les tests des composants**

`app/src/composants/composants.test.tsx` :

```tsx
import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { club, MAR_SOIR } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import { matchParId } from '../donnees/selecteurs';
import { themeSombre } from '../theme/theme';
import { BandeauEtat } from './BandeauEtat';
import { EtatSansDonnees } from './EtatSansDonnees';
import { LigneMatch } from './LigneMatch';
import { Forme } from './PastilleResultat';

const m = (id: string) => matchParId(club, id)!;

test('ligne d’un match joué à domicile', () => {
  const onPress = jest.fn();
  rendu(<LigneMatch match={m('2644292')} maintenant={MAR_SOIR} onPress={onPress} />);
  expect(screen.getByText('Clamart Seniors F 1')).toBeOnTheScreen();
  expect(screen.getByText('Ent. Suresnes / Nanterre')).toBeOnTheScreen();
  expect(screen.getByText('Fin')).toBeOnTheScreen();
  expect(screen.getByText('16:15')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Clamart Seniors F 1 32, Ent. Suresnes / Nanterre 22, victoire'));
  expect(onPress).toHaveBeenCalled();
});

test('ligne d’un match à l’extérieur : l’équipe qui reçoit en premier', () => {
  rendu(<LigneMatch match={m('2644473')} maintenant={MAR_SOIR} onPress={jest.fn()} />);
  expect(screen.getByLabelText('Paris SC 1D 17, Clamart Seniors F 1B 20, victoire')).toBeOnTheScreen();
});

test('ligne : score pas encore publié, puis match à venir', () => {
  const enAttente = club.equipes.find((e) => e.collectif === 'u11-mixte-3')!.matchs.find((x) => x.date?.startsWith('2026-10-10'))!;
  rendu(<LigneMatch match={m(enAttente.id)} maintenant={MAR_SOIR} onPress={jest.fn()} />);
  expect(screen.getByText('Attente')).toBeOnTheScreen();
  screen.unmount();
  rendu(<LigneMatch match={m('2734038')} maintenant={MAR_SOIR} onPress={jest.fn()} afficherCompetition />);
  expect(screen.getByText('18:00')).toBeOnTheScreen();
  expect(screen.getByText(/Coupe de France départementale/)).toBeOnTheScreen();
});

test('limite un nom long à deux lignes', () => {
  rendu(<LigneMatch match={m('2734038')} maintenant={MAR_SOIR} onPress={jest.fn()} />);
  expect(screen.getByText('Association Sportive St-Cyr/Fontenay Handball 78')).toHaveProp('numberOfLines', 2);
});

test('forme : lettres et libellé lu', () => {
  rendu(<Forme resultats={['V', 'D', 'V']} />);
  expect(screen.getAllByText('V')).toHaveLength(2);
  expect(screen.getByLabelText('Forme : victoire, défaite, victoire')).toBeOnTheScreen();
});

test('bandeau : rien si les données sont fraîches', () => {
  rendu(<BandeauEtat horsLigne={false} miseAJour={club.mis_a_jour} maintenant={MAR_SOIR} />);
  expect(screen.queryByRole('alert')).toBeNull();
});

test('bandeau hors ligne et bandeau données anciennes', () => {
  rendu(<BandeauEtat horsLigne miseAJour={club.mis_a_jour} maintenant={MAR_SOIR} />);
  expect(screen.getByText('Hors ligne · résultats mis à jour à 16:41')).toBeOnTheScreen();
  screen.unmount();
  rendu(<BandeauEtat horsLigne={false} miseAJour={club.mis_a_jour} maintenant={new Date('2026-10-16T09:00:00+02:00')} />);
  expect(screen.getByText("Les résultats n'ont pas été mis à jour depuis le mar. 13 oct.")).toBeOnTheScreen();
});

test('état sans données : chargement, erreur réseau, nouvelle version', () => {
  rendu(<EtatSansDonnees chargement erreur={null} reessayer={jest.fn()} />);
  expect(screen.getByLabelText('Chargement des résultats')).toBeOnTheScreen();
  screen.unmount();

  const reessayer = jest.fn();
  const reseau = Object.assign(new Error('Pas de connexion'), { name: 'ErreurReseau' });
  rendu(<EtatSansDonnees chargement={false} erreur={reseau} reessayer={reessayer} />);
  fireEvent.press(screen.getByText('Réessayer'));
  expect(reessayer).toHaveBeenCalled();
  screen.unmount();

  const ouvrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const schema = Object.assign(new Error('x'), { name: 'SchemaInconnu' });
  rendu(<EtatSansDonnees chargement={false} erreur={schema} reessayer={jest.fn()} />, themeSombre);
  expect(screen.getByText("Une nouvelle version de l'app est nécessaire")).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Mettre à jour'));
  expect(ouvrir).toHaveBeenCalledWith('market://details?id=fr.clamarthandball.app');
});
```

- [ ] **Step 3: Lancer pour vérifier l'échec**

Run: `npm test -- src/composants/composants.test.tsx`
Expected: FAIL, `Cannot find module './BandeauEtat'`

- [ ] **Step 4: Implémenter les composants**

`app/src/composants/PastilleResultat.tsx` :

```tsx
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import type { Resultat } from '../donnees/types';
import { useThemeClub } from '../theme/theme';

export const LIBELLES: Record<Resultat, string> = { V: 'victoire', N: 'match nul', D: 'défaite' };

export function PastilleResultat({ resultat }: { resultat: Resultat }) {
  const { club } = useThemeClub();
  const paire = resultat === 'V' ? club.victoire : resultat === 'N' ? club.nul : club.defaite;
  return (
    <View style={[styles.pastille, { backgroundColor: paire.fond }]}>
      <Text variant="labelMedium" style={{ color: paire.texte }}>
        {resultat}
      </Text>
    </View>
  );
}

export function Forme({ resultats }: { resultats: Resultat[] }) {
  if (!resultats.length) return null;
  return (
    <View style={styles.forme} accessible accessibilityLabel={`Forme : ${resultats.map((r) => LIBELLES[r]).join(', ')}`}>
      {resultats.map((r, i) => (
        <PastilleResultat key={i} resultat={r} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pastille: { minWidth: 24, minHeight: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  forme: { flexDirection: 'row', gap: 4 },
});
```

`app/src/composants/LigneMatch.tsx` :

```tsx
import { Image, StyleSheet, View } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';
import { heureDuMatch } from '../donnees/dates';
import { nomLisible } from '../donnees/phrase';
import { scoreEnAttente } from '../donnees/selecteurs';
import type { MatchAvecEquipe } from '../donnees/types';
import { POLICES, useThemeClub } from '../theme/theme';
import { LIBELLES } from './PastilleResultat';

const LOGO = require('../../assets/logo-clamart.png');

interface Props {
  match: MatchAvecEquipe;
  maintenant: Date;
  onPress: () => void;
  afficherCompetition?: boolean;
}

/** Une ligne façon app de scores : statut, deux équipes (celle qui reçoit en premier), scores. */
export function LigneMatch({ match, maintenant, onPress, afficherCompetition = false }: Props) {
  const t = useThemeClub();
  const nous = `Clamart ${match.equipe.nom}`;
  const eux = nomLisible(match.adversaire);
  const [dom, ext] = match.domicile ? [nous, eux] : [eux, nous];
  const [sDom, sExt] = match.domicile ? [match.score_nous, match.score_eux] : [match.score_eux, match.score_nous];
  const joue = match.resultat !== null && sDom !== null && sExt !== null;
  const attente = !joue && scoreEnAttente(match, maintenant);
  const statut = joue ? 'Fin' : match.date === null ? 'À fixer' : attente ? 'Attente' : heureDuMatch(match.date);
  const lu = joue
    ? `${dom} ${sDom}, ${ext} ${sExt}, ${LIBELLES[match.resultat!]}`
    : `${dom} contre ${ext}, ${attente ? 'score pas encore publié' : statut}`;
  const domGagne = joue && sDom! > sExt!;
  const extGagne = joue && sExt! > sDom!;

  return (
    <TouchableRipple onPress={onPress} accessibilityRole="button" accessibilityLabel={lu} testID="ligne-match">
      <View style={[styles.ligne, { borderBottomColor: t.colors.outlineVariant }]}>
        <View style={styles.statut}>
          <Text variant="labelMedium" style={{ color: t.colors.onSurfaceVariant }}>
            {statut}
          </Text>
          {joue && match.date ? (
            <Text variant="labelSmall" style={{ color: t.colors.onSurfaceVariant }}>
              {heureDuMatch(match.date)}
            </Text>
          ) : null}
        </View>
        <View style={styles.equipes}>
          {afficherCompetition ? (
            <Text variant="labelSmall" numberOfLines={1} style={{ color: t.colors.onSurfaceVariant }}>
              {match.journee ? `${match.equipe.detail} · J${match.journee}` : match.equipe.detail}
            </Text>
          ) : null}
          <Nom texte={dom} gras={domGagne} club={match.domicile} />
          <Nom texte={ext} gras={extGagne} club={!match.domicile} />
        </View>
        <View style={styles.scores}>
          <Text variant="titleMedium" style={[styles.chiffre, { color: t.colors.onSurface }, !domGagne && styles.leger]}>
            {joue ? sDom : '–'}
          </Text>
          <Text variant="titleMedium" style={[styles.chiffre, { color: t.colors.onSurface }, !extGagne && styles.leger]}>
            {joue ? sExt : '–'}
          </Text>
        </View>
      </View>
    </TouchableRipple>
  );
}

function Nom({ texte, gras, club }: { texte: string; gras: boolean; club: boolean }) {
  const t = useThemeClub();
  return (
    <View style={styles.nom}>
      {club ? (
        <Image source={LOGO} style={styles.logo} accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.logo, { backgroundColor: t.colors.outlineVariant }]} />
      )}
      <Text
        variant="bodyLarge"
        numberOfLines={2}
        style={[styles.texteNom, { color: t.colors.onSurface }, gras && { fontFamily: POLICES.gras }]}
      >
        {texte}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  statut: { width: 56, alignItems: 'center' },
  equipes: { flex: 1, gap: 4 },
  nom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 18, height: 18, borderRadius: 9 },
  texteNom: { flexShrink: 1 },
  scores: { alignItems: 'flex-end', gap: 4, minWidth: 32 },
  chiffre: { fontVariant: ['tabular-nums'] },
  leger: { fontFamily: POLICES.normal },
});
```

`app/src/composants/EnTeteSection.tsx` :

```tsx
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeClub } from '../theme/theme';

export function EnTeteSection({ titre, detail }: { titre: string; detail?: string }) {
  const t = useThemeClub();
  return (
    <View style={styles.entete} accessibilityRole="header">
      <Text variant="titleMedium" style={{ color: t.club.titre }}>
        {titre}
      </Text>
      {detail ? (
        <Text variant="labelLarge" style={{ color: t.colors.onSurfaceVariant }}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24, marginBottom: 8, paddingHorizontal: 4 },
});
```

`app/src/composants/BandeauEtat.tsx` :

```tsx
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { donneesAnciennes, jourLocal, libelleJour, libelleMiseAJour } from '../donnees/dates';
import { useThemeClub } from '../theme/theme';

interface Props {
  horsLigne: boolean;
  miseAJour: string;
  maintenant: Date;
}

/** Signale des données hors ligne ou anciennes. Ne rend rien quand tout va bien. */
export function BandeauEtat({ horsLigne, miseAJour, maintenant }: Props) {
  const t = useThemeClub();
  const ancien = donneesAnciennes(miseAJour, maintenant);
  if (!horsLigne && !ancien) return null;
  const texte = horsLigne
    ? `Hors ligne · résultats ${libelleMiseAJour(miseAJour, maintenant)}`
    : `Les résultats n'ont pas été mis à jour depuis le ${libelleJour(jourLocal(new Date(miseAJour)))}.`;
  return (
    <View style={[styles.bandeau, { backgroundColor: t.colors.surfaceVariant }]} accessibilityRole="alert">
      <Icon source={horsLigne ? 'wifi-off' : 'clock-alert-outline'} size={20} color={t.colors.onSurfaceVariant} />
      <Text variant="bodyMedium" style={[styles.texte, { color: t.colors.onSurfaceVariant }]}>
        {texte}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bandeau: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, marginTop: 12 },
  texte: { flex: 1 },
});
```

`app/src/composants/EtatSansDonnees.tsx` :

```tsx
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { URL_PLAY_STORE } from '../config';
import { useThemeClub } from '../theme/theme';

interface Props {
  chargement: boolean;
  erreur: Error | null;
  reessayer: () => void;
}

/** Premier chargement sans aucune donnée en cache : squelettes, ou erreur avec une action. */
export function EtatSansDonnees({ chargement, erreur, reessayer }: Props) {
  const t = useThemeClub();
  const haut = useSafeAreaInsets().top;
  if (chargement) {
    return (
      <View style={[styles.page, { paddingTop: haut + 24, backgroundColor: t.colors.background }]} accessible accessibilityLabel="Chargement des résultats">
        {[120, 160, 160].map((hauteur, i) => (
          <View key={i} style={{ height: hauteur, borderRadius: t.rayonCarte, backgroundColor: t.colors.surfaceVariant }} />
        ))}
      </View>
    );
  }
  const majRequise = erreur?.name === 'SchemaInconnu';
  return (
    <View style={[styles.page, styles.centre, { backgroundColor: t.colors.background }]}>
      <Text variant="titleLarge" style={[styles.centrer, { color: t.club.titre }]}>
        {majRequise ? "Une nouvelle version de l'app est nécessaire" : 'Impossible de charger les résultats'}
      </Text>
      <Text variant="bodyMedium" style={[styles.centrer, { color: t.colors.onSurfaceVariant }]}>
        {majRequise
          ? 'Le format des résultats a changé. Mettez l’app à jour depuis le Play Store.'
          : 'Vérifiez votre connexion internet, puis réessayez.'}
      </Text>
      {majRequise ? (
        <Button mode="contained" onPress={() => Linking.openURL(URL_PLAY_STORE)}>
          Mettre à jour
        </Button>
      ) : (
        <Button mode="contained" onPress={reessayer}>
          Réessayer
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, gap: 12 },
  centre: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  centrer: { textAlign: 'center' },
});
```

- [ ] **Step 5: Lancer les tests**

Run: `npm test -- src/composants/composants.test.tsx && npm run typecheck`
Expected: 8 PASS ; `tsc` sans erreur.

- [ ] **Step 6: Commit**

```bash
git add app/test/rendu.tsx app/src/composants
git commit -m "App : composants de base (ligne de match, forme, bandeaux, états)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Actions système (agenda, itinéraire, liens)

**Files:**
- Create: `app/src/actions/actions.ts`, `app/src/actions/actions.test.ts`

**Interfaces:**
- Consumes: types (Task 2), `nomLisible` (Task 5).
- Produces:
  - `urlItineraire(salle: Salle, os?: string): string`, `ouvrirItineraire(salle: Salle): Promise<void>`
  - `evenementAgenda(m: MatchAvecEquipe)` → `{ title, startDate: Date, endDate: Date, location?: string, notes: string, timeZone: 'Europe/Paris' }`
  - `ajouterAgenda(m: MatchAvecEquipe): Promise<unknown>` (écran système d'Android, sans permission)
  - `ouvrirLien(url: string): Promise<unknown>`, `urlAgenda(base: string, equipeId: string): string`, `copier(texte: string): Promise<unknown>`

- [ ] **Step 1: Écrire les tests**

`app/src/actions/actions.test.ts` :

```ts
import * as Calendar from 'expo-calendar';
import { club } from '../../test/donnees';
import { matchParId } from '../donnees/selecteurs';
import { ajouterAgenda, evenementAgenda, urlAgenda, urlItineraire } from './actions';

const salle = { nom: 'GYMNASE DU PETIT CLAMART', adresse: '1 RUE DE L’EXEMPLE 92140 CLAMART' };

test('itinéraire : géo sur Android, Plans sur iOS', () => {
  const q = encodeURIComponent('GYMNASE DU PETIT CLAMART, 1 RUE DE L’EXEMPLE 92140 CLAMART');
  expect(urlItineraire(salle, 'android')).toBe(`geo:0,0?q=${q}`);
  expect(urlItineraire(salle, 'ios')).toBe(`maps:?q=${q}`);
  expect(urlItineraire({ nom: 'VICTOR HUGO', adresse: null }, 'android')).toBe(`geo:0,0?q=${encodeURIComponent('VICTOR HUGO')}`);
});

test('événement d’agenda : match à domicile', () => {
  const m = matchParId(club, '2734038')!;
  const e = evenementAgenda(m);
  expect(e.title).toBe('Clamart Seniors M – Association Sportive St-Cyr/Fontenay Handball 78');
  expect(e.startDate.getTime()).toBe(Date.parse('2026-10-17T18:00:00+02:00'));
  expect(e.endDate.getTime() - e.startDate.getTime()).toBe(90 * 60 * 1000);
  expect(e.location?.startsWith('Gymnase du Petit Clamart')).toBe(true);
  expect(e.notes).toBe(m.url_ffhb);
});

test('événement d’agenda : match à l’extérieur', () => {
  expect(evenementAgenda(matchParId(club, '2729291')!).title).toBe('Cellois HB – Clamart Seniors F 1');
});

test('ajouterAgenda ouvre l’écran système', async () => {
  await ajouterAgenda(matchParId(club, '2729291')!);
  expect(Calendar.createEventInCalendarAsync).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cellois HB – Clamart Seniors F 1' }));
});

test('url de l’agenda d’une équipe', () => {
  expect(urlAgenda('https://x.github.io/clamart-handball/data/agenda/', '32542-clamart-handball-1')).toBe(
    'https://x.github.io/clamart-handball/data/agenda/32542-clamart-handball-1.ics',
  );
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- src/actions/actions.test.ts`
Expected: FAIL, `Cannot find module './actions'`

- [ ] **Step 3: Implémenter `app/src/actions/actions.ts`**

```ts
import * as Calendar from 'expo-calendar';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';
import { nomLisible } from '../donnees/phrase';
import type { MatchAvecEquipe, Salle } from '../donnees/types';

const DUREE_MATCH_MS = 90 * 60 * 1000;
const requeteSalle = (salle: Salle) => [salle.nom, salle.adresse].filter(Boolean).join(', ');

export function urlItineraire(salle: Salle, os: string = Platform.OS): string {
  const q = encodeURIComponent(requeteSalle(salle));
  return os === 'ios' ? `maps:?q=${q}` : `geo:0,0?q=${q}`;
}

export async function ouvrirItineraire(salle: Salle): Promise<void> {
  try {
    await Linking.openURL(urlItineraire(salle));
  } catch {
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(requeteSalle(salle))}`);
  }
}

export function evenementAgenda(m: MatchAvecEquipe) {
  const debut = new Date(m.date!);
  const adversaire = nomLisible(m.adversaire);
  const nous = `Clamart ${m.equipe.nom}`;
  const salle = m.salle?.nom ? [nomLisible(m.salle.nom), m.salle.adresse].filter(Boolean).join(', ') : undefined;
  return {
    title: m.domicile ? `${nous} – ${adversaire}` : `${adversaire} – ${nous}`,
    startDate: debut,
    endDate: new Date(debut.getTime() + DUREE_MATCH_MS),
    location: salle,
    notes: m.url_ffhb,
    timeZone: 'Europe/Paris' as const,
  };
}

/** Ouvre l'écran d'ajout d'événement du téléphone : aucune permission d'agenda n'est demandée. */
export const ajouterAgenda = (m: MatchAvecEquipe) => Calendar.createEventInCalendarAsync(evenementAgenda(m));
export const ouvrirLien = (url: string) => WebBrowser.openBrowserAsync(url);
export const urlAgenda = (base: string, equipeId: string) => `${base}${equipeId}.ics`;
export const copier = (texte: string) => Clipboard.setStringAsync(texte);
```

- [ ] **Step 4: Lancer les tests**

Run: `npm test -- src/actions/actions.test.ts && npm run typecheck`
Expected: 5 PASS ; `tsc` sans erreur.

- [ ] **Step 5: Commit**

```bash
git add app/src/actions
git commit -m "App : agenda, itinéraire et liens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Accueil, premier lancement et coquille de l'app

Première version lançable : routes, polices, cache, thème, barre d'onglets, Accueil et premier lancement.

**Files:**
- Create: `app/src/donnees/resume.ts`, `app/src/donnees/resume.test.ts`, `app/src/composants/CarteEquipe.tsx`, `app/src/composants/BarreOnglets.tsx`, `app/src/ecrans/VueAccueil.tsx`, `app/src/ecrans/VueAccueil.test.tsx`, `app/src/ecrans/VueBienvenue.tsx`, `app/src/ecrans/VueBienvenue.test.tsx`, `app/src/app/_layout.tsx`, `app/src/app/(tabs)/_layout.tsx`, `app/src/app/(tabs)/index.tsx`, `app/src/app/bienvenue.tsx`

**Interfaces:**
- Consumes: Tasks 2–10.
- Produces:
  - `type ResumeCarte = { type: 'resultat'; match; phrase: Phrase } | { type: 'a-venir'; match } | { type: 'en-attente'; match } | { type: 'sans-match'; prochain?: MatchAvecEquipe }`, `resumeCarte(club, collectifId, weekend, maintenant): ResumeCarte`
  - `<CarteEquipe collectif resume equipe? forme onOuvrirEquipe onOuvrirMatch onAgenda />`
  - `<BarreOnglets {...BottomTabBarProps} />`
  - `<VueAccueil club maintenant suivis horsLigne rafraichissement rafraichir onOuvrirEquipe onOuvrirMatch onAgenda onReglages onChoisirEquipes />`
  - `<VueBienvenue club onTerminer(ids: string[]) onPasser />`
  - Routes `/` (Accueil), `/bienvenue`. Les routes `/equipe/[collectif]`, `/match/[id]`, `/reglages`, `/equipes` sont créées en Tasks 13–15 (les boutons qui y mènent existent dès maintenant).

- [ ] **Step 1: Écrire les tests du résumé de carte**

`app/src/donnees/resume.test.ts` :

```ts
import { club, MAR_SOIR, MER_MIDI } from '../../test/donnees';
import { jourLocal, weekendDeReference } from './dates';
import { resumeCarte } from './resume';

const pour = (id: string, maintenant: Date) => resumeCarte(club, id, weekendDeReference(jourLocal(maintenant)), maintenant);

test('résultat du week-end, avec la série', () => {
  const r = pour('seniors-f-1', MAR_SOIR);
  expect(r.type).toBe('resultat');
  if (r.type !== 'resultat') return;
  expect(r.match.id).toBe('2644292');
  expect(r.phrase).toEqual({ titre: 'Victoire contre Ent. Suresnes / Nanterre', sousTitre: '3e victoire de suite' });
});

test('défaite d’un but', () => {
  const r = pour('seniors-m', MAR_SOIR);
  expect(r.type === 'resultat' && r.phrase.titre).toBe("Défaite d'un but contre Levallois SC 1D");
});

test('score pas encore publié', () => {
  expect(pour('u11-mixte-3', MAR_SOIR).type).toBe('en-attente');
});

test('pas de match ce week-end : prochain match, ou rien', () => {
  const avecProchain = pour('u11-mixte-1', MAR_SOIR);
  expect(avecProchain.type === 'sans-match' && avecProchain.prochain?.id).toBe('2710070');
  const sansProchain = pour('u18-m', MER_MIDI); // aucun match les 16-18 oct., aucun match programmé ensuite
  expect(sansProchain).toEqual({ type: 'sans-match', prochain: undefined });
});

test('le mercredi, on montre le match à venir', () => {
  const r = pour('seniors-m', MER_MIDI);
  expect(r.type === 'a-venir' && r.match.id).toBe('2734038');
});

test('le jour du match, avant le coup d’envoi', () => {
  const r = pour('seniors-f-1', new Date('2026-10-11T15:00:00+02:00'));
  expect(r.type === 'a-venir' && r.match.id).toBe('2644292');
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- src/donnees/resume.test.ts`
Expected: FAIL, `Cannot find module './resume'`

- [ ] **Step 3: Implémenter `app/src/donnees/resume.ts`**

```ts
import { jourDuMatch, type Weekend } from './dates';
import { phraseResultat, type Phrase } from './phrase';
import { matchsDuCollectif, prochainMatch, serieEnCours } from './selecteurs';
import type { Club, MatchAvecEquipe } from './types';

export type ResumeCarte =
  | { type: 'resultat'; match: MatchAvecEquipe; phrase: Phrase }
  | { type: 'a-venir'; match: MatchAvecEquipe }
  | { type: 'en-attente'; match: MatchAvecEquipe }
  | { type: 'sans-match'; prochain?: MatchAvecEquipe };

/**
 * Ce que la carte d'une équipe montre pour ce week-end : le dernier match commencé
 * (résultat ou score en attente), sinon le prochain match du week-end, sinon le prochain match connu.
 */
export function resumeCarte(club: Club, collectifId: string, weekend: Weekend, maintenant: Date): ResumeCarte {
  const tous = matchsDuCollectif(club, collectifId);
  const duWeekend = tous.filter(
    (m) => m.date !== null && jourDuMatch(m.date) >= weekend.vendredi && jourDuMatch(m.date) <= weekend.dimanche,
  );
  const commences = duWeekend.filter((m) => Date.parse(m.date!) <= maintenant.getTime());
  const courant = commences[commences.length - 1];
  if (courant) {
    if (courant.resultat === null) return { type: 'en-attente', match: courant };
    const jusquIci = tous.slice(0, tous.indexOf(courant) + 1);
    return { type: 'resultat', match: courant, phrase: phraseResultat(courant, serieEnCours(jusquIci))! };
  }
  if (duWeekend[0]) return { type: 'a-venir', match: duWeekend[0] };
  return { type: 'sans-match', prochain: prochainMatch(club, collectifId, maintenant) };
}
```

- [ ] **Step 4: Lancer les tests**

Run: `npm test -- src/donnees/resume.test.ts`
Expected: 6 PASS.

- [ ] **Step 5: Écrire les tests de l'Accueil et du premier lancement**

`app/src/ecrans/VueAccueil.test.tsx` :

```tsx
import { fireEvent, screen } from '@testing-library/react-native';
import { club, MAR_SOIR } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import { VueAccueil, type PropsAccueil } from './VueAccueil';

function accueil(props: Partial<PropsAccueil> = {}) {
  const p: PropsAccueil = {
    club, maintenant: MAR_SOIR, suivis: ['seniors-f-1', 'seniors-m'], horsLigne: false, rafraichissement: false,
    rafraichir: jest.fn(), onOuvrirEquipe: jest.fn(), onOuvrirMatch: jest.fn(), onAgenda: jest.fn(),
    onReglages: jest.fn(), onChoisirEquipes: jest.fn(), ...props,
  };
  rendu(<VueAccueil {...p} />);
  return p;
}

test('en-tête : salutation, week-end et heure de mise à jour', () => {
  accueil();
  expect(screen.getByText('Bonsoir !')).toBeOnTheScreen();
  expect(screen.getByText('Week-end du 10–11 oct. · mis à jour à 16:41')).toBeOnTheScreen();
});

test('mes équipes : le résultat raconté en une phrase', () => {
  const p = accueil();
  expect(screen.getByText('Victoire contre Ent. Suresnes / Nanterre')).toBeOnTheScreen();
  expect(screen.getByText('3e victoire de suite')).toBeOnTheScreen();
  expect(screen.getByText("Défaite d'un but contre Levallois SC 1D")).toBeOnTheScreen();
  expect(screen.getByText('32–22')).toBeOnTheScreen();
  expect(screen.getByText('3e sur 11')).toBeOnTheScreen();
  fireEvent.press(screen.getAllByText('Voir le match')[0]);
  expect(p.onOuvrirMatch).toHaveBeenCalledWith('2644292');
  fireEvent.press(screen.getByText('Victoire contre Ent. Suresnes / Nanterre'));
  expect(p.onOuvrirEquipe).toHaveBeenCalledWith('seniors-f-1');
});

test('tout le club ce week-end : 11 matchs', () => {
  accueil();
  expect(screen.getByText('11 matchs')).toBeOnTheScreen();
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(11);
});

test('aucune équipe suivie : invitation à choisir', () => {
  const p = accueil({ suivis: [] });
  fireEvent.press(screen.getByText('Choisir mes équipes'));
  expect(p.onChoisirEquipes).toHaveBeenCalled();
});

test('ignore une équipe suivie absente des données', () => {
  accueil({ suivis: ['equipe-disparue', 'seniors-m'] });
  expect(screen.getByText("Défaite d'un but contre Levallois SC 1D")).toBeOnTheScreen();
});

test('match à venir : ajouter à l’agenda', () => {
  const p = accueil({ maintenant: new Date('2026-10-14T12:00:00+02:00'), suivis: ['seniors-m'] });
  expect(screen.getByText('Contre Association Sportive St-Cyr/Fontenay Handball 78')).toBeOnTheScreen();
  expect(screen.getAllByText('18:00').length).toBeGreaterThan(0); // carte + liste du club
  fireEvent.press(screen.getByText("Ajouter à l'agenda"));
  expect(p.onAgenda).toHaveBeenCalledWith(expect.objectContaining({ id: '2734038' }));
});

test('hors saison : pas de match', () => {
  accueil({ maintenant: new Date('2027-07-01T12:00:00+02:00'), suivis: ['seniors-f-1'] });
  expect(screen.getByText('Pas de match ce week-end')).toBeOnTheScreen();
  expect(screen.getByText('Aucun match programmé pour le moment')).toBeOnTheScreen();
  expect(screen.getByText('Aucun match au club ce week-end.')).toBeOnTheScreen();
});

test('hors ligne et réglages', () => {
  const p = accueil({ horsLigne: true });
  expect(screen.getByText('Hors ligne · résultats mis à jour à 16:41')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Réglages'));
  expect(p.onReglages).toHaveBeenCalled();
});
```

`app/src/ecrans/VueBienvenue.test.tsx` :

```tsx
import { fireEvent, screen } from '@testing-library/react-native';
import { club } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import { VueBienvenue } from './VueBienvenue';

test('choisir ses équipes puis continuer', () => {
  const onTerminer = jest.fn();
  rendu(<VueBienvenue club={club} onTerminer={onTerminer} onPasser={jest.fn()} />);
  expect(screen.getByText('Bienvenue au Clamart Handball')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Seniors F 1'));
  fireEvent.press(screen.getByText('U13 M'));
  fireEvent.press(screen.getByText('Continuer (2)'));
  expect(onTerminer).toHaveBeenCalledWith(['seniors-f-1', 'u13-m']);
});

test('une deuxième pression retire l’équipe', () => {
  const onTerminer = jest.fn();
  rendu(<VueBienvenue club={club} onTerminer={onTerminer} onPasser={jest.fn()} />);
  fireEvent.press(screen.getByText('U18 F'));
  fireEvent.press(screen.getByText('U18 F'));
  fireEvent.press(screen.getByText('Continuer'));
  expect(onTerminer).toHaveBeenCalledWith([]);
});

test('passer', () => {
  const onPasser = jest.fn();
  rendu(<VueBienvenue club={club} onTerminer={jest.fn()} onPasser={onPasser} />);
  fireEvent.press(screen.getByText('Passer'));
  expect(onPasser).toHaveBeenCalled();
});
```

- [ ] **Step 6: Lancer pour vérifier l'échec**

Run: `npm test -- src/ecrans`
Expected: FAIL, `Cannot find module './VueAccueil'`

- [ ] **Step 7: Implémenter la carte d'équipe**

`app/src/composants/CarteEquipe.tsx` :

```tsx
import { StyleSheet, View } from 'react-native';
import { Button, Surface, Text, TouchableRipple } from 'react-native-paper';
import { heureDuMatch, jourDuMatch, libelleJour } from '../donnees/dates';
import { nomLisible, ordinal, scoreTexte } from '../donnees/phrase';
import type { ResumeCarte } from '../donnees/resume';
import type { Collectif, Equipe, Match, MatchAvecEquipe, Resultat } from '../donnees/types';
import { useThemeClub } from '../theme/theme';
import { Forme } from './PastilleResultat';

interface Props {
  collectif: Collectif;
  resume: ResumeCarte;
  equipe?: Equipe;
  forme: Resultat[];
  onOuvrirEquipe: () => void;
  onOuvrirMatch: (id: string) => void;
  onAgenda: (m: MatchAvecEquipe) => void;
}

const lieu = (m: Match) =>
  [m.salle?.nom ? nomLisible(m.salle.nom) : undefined, m.domicile ? 'domicile' : 'extérieur'].filter(Boolean).join(' · ');

function contenu(r: ResumeCarte) {
  switch (r.type) {
    case 'resultat':
      return {
        quand: libelleJour(jourDuMatch(r.match.date!), 'long'),
        titre: r.phrase.titre,
        sousTitre: r.phrase.sousTitre,
        droite: scoreTexte(r.match),
        droiteLue: `${r.match.score_nous} à ${r.match.score_eux}`,
        meta: lieu(r.match),
      };
    case 'en-attente':
      return {
        quand: libelleJour(jourDuMatch(r.match.date!), 'long'),
        titre: `Contre ${nomLisible(r.match.adversaire)}`,
        droite: '–',
        droiteLue: 'score inconnu',
        meta: 'Score pas encore publié',
      };
    case 'a-venir':
      return {
        quand: libelleJour(jourDuMatch(r.match.date!), 'long'),
        titre: `Contre ${nomLisible(r.match.adversaire)}`,
        droite: heureDuMatch(r.match.date!),
        droiteLue: `à ${heureDuMatch(r.match.date!)}`,
        meta: lieu(r.match),
      };
    case 'sans-match':
      return {
        quand: 'ce week-end',
        titre: 'Pas de match ce week-end',
        meta: r.prochain?.date
          ? `Prochain : ${libelleJour(jourDuMatch(r.prochain.date))} à ${heureDuMatch(r.prochain.date)}`
          : 'Aucun match programmé pour le moment',
      };
  }
}

export function CarteEquipe({ collectif, resume, equipe, forme, onOuvrirEquipe, onOuvrirMatch, onAgenda }: Props) {
  const t = useThemeClub();
  const c: { quand: string; titre: string; sousTitre?: string; droite?: string; droiteLue?: string; meta?: string } = contenu(resume);
  return (
    <Surface style={[styles.carte, { borderRadius: t.rayonCarte }]} elevation={1}>
      <TouchableRipple
        onPress={onOuvrirEquipe}
        borderless
        style={{ borderRadius: t.rayonCarte }}
        accessibilityRole="button"
        accessibilityLabel={`${collectif.nom}, ${c.quand} : ${c.titre}${c.droiteLue ? `, ${c.droiteLue}` : ''}`}
      >
        <View style={styles.interieur}>
          <Text variant="labelLarge" style={{ color: t.colors.onSurfaceVariant }}>
            {`${collectif.nom} · ${c.quand}`}
          </Text>
          <View style={styles.ligne}>
            <View style={styles.texte}>
              <Text variant="titleLarge" numberOfLines={2} style={{ color: t.club.titre }}>
                {c.titre}
              </Text>
              {c.sousTitre ? (
                <Text variant="bodyMedium" style={{ color: t.club.victoire.texte }}>
                  {c.sousTitre}
                </Text>
              ) : null}
            </View>
            {c.droite ? (
              <Text variant="headlineSmall" style={[styles.score, { color: t.club.titre }]}>
                {c.droite}
              </Text>
            ) : null}
          </View>
          {c.meta ? (
            <Text variant="bodyMedium" numberOfLines={2} style={{ color: t.colors.onSurfaceVariant }}>
              {c.meta}
            </Text>
          ) : null}
          <View style={styles.pied}>
            <Forme resultats={forme} />
            {equipe?.place ? (
              <Text variant="labelLarge" style={{ color: t.colors.onSurfaceVariant }}>
                {`${ordinal(equipe.place)} sur ${equipe.nb_equipes}`}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableRipple>
      {resume.type === 'resultat' ? (
        <Button mode="text" style={styles.action} onPress={() => onOuvrirMatch(resume.match.id)}>
          Voir le match
        </Button>
      ) : null}
      {resume.type === 'a-venir' ? (
        <Button mode="contained" icon="calendar-plus" style={styles.action} onPress={() => onAgenda(resume.match)}>
          Ajouter à l'agenda
        </Button>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  carte: { marginBottom: 12 },
  interieur: { padding: 16, gap: 6 },
  ligne: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  texte: { flex: 1, gap: 2 },
  score: { fontVariant: ['tabular-nums'] },
  pied: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  action: { alignSelf: 'flex-start', marginHorizontal: 12, marginBottom: 12 },
});
```

- [ ] **Step 8: Implémenter l'Accueil et le premier lancement**

`app/src/ecrans/VueAccueil.tsx` :

```tsx
import { Image, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Surface, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BandeauEtat } from '../composants/BandeauEtat';
import { CarteEquipe } from '../composants/CarteEquipe';
import { EnTeteSection } from '../composants/EnTeteSection';
import { LigneMatch } from '../composants/LigneMatch';
import { jourLocal, libelleMiseAJour, libelleWeekend, salutation, weekendDeReference } from '../donnees/dates';
import { resumeCarte } from '../donnees/resume';
import { equipePrincipale, formeRecente, matchsDuCollectif, matchsDuWeekend } from '../donnees/selecteurs';
import type { Club, MatchAvecEquipe } from '../donnees/types';
import { useThemeClub } from '../theme/theme';

const LOGO = require('../../assets/logo-clamart.png');

export interface PropsAccueil {
  club: Club;
  maintenant: Date;
  suivis: string[];
  horsLigne: boolean;
  rafraichissement: boolean;
  rafraichir: () => void;
  onOuvrirEquipe: (id: string) => void;
  onOuvrirMatch: (id: string) => void;
  onAgenda: (m: MatchAvecEquipe) => void;
  onReglages: () => void;
  onChoisirEquipes: () => void;
}

export function VueAccueil(p: PropsAccueil) {
  const t = useThemeClub();
  const haut = useSafeAreaInsets().top;
  const weekend = weekendDeReference(jourLocal(p.maintenant));
  const miens = p.club.collectifs.filter((c) => p.suivis.includes(c.id));
  const duClub = matchsDuWeekend(p.club, weekend);

  return (
    <ScrollView
      style={{ backgroundColor: t.colors.background }}
      contentContainerStyle={[styles.contenu, { paddingTop: haut + 12 }]}
      refreshControl={<RefreshControl refreshing={p.rafraichissement} onRefresh={p.rafraichir} colors={[t.colors.primary]} />}
    >
      <View style={styles.entete}>
        <Image source={LOGO} style={styles.logo} accessible accessibilityLabel="Écusson du Clamart Handball" accessibilityIgnoresInvertColors />
        <View style={styles.titres}>
          <Text variant="headlineSmall" style={{ color: t.club.titre }} accessibilityRole="header">
            {salutation(p.maintenant)}
          </Text>
          <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>
            {`Week-end du ${libelleWeekend(weekend)} · ${libelleMiseAJour(p.club.mis_a_jour, p.maintenant)}`}
          </Text>
        </View>
        <IconButton icon="cog-outline" accessibilityLabel="Réglages" onPress={p.onReglages} />
      </View>

      <BandeauEtat horsLigne={p.horsLigne} miseAJour={p.club.mis_a_jour} maintenant={p.maintenant} />

      <EnTeteSection titre="Mes équipes" />
      {miens.length === 0 ? (
        <Surface style={[styles.invitation, { borderRadius: t.rayonCarte }]} elevation={1}>
          <Text variant="titleMedium" style={{ color: t.club.titre }}>
            Suivez vos équipes
          </Text>
          <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>
            Leurs résultats et leurs prochains matchs s'afficheront ici en premier.
          </Text>
          <Button mode="contained" style={styles.bouton} onPress={p.onChoisirEquipes}>
            Choisir mes équipes
          </Button>
        </Surface>
      ) : (
        miens.map((c) => (
          <CarteEquipe
            key={c.id}
            collectif={c}
            resume={resumeCarte(p.club, c.id, weekend, p.maintenant)}
            equipe={equipePrincipale(p.club, c.id)}
            forme={formeRecente(matchsDuCollectif(p.club, c.id))}
            onOuvrirEquipe={() => p.onOuvrirEquipe(c.id)}
            onOuvrirMatch={p.onOuvrirMatch}
            onAgenda={p.onAgenda}
          />
        ))
      )}

      <EnTeteSection
        titre="Tout le club ce week-end"
        detail={duClub.length ? `${duClub.length} match${duClub.length > 1 ? 's' : ''}` : undefined}
      />
      <Surface style={[styles.liste, { borderRadius: t.rayonCarte }]} elevation={1}>
        {duClub.length === 0 ? (
          <Text variant="bodyMedium" style={[styles.vide, { color: t.colors.onSurfaceVariant }]}>
            Aucun match au club ce week-end.
          </Text>
        ) : (
          duClub.map((m) => (
            <LigneMatch key={`${m.equipe.id}-${m.id}`} match={m} maintenant={p.maintenant} onPress={() => p.onOuvrirMatch(m.id)} />
          ))
        )}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  entete: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 48, height: 48, borderRadius: 24 },
  titres: { flex: 1 },
  invitation: { padding: 16, gap: 6 },
  bouton: { alignSelf: 'flex-start', marginTop: 8 },
  liste: { overflow: 'hidden' },
  vide: { padding: 16 },
});
```

`app/src/ecrans/VueBienvenue.tsx` :

```tsx
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collectifsParCategorie } from '../donnees/selecteurs';
import type { Club } from '../donnees/types';
import { useThemeClub } from '../theme/theme';

const LOGO = require('../../assets/logo-clamart.png');

interface Props {
  club: Club;
  onTerminer: (ids: string[]) => void;
  onPasser: () => void;
}

export function VueBienvenue({ club, onTerminer, onPasser }: Props) {
  const t = useThemeClub();
  const encarts = useSafeAreaInsets();
  const [choisis, setChoisis] = useState<string[]>([]);
  const basculer = (id: string) => setChoisis((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <View style={[styles.page, { backgroundColor: t.colors.background, paddingTop: encarts.top + 24, paddingBottom: encarts.bottom + 16 }]}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Image source={LOGO} style={styles.logo} accessible accessibilityLabel="Écusson du Clamart Handball" accessibilityIgnoresInvertColors />
        <Text variant="headlineSmall" style={[styles.centrer, { color: t.club.titre }]} accessibilityRole="header">
          Bienvenue au Clamart Handball
        </Text>
        <Text variant="bodyLarge" style={[styles.centrer, { color: t.colors.onSurfaceVariant }]}>
          Quelles équipes suivez-vous ? Leurs résultats s'afficheront en premier.
        </Text>
        {collectifsParCategorie(club).map((g) => (
          <View key={g.categorie} style={styles.groupe}>
            <Text variant="titleMedium" style={{ color: t.club.titre }}>
              {g.titre}
            </Text>
            <View style={styles.puces}>
              {g.collectifs.map((c) => (
                <Chip key={c.id} selected={choisis.includes(c.id)} showSelectedOverlay onPress={() => basculer(c.id)}>
                  {c.nom}
                </Chip>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.actions}>
        <Button mode="contained" onPress={() => onTerminer(choisis)}>
          {choisis.length ? `Continuer (${choisis.length})` : 'Continuer'}
        </Button>
        <Button mode="text" onPress={onPasser}>
          Passer
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16 },
  contenu: { gap: 16, paddingBottom: 16 },
  logo: { width: 96, height: 96, borderRadius: 48, alignSelf: 'center' },
  centrer: { textAlign: 'center' },
  groupe: { gap: 8 },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { gap: 4 },
});
```

- [ ] **Step 9: Lancer les tests des écrans**

Run: `npm test -- src/ecrans && npm run typecheck`
Expected: 11 PASS ; `tsc` sans erreur.

- [ ] **Step 10: Barre d'onglets Material 3**

`app/src/composants/BarreOnglets.tsx` :

```tsx
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { BottomNavigation } from 'react-native-paper';

/** Barre de navigation Material 3 de react-native-paper, branchée sur les onglets d'expo-router. */
export function BarreOnglets({ navigation, state, descriptors, insets }: BottomTabBarProps) {
  return (
    <BottomNavigation.Bar
      navigationState={state}
      safeAreaInsets={insets}
      onTabPress={({ route, preventDefault }) => {
        const evenement = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (evenement.defaultPrevented) preventDefault();
        else navigation.dispatch({ ...CommonActions.navigate(route.name, route.params), target: state.key });
      }}
      renderIcon={({ route, focused, color }) =>
        descriptors[route.key].options.tabBarIcon?.({ focused, color, size: 24 }) ?? null
      }
      getLabelText={({ route }) => (descriptors[route.key].options.title as string | undefined) ?? route.name}
    />
  );
}
```

Si `tsc` signale que `@react-navigation/bottom-tabs` n'est pas une dépendance directe, l'ajouter : `npx expo install @react-navigation/bottom-tabs @react-navigation/native`.

- [ ] **Step 11: Routes et fournisseurs**

`app/src/app/_layout.tsx` :

```tsx
import { Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { brancherPremierPlan, creerClientRequetes, persisteur, UN_MOIS } from '../donnees/requetes';
import { themeClair, themeSombre } from '../theme/theme';

SplashScreen.preventAutoHideAsync();

export default function Racine() {
  const [client] = useState(creerClientRequetes);
  const [polices, erreurPolices] = useFonts({ Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold });
  const sombre = useColorScheme() === 'dark';
  const pret = polices || erreurPolices !== null;

  useEffect(() => brancherPremierPlan(), []);
  useEffect(() => {
    if (pret) SplashScreen.hideAsync();
  }, [pret]);
  if (!pret) return null;

  const theme = sombre ? themeSombre : themeClair;
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={client} persistOptions={{ persister: persisteur, maxAge: UN_MOIS }}>
        <PaperProvider theme={theme}>
          <StatusBar style={sombre ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }} />
        </PaperProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
```

`app/src/app/(tabs)/_layout.tsx` :

```tsx
import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Icon } from 'react-native-paper';
import { BarreOnglets } from '../../composants/BarreOnglets';
import { useClub } from '../../donnees/requetes';
import { useSuivi, useSuiviPret } from '../../suivi/suivi';

const icone = (plein: string, vide: string) =>
  ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Icon source={focused ? plein : vide} color={color} size={size} />
  );

export default function Onglets() {
  const pret = useSuiviPret();
  const bienvenueFaite = useSuivi((s) => s.bienvenueFaite);
  const { club } = useClub();

  useEffect(() => {
    if (club) useSuivi.getState().retirerInconnus(club.collectifs.map((c) => c.id));
  }, [club]);

  if (!pret) return null;
  if (!bienvenueFaite) return <Redirect href="/bienvenue" />;
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BarreOnglets {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: icone('home-variant', 'home-variant-outline') }} />
    </Tabs>
  );
}
```

`app/src/app/(tabs)/index.tsx` :

```tsx
import { useRouter } from 'expo-router';
import { ajouterAgenda } from '../../actions/actions';
import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { useMaintenant } from '../../donnees/maintenant';
import { useClub } from '../../donnees/requetes';
import { VueAccueil } from '../../ecrans/VueAccueil';
import { useSuivi } from '../../suivi/suivi';

export default function Accueil() {
  const { club, chargement, erreur, horsLigne, rafraichir, rafraichissement } = useClub();
  const maintenant = useMaintenant();
  const suivis = useSuivi((s) => s.suivis);
  const routeur = useRouter();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <VueAccueil
      club={club}
      maintenant={maintenant}
      suivis={suivis}
      horsLigne={horsLigne}
      rafraichissement={rafraichissement}
      rafraichir={rafraichir}
      onOuvrirEquipe={(id) => routeur.push(`/equipe/${id}`)}
      onOuvrirMatch={(id) => routeur.push(`/match/${id}`)}
      onAgenda={ajouterAgenda}
      onReglages={() => routeur.push('/reglages')}
      onChoisirEquipes={() => routeur.push('/equipes')}
    />
  );
}
```

`app/src/app/bienvenue.tsx` :

```tsx
import { useRouter } from 'expo-router';
import { EtatSansDonnees } from '../composants/EtatSansDonnees';
import { useClub } from '../donnees/requetes';
import { VueBienvenue } from '../ecrans/VueBienvenue';
import { useSuivi } from '../suivi/suivi';

export default function Bienvenue() {
  const { club, chargement, erreur, rafraichir } = useClub();
  const routeur = useRouter();
  const { definirSuivis, terminerBienvenue } = useSuivi.getState();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  const terminer = (ids: string[]) => {
    definirSuivis(ids);
    terminerBienvenue();
    routeur.replace('/');
  };
  return <VueBienvenue club={club} onTerminer={terminer} onPasser={() => terminer([])} />;
}
```

- [ ] **Step 12: Lancer toute la suite et le contrôle de types**

Run: `npm test && npm run typecheck`
Expected: tous les tests PASS ; `tsc` sans erreur.

- [ ] **Step 13: Lancer l'app sur l'émulateur**

```bash
emulator -avd Pixel_8_API_35 &
cd /e/MobileApp/app && npx expo start --android
```

Expected: Expo Go s'installe sur l'émulateur et ouvre l'app ; l'écran de bienvenue liste les 11 équipes ; après « Continuer », l'Accueil affiche les cartes et « Tout le club ce week-end » avec les vraies données en ligne. Les boutons vers Matchs/Équipes/match ne mènent pas encore à un écran (Tasks 12–15).

- [ ] **Step 14: Commit**

```bash
git add app/src
git commit -m "App : Accueil, premier lancement, coquille et barre d'onglets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Onglet Matchs

**Files:**
- Create: `app/src/ecrans/VueMatchs.tsx`, `app/src/ecrans/VueMatchs.test.tsx`, `app/src/app/(tabs)/matchs.tsx`
- Modify: `app/src/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: sélecteurs (`joursAvecMatchs`, `jourParDefaut`, `matchsDuJour`, `grouperParCategorie`), `LigneMatch`, `EnTeteSection`, dates.
- Produces: `<VueMatchs club maintenant suivis onOuvrirMatch rafraichir? rafraichissement? />` (tirer pour rafraîchir), route `/matchs`.

- [ ] **Step 1: Écrire les tests**

`app/src/ecrans/VueMatchs.test.tsx` :

```tsx
import { fireEvent, screen } from '@testing-library/react-native';
import { club, DIM_SOIR } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import type { Club } from '../donnees/types';
import { VueMatchs } from './VueMatchs';

const matchs = (props: Partial<Parameters<typeof VueMatchs>[0]> = {}) =>
  rendu(<VueMatchs club={club} maintenant={DIM_SOIR} suivis={[]} onOuvrirMatch={jest.fn()} {...props} />);

test('jour par défaut : aujourd’hui, tout le club', () => {
  matchs();
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(4);
  expect(screen.getByText('Seniors')).toBeOnTheScreen();
  expect(screen.getByText('U13')).toBeOnTheScreen();
  expect(screen.getByText('U11')).toBeOnTheScreen();
});

test('changer de jour', () => {
  matchs();
  fireEvent.press(screen.getByText('sam. 10 oct.'));
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(7);
});

test('mes équipes par défaut quand on en suit', () => {
  matchs({ suivis: ['seniors-f-1'] });
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(1);
});

test('aucun match de mes équipes ce jour-là', () => {
  matchs({ suivis: ['u18-m'] });
  expect(screen.getByText('Aucun match de vos équipes ce jour-là.')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Voir tout le club'));
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(4);
});

test('aucun match daté', () => {
  const horsSaison: Club = { ...club, equipes: club.equipes.map((e) => ({ ...e, matchs: [] })) };
  matchs({ club: horsSaison });
  expect(screen.getByText('Aucun match programmé pour le moment.')).toBeOnTheScreen();
});

test('ouvrir un match', () => {
  const onOuvrirMatch = jest.fn();
  matchs({ onOuvrirMatch });
  fireEvent.press(screen.getAllByTestId('ligne-match')[0]);
  expect(onOuvrirMatch).toHaveBeenCalled();
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- src/ecrans/VueMatchs.test.tsx`
Expected: FAIL, `Cannot find module './VueMatchs'`

- [ ] **Step 3: Implémenter `app/src/ecrans/VueMatchs.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Chip, SegmentedButtons, Surface, Text } from 'react-native-paper';
import { EnTeteSection } from '../composants/EnTeteSection';
import { LigneMatch } from '../composants/LigneMatch';
import { jourLocal, libelleJour } from '../donnees/dates';
import { grouperParCategorie, jourParDefaut, joursAvecMatchs, matchsDuJour } from '../donnees/selecteurs';
import type { Club } from '../donnees/types';
import { useThemeClub } from '../theme/theme';

interface Props {
  club: Club;
  maintenant: Date;
  suivis: string[];
  onOuvrirMatch: (id: string) => void;
  rafraichir?: () => void;
  rafraichissement?: boolean;
}

type Filtre = 'mes' | 'tous';

export function VueMatchs({ club, maintenant, suivis, onOuvrirMatch, rafraichir, rafraichissement = false }: Props) {
  const t = useThemeClub();
  const jours = useMemo(() => joursAvecMatchs(club), [club]);
  const [jour, setJour] = useState(() => jourParDefaut(jours, jourLocal(maintenant)));
  const [filtre, setFiltre] = useState<Filtre>(suivis.length ? 'mes' : 'tous');
  const matchs = jour
    ? matchsDuJour(club, jour).filter((m) => filtre === 'tous' || suivis.includes(m.equipe.collectif))
    : [];
  const groupes = grouperParCategorie(matchs);

  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: t.colors.background }}>
        <Appbar.Content title="Matchs" titleStyle={{ color: t.club.titre }} />
      </Appbar.Header>
      {jours.length > 0 ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.barreJours} contentContainerStyle={styles.jours}>
            {jours.map((j) => (
              <Chip key={j} selected={j === jour} showSelectedOverlay onPress={() => setJour(j)}>
                {libelleJour(j)}
              </Chip>
            ))}
          </ScrollView>
          <SegmentedButtons
            style={styles.filtre}
            value={filtre}
            onValueChange={(v) => setFiltre(v as Filtre)}
            buttons={[
              { value: 'mes', label: 'Mes équipes' },
              { value: 'tous', label: 'Tout le club' },
            ]}
          />
        </>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.contenu}
        refreshControl={rafraichir ? <RefreshControl refreshing={rafraichissement} onRefresh={rafraichir} colors={[t.colors.primary]} /> : undefined}
      >
        {groupes.length === 0 ? (
          <View style={styles.vide}>
            <Text variant="bodyLarge" style={[styles.centrer, { color: t.colors.onSurfaceVariant }]}>
              {jours.length === 0 ? 'Aucun match programmé pour le moment.' : 'Aucun match de vos équipes ce jour-là.'}
            </Text>
            {jours.length > 0 && filtre === 'mes' ? (
              <Button mode="text" onPress={() => setFiltre('tous')}>
                Voir tout le club
              </Button>
            ) : null}
          </View>
        ) : (
          groupes.map((g) => (
            <View key={g.categorie}>
              <EnTeteSection titre={g.titre} />
              <Surface style={[styles.liste, { borderRadius: t.rayonCarte }]} elevation={1}>
                {g.matchs.map((m) => (
                  <LigneMatch key={`${m.equipe.id}-${m.id}`} match={m} maintenant={maintenant} afficherCompetition onPress={() => onOuvrirMatch(m.id)} />
                ))}
              </Surface>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  barreJours: { flexGrow: 0 },
  jours: { gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  filtre: { marginHorizontal: 16, marginTop: 12 },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  liste: { overflow: 'hidden' },
  vide: { paddingTop: 48, alignItems: 'center', gap: 8 },
  centrer: { textAlign: 'center' },
});
```

- [ ] **Step 4: Route et onglet**

`app/src/app/(tabs)/matchs.tsx` :

```tsx
import { useRouter } from 'expo-router';
import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { useMaintenant } from '../../donnees/maintenant';
import { useClub } from '../../donnees/requetes';
import { VueMatchs } from '../../ecrans/VueMatchs';
import { useSuivi } from '../../suivi/suivi';

export default function Matchs() {
  const { club, chargement, erreur, rafraichir, rafraichissement } = useClub();
  const maintenant = useMaintenant();
  const suivis = useSuivi((s) => s.suivis);
  const routeur = useRouter();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <VueMatchs
      club={club}
      maintenant={maintenant}
      suivis={suivis}
      onOuvrirMatch={(id) => routeur.push(`/match/${id}`)}
      rafraichir={rafraichir}
      rafraichissement={rafraichissement}
    />
  );
}
```

Dans `app/src/app/(tabs)/_layout.tsx`, après l'écran `index`, ajouter :

```tsx
      <Tabs.Screen name="matchs" options={{ title: 'Matchs', tabBarIcon: icone('calendar-month', 'calendar-month-outline') }} />
```

- [ ] **Step 5: Lancer les tests**

Run: `npm test -- src/ecrans/VueMatchs.test.tsx && npm run typecheck`
Expected: 6 PASS ; `tsc` sans erreur.

- [ ] **Step 6: Commit**

```bash
git add app/src
git commit -m "App : onglet Matchs par jour, filtre mes équipes / tout le club

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Équipes et fiche équipe

**Files:**
- Create: `app/src/ecrans/VueEquipes.tsx`, `app/src/ecrans/VueEquipe.tsx`, `app/src/ecrans/equipes.test.tsx`, `app/src/app/(tabs)/equipes.tsx`, `app/src/app/equipe/[collectif].tsx`
- Modify: `app/src/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: sélecteurs (`collectifsParCategorie`, `equipesDuCollectif`, `equipePrincipale`, `matchsDuCollectif`, `buteursDuCollectif`), `nomLisible`, `ordinal`, `LigneMatch`, `EnTeteSection`, `copier`, `urlAgenda`, `URL_AGENDAS`, `useSuivi`.
- Produces: `<VueEquipes club suivis onBasculer(id) onOuvrirEquipe(id) />`, `<VueEquipe club collectifId maintenant suivi onBasculer onOuvrirMatch(id) onRetour onCopierAgenda(e: Equipe): Promise<unknown> />`, routes `/equipes` et `/equipe/[collectif]`.

- [ ] **Step 1: Écrire les tests**

`app/src/ecrans/equipes.test.tsx` :

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { club, MAR_SOIR } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import { matchsDuCollectif } from '../donnees/selecteurs';
import { VueEquipe } from './VueEquipe';
import { VueEquipes } from './VueEquipes';

test('liste des équipes par catégorie, avec la cloche suivre', () => {
  const onBasculer = jest.fn();
  const onOuvrirEquipe = jest.fn();
  rendu(<VueEquipes club={club} suivis={['seniors-f-1']} onBasculer={onBasculer} onOuvrirEquipe={onOuvrirEquipe} />);
  expect(screen.getByText('U18')).toBeOnTheScreen();
  expect(screen.getByText(/D2 territoriale · .*Coupe de France départementale/)).toBeOnTheScreen();
  expect(screen.getByLabelText('Ne plus suivre Seniors F 1')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Suivre Seniors M'));
  expect(onBasculer).toHaveBeenCalledWith('seniors-m');
  fireEvent.press(screen.getByText('U15 M'));
  expect(onOuvrirEquipe).toHaveBeenCalledWith('u15-m');
});

function fiche(collectifId: string, props: Partial<Parameters<typeof VueEquipe>[0]> = {}) {
  const p = {
    club, collectifId, maintenant: MAR_SOIR, suivi: false, onBasculer: jest.fn(), onOuvrirMatch: jest.fn(),
    onRetour: jest.fn(), onCopierAgenda: jest.fn(() => Promise.resolve(true)), ...props,
  };
  rendu(<VueEquipe {...p} />);
  return p;
}

test('fiche équipe : tous les matchs de la saison', () => {
  fiche('seniors-f-1');
  expect(screen.getByText('Seniors F 1')).toBeOnTheScreen();
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(matchsDuCollectif(club, 'seniors-f-1').length);
});

test('fiche équipe : classement avec la ligne du club', () => {
  fiche('seniors-f-1');
  fireEvent.press(screen.getByText('Classement'));
  expect(screen.getByText('Martigua SCL')).toBeOnTheScreen();
  expect(screen.getByLabelText(/^3e, Clamart Handball 1, 13 points/)).toBeOnTheScreen();
});

test('fiche équipe : buteurs pour les seniors, jamais pour les jeunes', () => {
  fiche('seniors-f-1');
  fireEvent.press(screen.getByText('Buteurs'));
  expect(screen.getByText('Diara DORILAS')).toBeOnTheScreen();
  expect(screen.getByText('38')).toBeOnTheScreen();
  screen.unmount();
  fiche('u18-f');
  expect(screen.queryByText('Buteurs')).toBeNull();
});

test('fiche équipe : suivre, copier l’agenda, retour', async () => {
  const p = fiche('seniors-m', { suivi: true });
  fireEvent.press(screen.getByLabelText('Ne plus suivre Seniors M'));
  expect(p.onBasculer).toHaveBeenCalled();
  fireEvent.press(screen.getAllByText('Copier le lien')[0]);
  expect(p.onCopierAgenda).toHaveBeenCalledWith(expect.objectContaining({ id: '32546-clamart-handball' }));
  await waitFor(() => expect(screen.getByText("Lien de l'agenda copié")).toBeOnTheScreen());
  fireEvent.press(screen.getByLabelText('Retour'));
  expect(p.onRetour).toHaveBeenCalled();
});

test('fiche équipe introuvable', () => {
  fiche('equipe-disparue');
  expect(screen.getByText('Équipe introuvable')).toBeOnTheScreen();
});
```

Note : `13 points` est la valeur du club dans la fixture (Seniors F 1, 3e ; au handball, victoire = 3 points, défaite = 1). Si le test échoue sur ce nombre, lire `points` de la ligne `nous: true` du classement de `32542-clamart-handball-1` dans `partage/fixtures/club-2026-10-13.json` et corriger l'attendu, pas le code.

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- src/ecrans/equipes.test.tsx`
Expected: FAIL, `Cannot find module './VueEquipe'`

- [ ] **Step 3: Implémenter `app/src/ecrans/VueEquipes.tsx`**

```tsx
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, IconButton, List, Surface } from 'react-native-paper';
import { EnTeteSection } from '../composants/EnTeteSection';
import { ordinal } from '../donnees/phrase';
import { collectifsParCategorie, equipePrincipale, equipesDuCollectif } from '../donnees/selecteurs';
import type { Club } from '../donnees/types';
import { POLICES, useThemeClub } from '../theme/theme';

interface Props {
  club: Club;
  suivis: string[];
  onBasculer: (id: string) => void;
  onOuvrirEquipe: (id: string) => void;
}

export function VueEquipes({ club, suivis, onBasculer, onOuvrirEquipe }: Props) {
  const t = useThemeClub();
  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: t.colors.background }}>
        <Appbar.Content title="Équipes" titleStyle={{ color: t.club.titre }} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.contenu}>
        {collectifsParCategorie(club).map((g) => (
          <View key={g.categorie}>
            <EnTeteSection titre={g.titre} />
            <Surface style={[styles.liste, { borderRadius: t.rayonCarte }]} elevation={1}>
              {g.collectifs.map((c) => {
                const suivi = suivis.includes(c.id);
                const principale = equipePrincipale(club, c.id);
                const details = [...new Set(equipesDuCollectif(club, c.id).map((e) => e.detail))].join(' · ');
                const place = principale?.place ? `\n${ordinal(principale.place)} sur ${principale.nb_equipes}` : '';
                return (
                  <List.Item
                    key={c.id}
                    title={c.nom}
                    titleStyle={{ fontFamily: POLICES.gras, color: t.club.titre }}
                    description={`${details}${place}`}
                    descriptionNumberOfLines={3}
                    onPress={() => onOuvrirEquipe(c.id)}
                    right={() => (
                      <IconButton
                        icon={suivi ? 'bell' : 'bell-outline'}
                        iconColor={suivi ? t.colors.primary : t.colors.onSurfaceVariant}
                        accessibilityLabel={suivi ? `Ne plus suivre ${c.nom}` : `Suivre ${c.nom}`}
                        onPress={() => onBasculer(c.id)}
                      />
                    )}
                  />
                );
              })}
            </Surface>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  liste: { overflow: 'hidden' },
});
```

- [ ] **Step 4: Implémenter `app/src/ecrans/VueEquipe.tsx`**

```tsx
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, List, SegmentedButtons, Snackbar, Surface, Text } from 'react-native-paper';
import { EnTeteSection } from '../composants/EnTeteSection';
import { LigneMatch } from '../composants/LigneMatch';
import { nomLisible, ordinal } from '../donnees/phrase';
import { buteursDuCollectif, equipePrincipale, equipesDuCollectif, matchsDuCollectif } from '../donnees/selecteurs';
import type { Club, Equipe } from '../donnees/types';
import { POLICES, useThemeClub } from '../theme/theme';

interface Props {
  club: Club;
  collectifId: string;
  maintenant: Date;
  suivi: boolean;
  onBasculer: () => void;
  onOuvrirMatch: (id: string) => void;
  onRetour: () => void;
  onCopierAgenda: (e: Equipe) => Promise<unknown>;
}

type Onglet = 'matchs' | 'classement' | 'buteurs';

export function VueEquipe({ club, collectifId, maintenant, suivi, onBasculer, onOuvrirMatch, onRetour, onCopierAgenda }: Props) {
  const t = useThemeClub();
  const [onglet, setOnglet] = useState<Onglet>('matchs');
  const [copie, setCopie] = useState(false);
  const collectif = club.collectifs.find((c) => c.id === collectifId);

  if (!collectif) {
    return (
      <View style={[styles.page, { backgroundColor: t.colors.background }]}>
        <Appbar.Header style={{ backgroundColor: t.colors.background }}>
          <Appbar.BackAction onPress={onRetour} accessibilityLabel="Retour" />
        </Appbar.Header>
        <View style={styles.vide}>
          <Text variant="titleLarge" style={{ color: t.club.titre }}>Équipe introuvable</Text>
          <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>Elle ne figure plus dans les résultats de la saison.</Text>
        </View>
      </View>
    );
  }

  const equipes = equipesDuCollectif(club, collectifId);
  const principale = equipePrincipale(club, collectifId);
  const avecButeurs = equipes.some((e) => e.stats_joueurs);
  const onglets = [
    { value: 'matchs', label: 'Matchs' },
    { value: 'classement', label: 'Classement' },
    ...(avecButeurs ? [{ value: 'buteurs', label: 'Buteurs' }] : []),
  ];
  const copier = async (e: Equipe) => {
    await onCopierAgenda(e);
    setCopie(true);
  };

  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: t.colors.background }}>
        <Appbar.BackAction onPress={onRetour} accessibilityLabel="Retour" />
        <Appbar.Content title={collectif.nom} titleStyle={{ color: t.club.titre }} />
        <Appbar.Action
          icon={suivi ? 'bell' : 'bell-outline'}
          color={suivi ? t.colors.primary : t.colors.onSurfaceVariant}
          accessibilityLabel={suivi ? `Ne plus suivre ${collectif.nom}` : `Suivre ${collectif.nom}`}
          onPress={onBasculer}
        />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>
          {[...new Set(equipes.map((e) => e.detail))].join(' · ')}
          {principale?.place ? ` · ${ordinal(principale.place)} sur ${principale.nb_equipes}` : ''}
        </Text>
        <SegmentedButtons style={styles.onglets} value={onglet} onValueChange={(v) => setOnglet(v as Onglet)} buttons={onglets} />

        {onglet === 'matchs' ? (
          <>
            <Surface style={[styles.liste, { borderRadius: t.rayonCarte }]} elevation={1}>
              {matchsDuCollectif(club, collectifId).map((m) => (
                <LigneMatch key={`${m.equipe.id}-${m.id}`} match={m} maintenant={maintenant} afficherCompetition onPress={() => onOuvrirMatch(m.id)} />
              ))}
            </Surface>
            <EnTeteSection titre="Agendas à ajouter au téléphone" />
            <Surface style={[styles.liste, { borderRadius: t.rayonCarte }]} elevation={1}>
              {equipes.map((e) => (
                <List.Item
                  key={e.id}
                  title={e.detail}
                  description="Lien .ics, à coller dans votre application d'agenda"
                  right={() => (
                    <Button mode="text" onPress={() => copier(e)}>
                      Copier le lien
                    </Button>
                  )}
                />
              ))}
            </Surface>
          </>
        ) : null}

        {onglet === 'classement' ? (
          equipes.filter((e) => e.classement).length === 0 ? (
            <Text variant="bodyMedium" style={[styles.message, { color: t.colors.onSurfaceVariant }]}>
              Pas de classement pour cette compétition.
            </Text>
          ) : (
            equipes.filter((e) => e.classement).map((e) => (
              <View key={e.id}>
                <EnTeteSection titre={e.poule ? `${e.detail} · ${nomLisible(e.poule)}` : e.detail} />
                <Surface style={[styles.liste, { borderRadius: t.rayonCarte }]} elevation={1}>
                  <View style={[styles.rangee, { borderBottomColor: t.colors.outlineVariant }]}>
                    <Text variant="labelMedium" style={[styles.place, { color: t.colors.onSurfaceVariant }]}>#</Text>
                    <Text variant="labelMedium" style={[styles.nomClassement, { color: t.colors.onSurfaceVariant }]}>Équipe</Text>
                    <Text variant="labelMedium" style={[styles.nombre, { color: t.colors.onSurfaceVariant }]}>Pts</Text>
                    <Text variant="labelMedium" style={[styles.nombre, { color: t.colors.onSurfaceVariant }]}>J</Text>
                    <Text variant="labelMedium" style={[styles.nombre, { color: t.colors.onSurfaceVariant }]}>Diff</Text>
                  </View>
                  {e.classement!.map((l) => {
                    const gras = l.nous ? { fontFamily: POLICES.gras, color: t.club.titre } : { color: t.colors.onSurface };
                    return (
                      <View
                        key={`${l.place}-${l.equipe}`}
                        style={[styles.rangee, { borderBottomColor: t.colors.outlineVariant }, l.nous && { backgroundColor: t.colors.surfaceVariant }]}
                        accessible
                        accessibilityLabel={`${ordinal(l.place ?? 0)}, ${nomLisible(l.equipe)}, ${l.points} points, ${l.joues} matchs joués, différence ${l.diff}`}
                      >
                        <Text variant="bodyMedium" style={[styles.place, gras]}>{l.place}</Text>
                        <Text variant="bodyMedium" numberOfLines={2} style={[styles.nomClassement, gras]}>{nomLisible(l.equipe)}</Text>
                        <Text variant="bodyMedium" style={[styles.nombre, gras]}>{l.points}</Text>
                        <Text variant="bodyMedium" style={[styles.nombre, gras]}>{l.joues}</Text>
                        <Text variant="bodyMedium" style={[styles.nombre, gras]}>{l.diff}</Text>
                      </View>
                    );
                  })}
                </Surface>
              </View>
            ))
          )
        ) : null}

        {onglet === 'buteurs' ? (
          <Surface style={[styles.liste, styles.margeHaut, { borderRadius: t.rayonCarte }]} elevation={1}>
            {buteursDuCollectif(club, collectifId).map((b, i) => (
              <View key={b.joueur} style={[styles.rangee, { borderBottomColor: t.colors.outlineVariant }]}>
                <Text variant="bodyMedium" style={[styles.place, { color: t.colors.onSurfaceVariant }]}>{i + 1}</Text>
                <View style={styles.nomClassement}>
                  <Text variant="bodyLarge" style={{ color: t.colors.onSurface }}>{b.joueur}</Text>
                  <Text variant="bodySmall" style={{ color: t.colors.onSurfaceVariant }}>{`${b.matchs} match${b.matchs > 1 ? 's' : ''}`}</Text>
                </View>
                <Text variant="titleMedium" style={[styles.nombre, { color: t.club.titre }]}>{b.buts}</Text>
              </View>
            ))}
          </Surface>
        ) : null}
      </ScrollView>
      <Snackbar visible={copie} onDismiss={() => setCopie(false)} duration={3000}>
        Lien de l'agenda copié
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  onglets: { marginVertical: 12 },
  liste: { overflow: 'hidden' },
  margeHaut: { marginTop: 4 },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  place: { width: 24, fontVariant: ['tabular-nums'] },
  nomClassement: { flex: 1 },
  nombre: { width: 36, textAlign: 'right', fontVariant: ['tabular-nums'] },
  message: { paddingVertical: 24, textAlign: 'center' },
  vide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
});
```

- [ ] **Step 5: Routes et onglet**

`app/src/app/(tabs)/equipes.tsx` :

```tsx
import { useRouter } from 'expo-router';
import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { useClub } from '../../donnees/requetes';
import { VueEquipes } from '../../ecrans/VueEquipes';
import { useSuivi } from '../../suivi/suivi';

export default function Equipes() {
  const { club, chargement, erreur, rafraichir } = useClub();
  const suivis = useSuivi((s) => s.suivis);
  const basculer = useSuivi((s) => s.basculer);
  const routeur = useRouter();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return <VueEquipes club={club} suivis={suivis} onBasculer={basculer} onOuvrirEquipe={(id) => routeur.push(`/equipe/${id}`)} />;
}
```

`app/src/app/equipe/[collectif].tsx` :

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { copier, urlAgenda } from '../../actions/actions';
import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { URL_AGENDAS } from '../../config';
import { useMaintenant } from '../../donnees/maintenant';
import { useClub } from '../../donnees/requetes';
import { VueEquipe } from '../../ecrans/VueEquipe';
import { useSuivi } from '../../suivi/suivi';

export default function Equipe() {
  const { collectif } = useLocalSearchParams<{ collectif: string }>();
  const { club, chargement, erreur, rafraichir } = useClub();
  const maintenant = useMaintenant();
  const suivi = useSuivi((s) => s.suivis.includes(collectif));
  const basculer = useSuivi((s) => s.basculer);
  const routeur = useRouter();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <VueEquipe
      club={club}
      collectifId={collectif}
      maintenant={maintenant}
      suivi={suivi}
      onBasculer={() => basculer(collectif)}
      onOuvrirMatch={(id) => routeur.push(`/match/${id}`)}
      onRetour={() => (routeur.canGoBack() ? routeur.back() : routeur.replace('/'))}
      onCopierAgenda={(e) => copier(urlAgenda(URL_AGENDAS, e.id))}
    />
  );
}
```

Dans `app/src/app/(tabs)/_layout.tsx`, après l'écran `matchs`, ajouter :

```tsx
      <Tabs.Screen name="equipes" options={{ title: 'Équipes', tabBarIcon: icone('shield-half-full', 'shield-outline') }} />
```

- [ ] **Step 6: Lancer les tests**

Run: `npm test -- src/ecrans/equipes.test.tsx && npm run typecheck`
Expected: 6 PASS ; `tsc` sans erreur.

- [ ] **Step 7: Commit**

```bash
git add app/src
git commit -m "App : liste des équipes et fiche équipe (matchs, classement, buteurs, agendas)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Fiche match

**Files:**
- Create: `app/src/ecrans/VueMatch.tsx`, `app/src/ecrans/VueMatch.test.tsx`, `app/src/app/match/[id].tsx`

**Interfaces:**
- Consumes: `matchParId`, `matchsDuCollectif`, `serieEnCours`, `scoreEnAttente`, `phraseResultat`, `nomLisible`, dates, `ouvrirItineraire`, `ouvrirLien`, `ajouterAgenda`.
- Produces: `<VueMatch club matchId maintenant onRetour onItineraire(salle: Salle) onOuvrirLien(url: string) onAgenda(m: MatchAvecEquipe) />`, route `/match/[id]` (utilisée aussi par les notifications au Plan 3).

- [ ] **Step 1: Écrire les tests**

`app/src/ecrans/VueMatch.test.tsx` :

```tsx
import { fireEvent, screen } from '@testing-library/react-native';
import { club, MAR_SOIR } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import { matchParId } from '../donnees/selecteurs';
import { VueMatch } from './VueMatch';

function vue(matchId: string) {
  const p = { club, matchId, maintenant: MAR_SOIR, onRetour: jest.fn(), onItineraire: jest.fn(), onOuvrirLien: jest.fn(), onAgenda: jest.fn() };
  rendu(<VueMatch {...p} />);
  return p;
}

test('match joué : phrase, score, mi-temps, salle, feuille de match', () => {
  const p = vue('2644292');
  const m = matchParId(club, '2644292')!;
  expect(screen.getByText('Victoire contre Ent. Suresnes / Nanterre')).toBeOnTheScreen();
  expect(screen.getByText('Mi-temps 16–9')).toBeOnTheScreen();
  expect(screen.getByText('dimanche 11 oct. à 16:15')).toBeOnTheScreen();
  expect(screen.getByText('Gymnase du Petit Clamart')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Itinéraire'));
  expect(p.onItineraire).toHaveBeenCalledWith(m.salle);
  fireEvent.press(screen.getByText('Feuille de match'));
  expect(p.onOuvrirLien).toHaveBeenCalledWith(m.feuille_de_match);
  fireEvent.press(screen.getByText('Voir sur ffhandball.fr'));
  expect(p.onOuvrirLien).toHaveBeenCalledWith(m.url_ffhb);
});

test('match joué senior : les buteurs du club', () => {
  vue('2644292');
  const premier = matchParId(club, '2644292')!.buteurs!.find((b) => b.buts > 0)!;
  expect(screen.getByText('Buteurs')).toBeOnTheScreen();
  expect(screen.getByText(premier.joueur)).toBeOnTheScreen();
});

test('match de jeunes : aucun nom de joueur', () => {
  vue('2740456');
  expect(screen.getByText('Défaite contre Paris St-Germain HB 3')).toBeOnTheScreen();
  expect(screen.queryByText('Buteurs')).toBeNull();
});

test('match à venir : ajouter à l’agenda', () => {
  const p = vue('2734038');
  expect(screen.getByText('Contre Association Sportive St-Cyr/Fontenay Handball 78')).toBeOnTheScreen();
  expect(screen.getByText('samedi 17 oct. à 18:00')).toBeOnTheScreen();
  fireEvent.press(screen.getByText("Ajouter à l'agenda"));
  expect(p.onAgenda).toHaveBeenCalledWith(expect.objectContaining({ id: '2734038' }));
  expect(screen.queryByText('Feuille de match')).toBeNull();
});

test('match introuvable', () => {
  const p = vue('0000000');
  expect(screen.getByText('Match introuvable')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Retour'));
  expect(p.onRetour).toHaveBeenCalled();
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- src/ecrans/VueMatch.test.tsx`
Expected: FAIL, `Cannot find module './VueMatch'`

- [ ] **Step 3: Implémenter `app/src/ecrans/VueMatch.tsx`**

```tsx
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Surface, Text } from 'react-native-paper';
import { EnTeteSection } from '../composants/EnTeteSection';
import { heureDuMatch, jourDuMatch, libelleJour } from '../donnees/dates';
import { nomLisible, phraseResultat } from '../donnees/phrase';
import { matchParId, matchsDuCollectif, scoreEnAttente, serieEnCours } from '../donnees/selecteurs';
import type { Club, MatchAvecEquipe, Salle } from '../donnees/types';
import { POLICES, useThemeClub } from '../theme/theme';

const LOGO = require('../../assets/logo-clamart.png');

interface Props {
  club: Club;
  matchId: string;
  maintenant: Date;
  onRetour: () => void;
  onItineraire: (salle: Salle) => void;
  onOuvrirLien: (url: string) => void;
  onAgenda: (m: MatchAvecEquipe) => void;
}

export function VueMatch({ club, matchId, maintenant, onRetour, onItineraire, onOuvrirLien, onAgenda }: Props) {
  const t = useThemeClub();
  const m = matchParId(club, matchId);

  if (!m) {
    return (
      <View style={[styles.page, { backgroundColor: t.colors.background }]}>
        <Appbar.Header style={{ backgroundColor: t.colors.background }}>
          <Appbar.BackAction onPress={onRetour} accessibilityLabel="Retour" />
        </Appbar.Header>
        <View style={styles.vide}>
          <Text variant="titleLarge" style={{ color: t.club.titre }}>Match introuvable</Text>
          <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>Il ne figure plus dans les résultats de la saison.</Text>
        </View>
      </View>
    );
  }

  const tous = matchsDuCollectif(club, m.equipe.collectif);
  const index = tous.findIndex((x) => x.id === m.id);
  const phrase = phraseResultat(m, serieEnCours(tous.slice(0, index + 1)));
  const adversaire = nomLisible(m.adversaire);
  const nous = `Clamart ${m.equipe.nom}`;
  const aVenir = m.resultat === null && m.date !== null && !scoreEnAttente(m, maintenant);
  const buteurs = m.equipe.stats_joueurs ? (m.buteurs ?? []).filter((b) => b.buts > 0) : [];
  const camps = m.domicile
    ? [{ nom: nous, score: m.score_nous, club: true }, { nom: adversaire, score: m.score_eux, club: false }]
    : [{ nom: adversaire, score: m.score_eux, club: false }, { nom: nous, score: m.score_nous, club: true }];
  const miTemps = m.mt_nous !== null && m.mt_eux !== null ? `Mi-temps ${m.mt_nous}–${m.mt_eux}` : undefined;

  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: t.colors.background }}>
        <Appbar.BackAction onPress={onRetour} accessibilityLabel="Retour" />
        <Appbar.Content title={m.journee ? `${m.equipe.nom} · J${m.journee}` : m.equipe.nom} titleStyle={{ color: t.club.titre }} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Surface style={[styles.carte, { borderRadius: t.rayonCarte }]} elevation={1}>
          <Text variant="titleLarge" style={{ color: t.club.titre }} accessibilityRole="header">
            {phrase?.titre ?? `Contre ${adversaire}`}
          </Text>
          {phrase?.sousTitre ? <Text variant="bodyMedium" style={{ color: t.club.victoire.texte }}>{phrase.sousTitre}</Text> : null}
          <View style={styles.camps}>
            {camps.map((c) => (
              <View key={c.nom} style={styles.camp}>
                {c.club ? <Image source={LOGO} style={styles.logo} accessibilityIgnoresInvertColors /> : <View style={[styles.logo, { backgroundColor: t.colors.outlineVariant }]} />}
                <Text variant="bodyLarge" numberOfLines={2} style={[styles.nomCamp, { color: t.colors.onSurface }]}>{c.nom}</Text>
                <Text variant="headlineSmall" style={[styles.score, { color: t.club.titre }]}>{c.score ?? '–'}</Text>
              </View>
            ))}
          </View>
          {miTemps ? <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>{miTemps}</Text> : null}
          {m.resultat === null && scoreEnAttente(m, maintenant) ? (
            <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>Score pas encore publié</Text>
          ) : null}
        </Surface>

        <EnTeteSection titre="Infos" />
        <Surface style={[styles.carte, { borderRadius: t.rayonCarte }]} elevation={1}>
          <Text variant="bodyLarge" style={{ color: t.colors.onSurface }}>
            {m.date ? `${libelleJour(jourDuMatch(m.date), 'long')} à ${heureDuMatch(m.date)}` : 'Date à venir'}
          </Text>
          <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>
            {[m.equipe.detail, m.equipe.poule ? nomLisible(m.equipe.poule) : null, m.journee ? `journée ${m.journee}` : null, m.domicile ? 'domicile' : 'extérieur'].filter(Boolean).join(' · ')}
          </Text>
          {m.salle?.nom || m.salle?.adresse ? (
            <View style={styles.salle}>
              <View style={styles.texteSalle}>
                {m.salle.nom ? <Text variant="titleMedium" style={{ color: t.club.titre }}>{nomLisible(m.salle.nom)}</Text> : null}
                {m.salle.adresse ? <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>{m.salle.adresse}</Text> : null}
              </View>
              <Button mode="contained-tonal" icon="map-marker-radius" onPress={() => onItineraire(m.salle!)}>Itinéraire</Button>
            </View>
          ) : null}
        </Surface>

        <View style={styles.actions}>
          {aVenir ? <Button mode="contained" icon="calendar-plus" onPress={() => onAgenda(m)}>Ajouter à l'agenda</Button> : null}
          {m.feuille_de_match ? <Button mode="outlined" icon="file-document-outline" onPress={() => onOuvrirLien(m.feuille_de_match!)}>Feuille de match</Button> : null}
          <Button mode="text" icon="open-in-new" onPress={() => onOuvrirLien(m.url_ffhb)}>Voir sur ffhandball.fr</Button>
        </View>

        {buteurs.length ? (
          <>
            <EnTeteSection titre="Buteurs" />
            <Surface style={[styles.liste, { borderRadius: t.rayonCarte }]} elevation={1}>
              {buteurs.map((b) => (
                <View key={b.joueur} style={[styles.rangee, { borderBottomColor: t.colors.outlineVariant }]}>
                  <Text variant="labelLarge" style={[styles.numero, { color: t.colors.onSurfaceVariant }]}>{b.numero ?? ''}</Text>
                  <Text variant="bodyLarge" style={[styles.joueur, { color: t.colors.onSurface }]}>{b.joueur}</Text>
                  <Text variant="titleMedium" style={[styles.buts, { color: t.club.titre, fontFamily: POLICES.gras }]}>{b.buts}</Text>
                </View>
              ))}
            </Surface>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  carte: { padding: 16, gap: 8 },
  camps: { gap: 10, marginTop: 8 },
  camp: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 28, height: 28, borderRadius: 14 },
  nomCamp: { flex: 1 },
  score: { fontVariant: ['tabular-nums'], minWidth: 36, textAlign: 'right' },
  salle: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  texteSalle: { flex: 1 },
  actions: { gap: 8, marginTop: 16 },
  liste: { overflow: 'hidden' },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  numero: { width: 28, fontVariant: ['tabular-nums'] },
  joueur: { flex: 1 },
  buts: { fontVariant: ['tabular-nums'] },
  vide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
});
```

- [ ] **Step 4: Route**

`app/src/app/match/[id].tsx` :

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ajouterAgenda, ouvrirItineraire, ouvrirLien } from '../../actions/actions';
import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { useMaintenant } from '../../donnees/maintenant';
import { useClub } from '../../donnees/requetes';
import { VueMatch } from '../../ecrans/VueMatch';

export default function Match() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { club, chargement, erreur, rafraichir } = useClub();
  const maintenant = useMaintenant();
  const routeur = useRouter();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <VueMatch
      club={club}
      matchId={id}
      maintenant={maintenant}
      onRetour={() => (routeur.canGoBack() ? routeur.back() : routeur.replace('/'))}
      onItineraire={ouvrirItineraire}
      onOuvrirLien={ouvrirLien}
      onAgenda={ajouterAgenda}
    />
  );
}
```

- [ ] **Step 5: Lancer les tests**

Run: `npm test -- src/ecrans/VueMatch.test.tsx && npm run typecheck`
Expected: 5 PASS ; `tsc` sans erreur.

- [ ] **Step 6: Commit**

```bash
git add app/src
git commit -m "App : fiche match (score, mi-temps, salle et itinéraire, feuille, buteurs seniors)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Buteurs et Réglages

**Files:**
- Create: `app/src/ecrans/VueButeurs.tsx`, `app/src/ecrans/VueReglages.tsx`, `app/src/ecrans/buteurs-reglages.test.tsx`, `app/src/app/(tabs)/buteurs.tsx`, `app/src/app/reglages.tsx`
- Modify: `app/src/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `Club`, `libelleMiseAJour`, `useSuivi`, `ouvrirLien`, `expo-constants`.
- Produces: `<VueButeurs club />`, `<VueReglages club maintenant suivis retires version onRetirer(id) onGererEquipes onEffacerRetires onOuvrirLien(url) onRetour />`, routes `/buteurs`, `/reglages`.

- [ ] **Step 1: Écrire les tests**

`app/src/ecrans/buteurs-reglages.test.tsx` :

```tsx
import { fireEvent, screen } from '@testing-library/react-native';
import { club, MAR_SOIR } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import { VueButeurs } from './VueButeurs';
import { VueReglages } from './VueReglages';

test('buteurs du club : seniors, meilleur en tête', () => {
  rendu(<VueButeurs club={club} />);
  expect(screen.getByText('Diara DORILAS')).toBeOnTheScreen();
  expect(screen.getByText('38')).toBeOnTheScreen();
  expect(screen.getByText('Seniors uniquement · 42 joueurs et joueuses')).toBeOnTheScreen();
});

test('buteurs : aucun en début de saison', () => {
  rendu(<VueButeurs club={{ ...club, buteurs_club: [] }} />);
  expect(screen.getByText('Pas encore de buteurs cette saison.')).toBeOnTheScreen();
});

function reglages(props: Partial<Parameters<typeof VueReglages>[0]> = {}) {
  const p = {
    club, maintenant: MAR_SOIR, suivis: ['seniors-m'], retires: [] as string[], version: '1.0.0',
    onRetirer: jest.fn(), onGererEquipes: jest.fn(), onEffacerRetires: jest.fn(), onOuvrirLien: jest.fn(), onRetour: jest.fn(),
    ...props,
  };
  rendu(<VueReglages {...p} />);
  return p;
}

test('réglages : équipes suivies, données, version', () => {
  const p = reglages();
  expect(screen.getByText('Seniors M')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Ne plus suivre Seniors M'));
  expect(p.onRetirer).toHaveBeenCalledWith('seniors-m');
  fireEvent.press(screen.getByText('Gérer mes équipes'));
  expect(p.onGererEquipes).toHaveBeenCalled();
  expect(screen.getByText('mis à jour à 16:41')).toBeOnTheScreen();
  expect(screen.getByText('Version 1.0.0')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Résultats issus de ffhandball.fr'));
  expect(p.onOuvrirLien).toHaveBeenCalledWith('https://www.ffhandball.fr');
});

test('réglages : signale les équipes retirées', () => {
  const p = reglages({ suivis: [], retires: ['u11-mixte-3'] });
  expect(screen.getByText('Aucune équipe suivie')).toBeOnTheScreen();
  expect(screen.getByText('1 équipe suivie ne figure plus dans les résultats de la saison et a été retirée.')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('OK'));
  expect(p.onEffacerRetires).toHaveBeenCalled();
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- src/ecrans/buteurs-reglages.test.tsx`
Expected: FAIL, `Cannot find module './VueButeurs'`

- [ ] **Step 3: Implémenter `app/src/ecrans/VueButeurs.tsx`**

```tsx
import { FlatList, StyleSheet, View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import type { Club } from '../donnees/types';
import { useThemeClub } from '../theme/theme';

export function VueButeurs({ club }: { club: Club }) {
  const t = useThemeClub();
  const buteurs = club.buteurs_club;
  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: t.colors.background }}>
        <Appbar.Content title="Buteurs" titleStyle={{ color: t.club.titre }} />
      </Appbar.Header>
      <FlatList
        data={buteurs}
        keyExtractor={(b) => b.joueur}
        contentContainerStyle={styles.contenu}
        ListHeaderComponent={
          buteurs.length ? (
            <Text variant="bodyMedium" style={[styles.note, { color: t.colors.onSurfaceVariant }]}>
              {`Seniors uniquement · ${buteurs.length} joueurs et joueuses`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <Text variant="bodyLarge" style={[styles.vide, { color: t.colors.onSurfaceVariant }]}>
            Pas encore de buteurs cette saison.
          </Text>
        }
        renderItem={({ item, index }) => (
          <View
            style={[styles.rangee, { backgroundColor: t.colors.surface, borderBottomColor: t.colors.outlineVariant }]}
            accessible
            accessibilityLabel={`${index + 1}, ${item.joueur}, ${item.buts} buts en ${item.matchs} matchs`}
          >
            <Text variant="labelLarge" style={[styles.rang, { color: t.colors.onSurfaceVariant }]}>{index + 1}</Text>
            <View style={styles.joueur}>
              <Text variant="bodyLarge" style={{ color: t.colors.onSurface }}>{item.joueur}</Text>
              <Text variant="bodySmall" style={{ color: t.colors.onSurfaceVariant }}>
                {`${item.equipes.join(', ')} · ${item.matchs} matchs · moy. ${item.moyenne} · record ${item.record}`}
              </Text>
            </View>
            <Text variant="titleLarge" style={[styles.buts, { color: t.club.titre }]}>{item.buts}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  note: { marginVertical: 12 },
  vide: { textAlign: 'center', paddingTop: 48 },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rang: { width: 28, fontVariant: ['tabular-nums'] },
  joueur: { flex: 1 },
  buts: { fontVariant: ['tabular-nums'] },
});
```

- [ ] **Step 4: Implémenter `app/src/ecrans/VueReglages.tsx`**

```tsx
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, IconButton, List, Surface, Text } from 'react-native-paper';
import { libelleMiseAJour } from '../donnees/dates';
import type { Club } from '../donnees/types';
import { useThemeClub } from '../theme/theme';

interface Props {
  club: Club;
  maintenant: Date;
  suivis: string[];
  retires: string[];
  version: string;
  onRetirer: (id: string) => void;
  onGererEquipes: () => void;
  onEffacerRetires: () => void;
  onOuvrirLien: (url: string) => void;
  onRetour: () => void;
}

export function VueReglages(p: Props) {
  const t = useThemeClub();
  const miens = p.club.collectifs.filter((c) => p.suivis.includes(c.id));
  const n = p.retires.length;
  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: t.colors.background }}>
        <Appbar.BackAction onPress={p.onRetour} accessibilityLabel="Retour" />
        <Appbar.Content title="Réglages" titleStyle={{ color: t.club.titre }} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.contenu}>
        {n > 0 ? (
          <Surface style={[styles.bloc, styles.message, { borderRadius: t.rayonCarte, backgroundColor: t.colors.surfaceVariant }]} elevation={0}>
            <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant, flex: 1 }}>
              {n === 1
                ? '1 équipe suivie ne figure plus dans les résultats de la saison et a été retirée.'
                : `${n} équipes suivies ne figurent plus dans les résultats de la saison et ont été retirées.`}
            </Text>
            <Button mode="text" onPress={p.onEffacerRetires}>OK</Button>
          </Surface>
        ) : null}

        <List.Subheader style={{ color: t.club.titre }}>Mes équipes</List.Subheader>
        <Surface style={[styles.bloc, { borderRadius: t.rayonCarte }]} elevation={1}>
          {miens.length === 0 ? <List.Item title="Aucune équipe suivie" /> : null}
          {miens.map((c) => (
            <List.Item
              key={c.id}
              title={c.nom}
              right={() => <IconButton icon="close" accessibilityLabel={`Ne plus suivre ${c.nom}`} onPress={() => p.onRetirer(c.id)} />}
            />
          ))}
          <Button mode="text" style={styles.gerer} onPress={p.onGererEquipes}>Gérer mes équipes</Button>
        </Surface>

        <List.Subheader style={{ color: t.club.titre }}>Données</List.Subheader>
        <Surface style={[styles.bloc, { borderRadius: t.rayonCarte }]} elevation={1}>
          <List.Item title="Résultats issus de ffhandball.fr" description="Fédération française de handball" left={(props) => <List.Icon {...props} icon="open-in-new" />} onPress={() => p.onOuvrirLien('https://www.ffhandball.fr')} />
          <List.Item title="Dernière mise à jour" description={libelleMiseAJour(p.club.mis_a_jour, p.maintenant)} left={(props) => <List.Icon {...props} icon="update" />} />
        </Surface>

        <List.Subheader style={{ color: t.club.titre }}>À propos</List.Subheader>
        <Surface style={[styles.bloc, { borderRadius: t.rayonCarte }]} elevation={1}>
          <List.Item title="Clamart Handball" description={`Version ${p.version}`} left={(props) => <List.Icon {...props} icon="information-outline" />} />
        </Surface>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  bloc: { overflow: 'hidden' },
  message: { flexDirection: 'row', alignItems: 'center', padding: 12, marginTop: 8 },
  gerer: { alignSelf: 'flex-start', margin: 8 },
});
```

Le test `getByText('Version 1.0.0')` porte sur la description du `List.Item` ; s'il échoue parce que Paper découpe le texte, remplacer l'attendu par `getByText(/Version 1\.0\.0/)`.

- [ ] **Step 5: Routes et onglet**

`app/src/app/(tabs)/buteurs.tsx` :

```tsx
import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { useClub } from '../../donnees/requetes';
import { VueButeurs } from '../../ecrans/VueButeurs';

export default function Buteurs() {
  const { club, chargement, erreur, rafraichir } = useClub();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return <VueButeurs club={club} />;
}
```

`app/src/app/reglages.tsx` :

```tsx
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ouvrirLien } from '../actions/actions';
import { EtatSansDonnees } from '../composants/EtatSansDonnees';
import { useMaintenant } from '../donnees/maintenant';
import { useClub } from '../donnees/requetes';
import { VueReglages } from '../ecrans/VueReglages';
import { useSuivi } from '../suivi/suivi';

export default function Reglages() {
  const { club, chargement, erreur, rafraichir } = useClub();
  const maintenant = useMaintenant();
  const suivis = useSuivi((s) => s.suivis);
  const retires = useSuivi((s) => s.retires);
  const { basculer, effacerRetires } = useSuivi.getState();
  const routeur = useRouter();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <VueReglages
      club={club}
      maintenant={maintenant}
      suivis={suivis}
      retires={retires}
      version={Constants.expoConfig?.version ?? ''}
      onRetirer={basculer}
      onGererEquipes={() => routeur.push('/equipes')}
      onEffacerRetires={effacerRetires}
      onOuvrirLien={ouvrirLien}
      onRetour={() => (routeur.canGoBack() ? routeur.back() : routeur.replace('/'))}
    />
  );
}
```

Dans `app/src/app/(tabs)/_layout.tsx`, après l'écran `equipes`, ajouter :

```tsx
      <Tabs.Screen name="buteurs" options={{ title: 'Buteurs', tabBarIcon: icone('handball', 'handball') }} />
```

- [ ] **Step 6: Lancer toute la suite**

Run: `npm test && npm run typecheck`
Expected: tous les tests PASS ; `tsc` sans erreur.

- [ ] **Step 7: Commit**

```bash
git add app/src
git commit -m "App : buteurs du club et réglages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Revue design sur émulateur et DESIGN.md

Le contrat de direction impose : « unreviewed and undocumented is unfinished ». Pas de détecteur web ici (app native) : la revue de finition est la seule barrière qualité.

**Files:**
- Create: `.impeccable/review/phone-android-*.png`, `DESIGN.md`, `.impeccable/design.json` (écrits par le documenteur)
- Modify: fichiers de `app/src/` selon les corrections demandées par la revue

**Interfaces:**
- Consumes: l'app complète (Tasks 1–15), le contrat de direction, `PRODUCT.md`.
- Produces: verdict de revue, `DESIGN.md` + `.impeccable/design.json`.

- [ ] **Step 1: Préparer l'émulateur avec de vraies données**

```bash
emulator -avd Pixel_8_API_35 &
cd /e/MobileApp/app && npx expo start --android
```

Dans l'app : écran de bienvenue → choisir « Seniors F 1 », « Seniors M », « U13 M » → Continuer.

- [ ] **Step 2: Captures en un seul passage groupé**

Pour chaque écran — Accueil, Matchs, Équipes, fiche équipe (Seniors F 1, vue Classement), fiche match (dernier match de Seniors F 1) — naviguer dans l'app puis capturer :

```bash
mkdir -p /e/MobileApp/.impeccable/review
adb exec-out screencap -p > /e/MobileApp/.impeccable/review/phone-android-accueil.png
```

(nommer `phone-android-matchs.png`, `phone-android-equipes.png`, `phone-android-equipe.png`, `phone-android-match.png`). Puis le thème sombre et la grande police sur l'Accueil et la fiche match :

```bash
adb shell cmd uimode night yes
adb exec-out screencap -p > /e/MobileApp/.impeccable/review/phone-android-accueil-sombre.png
adb shell cmd uimode night no
adb shell settings put system font_scale 1.3
adb exec-out screencap -p > /e/MobileApp/.impeccable/review/phone-android-accueil-police130.png
adb shell settings put system font_scale 1.0
```

Ouvrir chaque fichier une fois et vérifier qu'il montre ce que son nom annonce (pas d'écran noir, pas de chargement en cours). Recapturer sinon.

- [ ] **Step 3: Revue de finition**

Lancer l'agent `impeccable-finish-reviewer` (contexte neuf, sans historique) avec ce dossier :
- demande d'origine : app mobile Clamart Handball, suivre les matchs, scores et buts ; Android d'abord ;
- réponses confirmées : direction « app grand public chaleureuse + onglet Matchs façon app de scores », références FotMob et app du PSG, pas d'actualités ;
- artefact : `app/src/` ; captures : les 7 fichiers de `.impeccable/review/` (tous requis) ;
- contrat : `.impeccable/surfaces/app-src-app-tabs-index-tsx.md` ;
- référence de critique (pas de comp approuvée, build code-led) : `.impeccable/mocks/decision/challenger-warm.html` et `canon.html` ;
- références plateforme : `C:\Users\LPS11\.claude\skills\impeccable\reference\android.md` et `ios.md` ; craft floor : `...\reference\craft-floor.md` ;
- une ligne : « App native : aucun détecteur n'a tourné ; juger selon les conventions Android/Material 3. »

Agir selon le mot de disposition rendu : **ship** → étape 5 ; **fix** → appliquer toutes les corrections matérielles en un lot, relancer `npm test && npm run typecheck`, recapturer les mêmes vues dans les mêmes fichiers, renvoyer au même relecteur pour un verdict ; **recapture** → refaire les captures demandées puis une revue complète ; **rebuild** → reconstruire les zones nommées, puis revue complète. Deux tours au maximum ; au-delà, présenter à l'utilisateur le tableau des points ouverts et le laisser décider.

- [ ] **Step 4: Commit des corrections**

```bash
git add app/src .impeccable/review
git commit -m "App : corrections de la revue de finition

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Documenter le système visuel**

Lancer l'agent `impeccable-documenter` avec : racine `E:\MobileApp`, artefact `app/src/`, contrat de direction, `PRODUCT.md`, la référence `C:\Users\LPS11\.claude\skills\impeccable\reference\document.md`, et la limite d'écriture `DESIGN.md` + `.impeccable/design.json` uniquement. Vérifier que les deux fichiers existent et que `DESIGN.md` contient les jetons (couleurs de `src/theme/couleurs.ts`, polices, rayons).

- [ ] **Step 6: Commit**

```bash
git add DESIGN.md .impeccable/design.json
git commit -m "Design : DESIGN.md issu de l'app construite

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
