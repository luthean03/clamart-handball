# Plan 2 — journal d'exécution (décisions et points reportés)

Extrait du registre d'exécution (subagent-driven-development), 15/10/2026. Branche plan-2-app.

## Décisions (rulings)
- Ruling: Task 1 Step 1 (Android Studio) already done by user; AVD is `Medium_Phone_API_37.0` (not Pixel_8_API_35) and emulator/adb are not on PATH — use `$LOCALAPPDATA/Android/Sdk/emulator/emulator -avd Medium_Phone_API_37.0` and `$LOCALAPPDATA/Android/Sdk/platform-tools/adb` — cost if wrong: none.
- Ruling: URL_DONNEES = https://luthean03.github.io/clamart-handball/data/club.json (repo currently private, Pages not live yet; tests use fixtures so unaffected) — cost if wrong: one app.json edit.
- Task 1: Ruling: RNTL v14 (async) installed → pin @testing-library/react-native ^13.3 + react-test-renderer 19.2.3 — plan's tests are synchronous — cost if wrong: later migration to v14.
- Task 1: Ruling: no NPM_CONFIG_USERCONFIG override after round 0 (it bypassed the user's ~/.npmrc allow-scripts) — security control; plain npm install works — cost if wrong: an install may need user help.
- Task 1: Ruling: removed template app/.claude/settings.json (enabled a Claude plugin) and app/LICENSE (Expo copyright); kept AGENTS.md — cost if wrong: none.
- Task 1: Ruling: test/setup.ts line 1 = `import '@testing-library/react-native/matchers';` (extend-expect does not exist in 13.3.3); matchers are registered by importing the main package in tests — cost if wrong: a test importing only /pure lacks matchers.
- Ruling: commit co-author footer may name the subagent's actual model (Haiku/Sonnet) — accurate attribution — cost if wrong: cosmetic
- Ruling: `npx expo lint` not run per task (not in plan; first run installs ESLint config) — run once at final gate — cost if wrong: lint findings batched at the end.
- Task 5: Ruling: nomLisible mis-cased real opponents (SCUF, COM) and lone letters/parentheses — fixed beyond the brief's verbatim code, new cases added to partage/phrases-cas.json — visible on real data and the JSON is the notifier contract — cost if wrong: casing heuristic tweaks
- Task 6: Ruling: the 'no hex outside couleurs.ts' constraint covers app source, not test reference values (#000/#FFF in theme.test.ts) — constraint's purpose is theming of UI — cost if wrong: none
- Task 8: Ruling: test-only deviations accepted (client.clear() in afterEach for open handles; globalThis.fetch for TS6 types) — keeps output pristine — cost if wrong: none
- Task 8: Ruling: persisted cache dropped error-state queries (plan-mandated defaults) — dehydrate queries with data; horsLigne hidden while fetching — offline constraint — cost if wrong: banner timing.
- Task 8: Ruling: accepted implementer's extra fix gcTime capped at 2^31-1 ms (UN_MOIS overflowed setTimeout → 1 ms GC) — real bug — cost if wrong: none.
- Task 9: Ruling: accepted @expo/vector-icons ^15.0.2 + expo-asset ~57.0.19 (SDK-bundled versions, Expo Go compatible) — Paper Icon had no icon library (squares on device) — cost if wrong: none.
- Task 9: Ruling: stale banner text drops the trailing "." (libelleJour ends with "oct.") — brief's code gave "oct.." — cost if wrong: none.
- Task 9: Ruling: test-only MaterialCommunityIcons mock (sync Text) in setup.ts — async font load caused act() noise — cost if wrong: none.
- Task 10: Ruling: use expo-calendar/legacy createEventInCalendarAsync — root export throws in 57.0.5 and the new addEventWithForm is stubbed in Expo Go; legacy launches ACTION_INSERT with no calendar permission — cost if wrong: migrate when leaving Expo Go.
- Task 11: Ruling: accepted deviations — expo-router vendors react-navigation (imports from expo-router/react-navigation, expo-router/tabs); Surface overflow moved to inner View (Paper warning); icone color typed ColorValue — cost if wrong: none
- Task 11: Ruling: touch targets — Paper IconButton (40 dp) and Chip (~32 dp) don't meet the ≥48 dp constraint; Réglages button 48×48, team chips replaced by local ChoixEquipe (TouchableRipple minHeight 48, role checkbox) — carried to Tasks 12–15 — cost if wrong: small visual differences from Paper defaults.
- Task 12: Ruling: SegmentedButtons keep the 40 dp drawn height (Material 3 spec) with hitSlop to a 52 dp touch target — M3 defines a 40 dp container with a 48 dp target — cost if wrong: Android a11y scanner may flag the visual size.
- Task 12: Ruling: accepted extraction of ChoixEquipe into src/composants/PastilleChoix.tsx (role checkbox|radio), reused by VueBienvenue — avoids duplication — cost if wrong: none.
- Task 13: Ruling (revises Task 12 ruling): hitSlop inside Paper's fixed-size Surface/View is likely clipped by the parent on Android → prefer a real layout `minHeight: 48` (Button style applies to the outer Surface); SegmentedButtons + "Copier le lien" hitSlop to be verified on the emulator in Task 16 and replaced by minHeight if dead — cost if wrong: 40 dp targets on two controls.
- Task 15: Ruling: client-side guard buteursClubAffichables (seniors-only enforced in app, not only by collector config) — hard constraint "minors never named" — cost if wrong: none.
- Task 16: Ruling: repo still private (Pages 404) → design review uses site/data served locally (python -m http.server on E:/MobileApp/site, port 8000) with a TEMPORARY uncommitted app.json extra.urlDonnees=http://10.0.2.2:8000/data/club.json, reverted after captures — cost if wrong: none (live URL unchanged in git). Controller (not implementer) dispatches finish reviewer + documenter (implementers cannot spawn subagents).
- Task 16: Ruling: follow icon = star (not bell) until Plan 3 notifications — truth — cost if wrong: icon swap back in Plan 3.
- Task 16: Ruling: bottom bar labelMaxFontSizeMultiplier raised to 1.5 (Paper default 1 blocked scaling) — a11y — cost if wrong: none.
- Final: Ruling: final fix wave includes Important 1 + Minors 1 (fetch timeout), 3 (sansRejet Accueil), 4 (standings 1.3×), 6 (ErrorBoundary), 7b (Classement tab absent per spec), 9 (erreurs gate test + pret gate), T4 (=== true) — cheap and user-visible — cost if wrong: small extra diff.
- Final: Ruling: `npx expo lint` gate dropped — no ESLint config in app/, running it would install packages; tsc strict + 231 tests are the gate — cost if wrong: lint-only findings unseen.
- Final: Ruling: keep "Aucun match programmé pour le moment" instead of spec's "Fin de saison" — accurate during winter break too — cost if wrong: wording.

## Points mineurs reportés
- Task 1: minor (deferred): setup.ts matcher import is a no-op; registration relies on tests importing the main RNTL package
- Task 1: minor (deferred): react-native-reanimated/worklets are direct deps (pins Expo-Go-bundled versions)
- Task 1: minor (deferred): package name "app" is generic
- Task 2: minor (deferred): non-integer/string version_schema treated as v1 (by contract)
- Task 2: minor (deferred): empty URL_DONNEES gives a generic network error (misconfiguration diagnostic)
- Task 3: minor (deferred): 36 h threshold boundary not tested exactly
- Task 3: minor (deferred): jourDuMatch/heureDuMatch slice without validating input
- Task 3: minor (deferred): libelleMiseAJour uses device tz (consistent with constraint)
- Task 4: minor (deferred): stats_joueurs guard uses truthiness, not === true
- Task 4: minor (deferred): buteursDuCollectif.matchs counts 0-goal appearances (consistent with buteurs_club)
- Task 4: minor (deferred): selectors re-flatten/sort per call (memoise if screens get slow)
- Task 4: minor (deferred): formeRecente has no direct test; rangCategorie unknown-category edge untested
- Task 5: minor (deferred): no JSON case for PUC/CSA/ACBB nor typographic ’; VI numeral → "Vi"
- Task 5: minor (deferred): sigle whitelist heuristic — review nomLisible over all real adversaire names once Pages data is live
- Task 6: minor (deferred → Task 16 design review): inverseSurface/inverseOnSurface/inversePrimary left at Paper purple defaults (Snackbar off-brand)
- Task 6: minor (deferred → Task 16): secondaryContainer=indicateur makes flat chips/segmented/nav pill pink; nav pill low non-text contrast
- Task 6: minor (deferred): tests cover palette pairs, not actual Paper component pairings; Paper error red close to club red
- Task 7: minor (deferred, flag for final review): setState inside onRehydrateStorage triggers a persist write; on a transient read failure it overwrites stored follows with defaults
- Task 7: minor (deferred): retires can hold duplicates; retirerInconnus([]) unfollows all (caller guard in Task 11); no hydration read-back test
- Task 8: minor (deferred): restored error-state query has error serialised as {} — UI must derive offline display from horsLigne, not erreur.name (Task 11 carry)
- Task 8: minor (deferred): useMaintenant/brancherPremierPlan/creerClientRequetes untested; gcTime (24.8 d) < maxAge (30 d)
- Task 9: minor (deferred → Task 16 font 1.3x check): LigneMatch statut fixed width 56 may break "Attente" at large font scale
- Task 9: minor (deferred): spoken label of unplayed match omits date/competition; no positive role=alert assertion; PastilleResultat alone has no a11y label
- Task 10: minor (deferred): global expo-calendar mock in test/setup.ts is dead (should target expo-calendar/legacy)
- Task 10: minor (deferred): evenementAgenda with null date → Invalid Date (UI must hide the button); no rejection handling for agenda/browser in UI
- Task 11: minor (deferred): retirerInconnus effect not gated on `pret` (cleanup delayed until data changes); splash hides before store rehydration (blank frame); SplashScreen promises uncaught; double-tap Continuer
- Task 11: minor (deferred): CarteEquipe a11y label omits sousTitre/forme/place; ChoixEquipe text lacks numberOfLines; checked state untested
- Task 11: minor (deferred): on-device welcome/Home/tab flow not seen with live data (data URL not live) — verify in Task 16
- Task 12: minor (deferred): segmented hitSlop not verified by real hit-testing (check on device in Task 16); positions ref never pruned
- Task 13: minor (deferred): standings number columns fixed width (36) may wrap at 1.3× / 3-digit diffs → minWidth; header cells not grouped for TalkBack; empty matchs/buteurs cards without message; place line may be ellipsized in VueEquipes
- Task 14: minor (deferred → Plan 3 notifications): route params id/collectif may be string[] at runtime — normalise in deep-link routes
- Task 14: minor (deferred): libelleScoreLu/campsDuMatch exported from a component file (could move to donnees/); scoreEnAttente evaluated twice
- Task 15: minor (deferred): empty-equipes branch untested; keyExtractor by joueur; "Version " fallback; onRetirer reuses toggle basculer; push('/equipes') from outside tabs — check back nav on device
- Task 16: minor (deferred): "Dernier match …Levallois SC / 1D, 21–22" wraps between SC and 1D; competition label truncated to 1 line at 1.3×; prefilled calendar editor never observed (emulator lacks Google account)
- Final: minor (deferred): offline indicator only on Accueil; matchParId derby ambiguity (carry team id in route — Plan 3 deep links); Réglages notice lacks removed team names; rehydrate failure overwrites stored follows (retry once — follow-up); calendar editor to verify on a signed-in device before release.

## Faits techniques utiles pour la suite
- Installed: Expo SDK 57 (expo ~57.0.28, RN 0.86.3, React 19.2.3, TypeScript 6 — tsconfig has `"types": ["jest"]`), @testing-library/react-native 13.3.3 (SYNC API, as the plan expects).
- `app/test/setup.ts` line 1 is `import '@testing-library/react-native/matchers';` — `extend-expect` does not exist in 13.3.3; do not change it. Matchers (toBeOnTheScreen, toHaveProp…) are available in tests that import from '@testing-library/react-native'.
- npm installs: use plain `npx expo install …` / `npm install …`. NEVER override the user's npm config (no NPM_CONFIG_USERCONFIG, no --userconfig): ~/.npmrc `allow-scripts` is a security control. If an install fails because of it, STOP and report BLOCKED with the error.
- Task 8 facts: `creerClientRequetes()` already sets `dehydrate.shouldDehydrateQuery` (persist queries that have data) and caps gcTime; `useClub().horsLigne` = isError && data && !isFetching. When wiring PersistQueryClientProvider, pass `maxAge: UN_MOIS` and do NOT pass `dehydrateOptions`. With cached data, decide offline display from `horsLigne`, never from `erreur.name` (a restored error is a plain `{}`).
- Task 9 facts: `npx expo install` fails with EALLOWSCRIPTS on this machine — use plain `npm install <pkg>@<version from node_modules/expo/bundledNativeModules.json>` instead (no npm-config override). @expo/vector-icons is installed; test/setup.ts mocks MaterialCommunityIcons synchronously. `test/rendu.tsx` exports `rendu(ui, theme?)`.
- Task 10 facts: calendar uses `expo-calendar/legacy` (root export throws in SDK 57). `src/actions/actions.ts` exports ajouterAgenda, ouvrirItineraire, ouvrirLien, copier, urlAgenda, urlItineraire, evenementAgenda.
- Task 11 facts / RULING for all later screens: every touch target must be ≥ 48 dp. Paper `IconButton` is only 40 dp → give it `style={{ width: 48, height: 48, margin: 0 }}` (keep icon size 24). Paper `Chip` is ~32 dp → do not use it for selectable items; reuse the pattern of `ChoixEquipe` in src/ecrans/VueBienvenue.tsx (TouchableRipple with minHeight 48 around a pill, theme tokens only). Paper `SegmentedButtons` and `Appbar.Action`/`Appbar.BackAction`: check their rendered height/size in node_modules and make them ≥ 48 dp if they are not. Add a test asserting ≥ 48 for each new interactive element type you introduce (StyleSheet.flatten on the style prop).
- Never start Metro (`npx expo start`) in a task unless the brief says so: it rewrites app/tsconfig.json (revert with git checkout if it does).
- expo-router SDK 57 vendors react-navigation: import from `expo-router/react-navigation` / `expo-router/tabs`.
- Task 12 facts: reusable selectable pill = `src/composants/PastilleChoix.tsx` (prop role 'checkbox' | 'radio', ≥ 48 dp). Derived state pattern: store only the user's choice and derive the shown value from current data (never seed state once from props).
- RULING (Task 13, replaces the hitSlop approach): hitSlop inside a fixed-size parent is clipped on Android. For Paper `Button`, use `style={{ minHeight: 48, justifyContent: 'center' }}` (applies to the outer Surface) — real layout height. Do not rely on hitSlop for new controls.
