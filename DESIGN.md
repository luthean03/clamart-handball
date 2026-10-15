---
name: Clamart Handball
description: L'app du club, chaleureuse et claire, qui dit chaque résultat en une phrase simple.
colors:
  creme-fond: "#FAF6E6"
  carte-blanche: "#FFFFFF"
  encre-chaude: "#2A2622"
  encre-douce: "#6E655D"
  bleu-nuit: "#142A3D"
  rouge-club: "#DB0000"
  sur-rouge: "#FFFFFF"
  filet-sable: "#EFE7DC"
  rouge-pale: "#FADAD3"
  sur-rouge-pale: "#7A1005"
  surligne-peche: "#FFF1E0"
  victoire-fond: "#E3F1E8"
  victoire-texte: "#1B5E3B"
  nul-fond: "#EBEEF2"
  nul-texte: "#3D4A57"
  defaite-fond: "#F1E9E4"
  defaite-texte: "#6B4A3E"
  snackbar-fond: "#142A3D"
  snackbar-texte: "#FFFEF0"
  snackbar-action: "#FFB4A8"
  nuit-fond: "#142A3D"
  nuit-carte: "#1E3549"
  nuit-texte: "#F4EFE6"
  nuit-texte-doux: "#B4C0CC"
  nuit-titre: "#FFFEF0"
  nuit-rouge: "#FF6B5E"
  nuit-sur-rouge: "#2A0A06"
  nuit-filet: "#2C4256"
  nuit-rouge-pale: "#5A1D18"
  nuit-sur-rouge-pale: "#FFDAD4"
  nuit-surligne: "#26425A"
  nuit-victoire-fond: "#21483A"
  nuit-victoire-texte: "#BFE8CF"
  nuit-nul-fond: "#2C4256"
  nuit-nul-texte: "#D5DCE3"
  nuit-defaite-fond: "#4A3430"
  nuit-defaite-texte: "#F0D2C6"
typography:
  headline-small:
    fontFamily: "Nunito_800ExtraBold"
    fontSize: "24px"
    lineHeight: "32px"
  title-large:
    fontFamily: "Nunito_800ExtraBold"
    fontSize: "22px"
    lineHeight: "28px"
  title-medium:
    fontFamily: "Nunito_700Bold"
    fontSize: "16px"
    lineHeight: "24px"
  body-large:
    fontFamily: "Nunito_500Medium"
    fontSize: "16px"
    lineHeight: "24px"
  body-medium:
    fontFamily: "Nunito_500Medium"
    fontSize: "14px"
    lineHeight: "20px"
  label-large:
    fontFamily: "Nunito_700Bold"
    fontSize: "14px"
    lineHeight: "20px"
  label-medium:
    fontFamily: "Nunito_500Medium"
    fontSize: "12px"
    lineHeight: "16px"
  label-small:
    fontFamily: "Nunito_500Medium"
    fontSize: "11px"
    lineHeight: "16px"
rounded:
  base: "4px"
  pastille-resultat: "6px"
  bandeau: "12px"
  pastille-choix: "16px"
  carte: "20px"
  rond: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  cible: "48px"
components:
  carte-equipe:
    backgroundColor: "{colors.carte-blanche}"
    rounded: "{rounded.carte}"
    padding: "16px"
  ligne-match:
    backgroundColor: "{colors.carte-blanche}"
    textColor: "{colors.encre-chaude}"
    padding: "12px 16px"
  bouton-plein:
    backgroundColor: "{colors.rouge-club}"
    textColor: "{colors.sur-rouge}"
    height: "48px"
  pastille-victoire:
    backgroundColor: "{colors.victoire-fond}"
    textColor: "{colors.victoire-texte}"
    rounded: "{rounded.pastille-resultat}"
    size: "24px"
  pastille-nul:
    backgroundColor: "{colors.nul-fond}"
    textColor: "{colors.nul-texte}"
    rounded: "{rounded.pastille-resultat}"
    size: "24px"
  pastille-defaite:
    backgroundColor: "{colors.defaite-fond}"
    textColor: "{colors.defaite-texte}"
    rounded: "{rounded.pastille-resultat}"
    size: "24px"
  pastille-choix-choisie:
    backgroundColor: "{colors.rouge-pale}"
    textColor: "{colors.sur-rouge-pale}"
    rounded: "{rounded.pastille-choix}"
    height: "32px"
  bandeau-etat:
    backgroundColor: "{colors.surligne-peche}"
    textColor: "{colors.encre-douce}"
    rounded: "{rounded.bandeau}"
    padding: "12px"
---

# Design System: Clamart Handball

## Overview

**Creative North Star: "Le bénévole au bord du terrain"**

L'app parle comme un bénévole du club : chaleureuse, simple, jamais moqueuse. Elle est consultée en quelques secondes, samedi soir ou dimanche, en salle ou en voiture. Le fond est un crème chaud, les cartes sont blanches à grands rayons, le texte est un noir chaud, et le bleu nuit de l'écusson porte les scores et les titres. L'onglet Matchs garde la rigueur d'une app de scores (lignes denses, deux équipes, deux chiffres) ; l'Accueil raconte.

Le système est Material 3 (react-native-paper) habillé aux couleurs du club, Android d'abord, identique sur iOS. Le mode sombre garde le même monde : fond bleu nuit, cartes plus claires, rouge éclairci.

Le contrat de direction évoquait des « ombres douces décalées » ; le build n'en a pas de décalées, seulement l'élévation 1 de Paper (voir Elevation). Le build fait foi.

**Key Characteristics:**
- Crème chaud, cartes blanches, bleu nuit pour les chiffres, rouge uniquement pour l'actionnable.
- Nunito arrondie, chiffres tabulaires pour tous les scores.
- Un résultat = une phrase, jamais un adjectif sur une défaite.
- Cibles tactiles de 48 dp minimum.
- Information jamais portée par la couleur seule.

## Colors

Palette de l'écusson : rouge, bleu nuit et crème, adoucis par des neutres chauds. Source unique : `app/src/theme/couleurs.ts` (seul fichier autorisé à contenir des couleurs en dur). Les clés du frontmatter préfixées `nuit-` sont la palette sombre.

### Primary
- **Rouge club** (#DB0000 ; sombre #FF6B5E) : Material `primary`. Bouton plein (« Ajouter à l'agenda », « Choisir mes équipes »), texte des boutons « text », onglet actif via son conteneur, étoile « suivre » active, indicateur d'actualisation. Texte sur rouge : `onPrimary` #FFFFFF (sombre #2A0A06).
- **Rouge pâle** (#FADAD3 ; sombre #5A1D18) : `primaryContainer` et `secondaryContainer`. Pastille de l'onglet actif et PastilleChoix choisie. Texte dessus : #7A1005 (sombre #FFDAD4).

### Neutral
- **Crème fond** (#FAF6E6 ; sombre #142A3D) : `background`.
- **Carte blanche** (#FFFFFF ; sombre #1E3549) : `surface` et tous les niveaux d'élévation Paper (`level1` à `level5`), de sorte qu'aucune teinte tonale n'est ajoutée.
- **Encre chaude** (#2A2622 ; sombre #F4EFE6) : `onSurface`, texte courant.
- **Encre douce** (#6E655D ; sombre #B4C0CC) : `onSurfaceVariant` et `outline`, métadonnées, libellés secondaires, contour des puces non choisies.
- **Bleu nuit** (#142A3D ; sombre #FFFEF0) : `club.titre`, titres de carte et d'en-tête de section, scores de carte. Il n'est pas un rôle Material : il vient de `t.club.titre`.
- **Filet sable** (#EFE7DC ; sombre #2C4256) : `outlineVariant`, filets de ligne (hairline) et fond des monogrammes.
- **Surligne pêche** (#FFF1E0 ; sombre #26425A) : `surfaceVariant`, bandeau d'état, squelettes de chargement.
- **Snackbar** (fond #142A3D, texte #FFFEF0, action #FFB4A8 ; sombre inversé : fond #FFFEF0, texte #142A3D, action #DB0000) : `inverseSurface`, `inverseOnSurface`, `inversePrimary`.

### Résultat (V / N / D)
- **Victoire** fond #E3F1E8, texte #1B5E3B (sombre #21483A / #BFE8CF).
- **Nul** fond #EBEEF2, texte #3D4A57 (sombre #2C4256 / #D5DCE3).
- **Défaite** fond #F1E9E4, texte #6B4A3E (sombre #4A3430 / #F0D2C6). Un brun sourd, volontairement pas un rouge : la défaite n'est pas une alerte.

### Named Rules
**The Red Is Actionable Rule.** Le rouge n'apparaît que sur ce qu'on peut toucher : bouton plein, texte de bouton, onglet actif, étoile « suivre » active, snackbar-action en sombre. Jamais sur un score, un titre, une défaite ou une décoration. L'écusson, qui est une image, est la seule autre source de rouge.

**The Navy Speaks Rule.** Scores et titres en bleu nuit ; tout ce qui informe est bleu nuit ou encre, tout ce qui invite est rouge.

**The Never Color Alone Rule.** V, N, D sont écrits dans les pastilles ; l'état choisi d'une PastilleChoix porte une coche ; l'étoile change de forme (pleine / contour) en plus de la couleur.

## Typography

**Display / Body Font:** Nunito (Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold), police arrondie humaniste, via `POLICES` dans `theme/theme.ts`.

**Character:** Chaleureuse et lisible en extérieur ; le poids ExtraBold donne aux titres et aux scores une présence de tableau d'affichage sans agressivité.

### Hierarchy
- **Headline small** (ExtraBold 800, 24/32) : salutation de l'Accueil et score de carte (« 15:30 », « 32–22 »).
- **Title large** (ExtraBold 800, 22/28) : nom d'équipe en tête de carte, titre des états sans données.
- **Title medium** (Bold 700, 16/24) : phrase-résultat de la carte, en-tête de section, chiffres de ligne de match.
- **Body large** (Medium 500, 16/24) : noms d'équipes dans LigneMatch (Bold pour le vainqueur).
- **Body medium** (Medium 500, 14/20) : métadonnées, jour, salle, phrase de série.
- **Label large** (Bold 700, 14/20) : rang « 3e sur 11 », détail d'en-tête de section, libellé des puces.
- **Label medium / small** (Medium 500, 12/16 et 11/16) : statut de ligne (« Fin », heure), V/N/D, monogramme (Bold).

### Named Rules
**The Tabular Score Rule.** Tout nombre qui se compare (scores, rang, points, buts, numéros) porte `fontVariant: ['tabular-nums']`, pour que les colonnes restent alignées.

**The Plain Weight Rule.** `fontWeight` reste à `normal` ; le poids se choisit par la famille Nunito. Sur Android, un poids explicite sur une police personnalisée la remplace par Roboto.

**The Scale Respect Rule.** La taille de police système est suivie ; la barre d'onglets plafonne les libellés à 1,5× (`labelMaxFontSizeMultiplier`) pour que quatre libellés tiennent.

## Layout

Une colonne, marge de page de 16 dp, défilement vertical. Rythme d'espacement en 4 / 8 / 12 / 16 / 24 : 4 entre lignes de scores et entre pastilles de forme, 8 pour un logo et son nom, 12 entre cartes et entre éléments d'une rangée, 16 pour le remplissage de carte et les marges latérales, 24 au-dessus d'un en-tête de section (8 en dessous). Rangée de score : texte à gauche (`flex: 1`, passe à la ligne), chiffre à droite. Ordre de l'Accueil : en-tête (écusson, salutation, date des données, réglages), bandeau d'état éventuel, « Mes équipes » en cartes pleine largeur, puis « Tout le club ce week-end » en liste compacte dans une seule carte. Navigation basse à quatre onglets. Respecte les zones sûres (barre d'état protégée, insets de la barre d'onglets).

### Touch-target rule
Toute cible tactile fait au moins 48 dp (`CIBLE = 48` dans `composants/commun.ts`). Obtenu ainsi :
- **IconButton** : `width: 48, height: 48, margin: 0, borderRadius: 24` (réglages, étoile, retour, fermer).
- **Button de Paper** : `contentStyle={CONTENU_BOUTON}` (`minHeight: 48`). Le style va sur le contenu, car `style` ne s'applique qu'à la Surface extérieure et laisserait le bouton à 40 dp.
- **PastilleChoix** : pastille visible de 32 dp dans une cible `minHeight: 48, minWidth: 48`.
- **SegmentedButtons** : chaque bouton reçoit `hitSlop: { top: 6, bottom: 6 }` (`MARGE_TOUCHER` dans VueMatchs, `MARGE_SEGMENT` dans VueEquipe) pour étendre la zone tactile sans changer l'apparence.
- **Lignes** (LigneMatch, CarteEquipe) : toute la ligne ou la carte est un `TouchableRipple`.

## Elevation & Depth

Hybride très discret : les cartes sont des `Surface` Paper à `elevation={1}` (ombre douce et diffuse), et les niveaux tonals de Material sont neutralisés (tous égaux à la couleur de carte) : la profondeur vient de l'ombre, jamais d'un voile coloré. En mode sombre, la séparation vient de l'écart fond #142A3D / carte #1E3549.

### Named Rules
**The Surface + Inner View Rule.** Une carte = une `Surface` (ombre, `borderRadius: rayonCarte`) contenant une `View` (ou un `TouchableRipple borderless`) au même rayon, avec `overflow: 'hidden'` quand elle contient une liste. L'ombre ne peut pas être rognée, le contenu l'est : les lignes de match remplissent les coins arrondis sans les déborder.

**The One Level Rule.** Un seul niveau d'élévation (1). Les éléments à l'intérieur d'une carte restent à plat, séparés par des filets hairline en `outlineVariant`.

## Shapes

Formes arrondies et amicales, avec une échelle courte : cartes à **20 dp** (`rayonCarte`, exposé par `useThemeClub()`), bandeau d'état 12, pastilles de choix 16 (formes en pilule), pastilles V/N/D 6 (petits carrés arrondis de 24 dp), écusson et monogrammes en cercle, boutons Paper en pilule (rayon de base `roundness: 4` du thème, mais pilule imposée par le bouton Material 3). Pas de bordure sur les cartes ; seule la puce non choisie a un contour d'1 dp en `outline`.

## Components

### CarteEquipe (« Mes équipes »)
Carte blanche à 20 dp, remplissage 16, interligne 6. De haut en bas : nom d'équipe (title large, bleu nuit) et rang à droite ; phrase-résultat (title medium) avec le score en headline small bleu nuit à droite ; ligne « jour · salle · domicile/extérieur » ; dernier match ; pastilles de forme ; action. Quatre états : résultat (phrase + score + bouton text « Voir le match »), en attente (« Contre … », « – », « Score pas encore publié »), à venir (heure à droite, bouton plein rouge « Ajouter à l'agenda » avec icône), sans match (« Pas de match ce week-end » + prochain). Une phrase de série (« 3e victoire de suite ») prend la couleur victoire.

### LigneMatch
Rangée façon app de scores, remplissage 12 × 16, filet hairline en bas : statut (« Fin », heure, « Attente », « À fixer ») dans 56 dp à gauche, deux équipes empilées (celle qui reçoit en premier, écusson 24 dp pour Clamart, monogramme 24 dp pour l'adversaire), deux scores à droite en title medium tabulaire. Le vainqueur passe en Bold, le perdant en Medium : poids et non couleur. Score non joué : « – ».

### PastilleResultat / Forme
Carré arrondi 24 dp, lettre V, N ou D en label medium, paire fond/texte résultat. `Forme` les aligne (écart 4) avec un seul label lu : « Forme : victoire, défaite, … ».

### PastilleChoix
Puce de 32 dp dans une cible de 48 dp. Non choisie : contour `outline`, texte `onSurface`. Choisie : fond `secondaryContainer`, texte `onSecondaryContainer`, coche de 18 dp. Rôle `checkbox` (choix multiple) ou `radio` (choix unique), avec `accessibilityState.checked`. Utilisée pour les jours (Matchs) et le choix des équipes (premier lancement).

### BandeauEtat
Bande `surfaceVariant`, rayon 12, remplissage 12, icône de 20 dp et texte body medium en `onSurfaceVariant`. N'apparaît que hors ligne (« Hors ligne · résultats … ») ou si les données sont anciennes ; rôle `alert`. Neutre, jamais rouge.

### EtatSansDonnees
Premier chargement sans cache : trois squelettes (120, 160, 160 dp) à 20 dp de rayon en `surfaceVariant`, libellé « Chargement des résultats ». Erreur : titre bleu nuit centré, explication, un bouton plein 48 dp (« Réessayer » ou « Mettre à jour »).

### EnTeteSection
Titre en title medium bleu nuit, détail optionnel à droite en label large (« 3 matchs »), aligné sur la ligne de base, 24 au-dessus, 8 en dessous, rôle `header`.

### BarreOnglets
`BottomNavigation.Bar` Material 3 branchée sur expo-router : Accueil, Matchs, Équipes, Buteurs, icône de 24 dp, pastille active en rouge pâle, libellés plafonnés à 1,5×. Pas d'invention d'un style propre.

### Écusson
`assets/logo-clamart.png`, rond (`borderRadius` = moitié de la taille), jamais redessiné ni déformé ni recoloré (`accessibilityIgnoresInvertColors`). Tailles : 96 (bienvenue), 48 (en-tête d'Accueil), 28 (fiche match), 24 (LigneMatch). Libellé lu : « Écusson du Clamart Handball ». Le monogramme à deux initiales ne remplace que les adversaires, décoratif et masqué aux lecteurs d'écran.

### Signature : le résultat en une phrase
`phraseResultat` : « Victoire contre X », « Victoire d'un but contre X », « Match nul contre X », « Défaite d'un but contre X ». Sous-titre uniquement pour une série de 3 victoires ou plus. Jamais d'adjectif ni de ton moqueur sur une défaite : la défaite est dite aussi simplement que la victoire, avec la même typographie.

### Noms d'équipes (règles d'affichage)
- `nomLisible` convertit les capitales FFHB en casse lisible (sigles, chiffres romains et numéros conservés, articles en minuscules).
- Affichage seulement : `permettreCesure` ajoute une espace de largeur nulle après un trait d'union entre deux lettres ; `lierNumero` lie le numéro final au mot précédent par une espace insécable ; `rangAffiche` rend « 3e sur 11 » insécable.
- `NOM_SANS_COUPURE` (`android_hyphenationFrequency: 'none'`, `textBreakStrategy: 'simple'`) sur tout nom d'équipe.
- Ces aides ne servent qu'à l'affichage : les libellés d'accessibilité gardent le texte d'origine.

### Accessibilité
Chaque ligne ou carte cliquable porte un `accessibilityLabel` qui dit la phrase entière (« Clamart X 24, Y 22, victoire » ; la carte lit nom, phrase, « 32 à 22 », jour). Les IconButtons sont nommés (« Réglages », « Retour », « Suivre X », « Ne plus suivre X »). Les listes de classement et de buteurs lisent la ligne en une phrase. Rôles `header`, `alert`, `button`, `checkbox`, `radio` posés.

## Do's and Don'ts

### Do:
- **Do** lire les couleurs via `useThemeClub()` (`t.colors.*`, `t.club.*`) ; ne mettre aucun hex ailleurs que dans `theme/couleurs.ts`.
- **Do** réserver le rouge (`primary`) à l'actionnable et le bleu nuit (`club.titre`) aux scores et titres.
- **Do** construire toute carte en `Surface elevation={1}` + vue intérieure au rayon `rayonCarte` (20).
- **Do** donner 48 dp à toute cible : `CONTENU_BOUTON` sur les Button, 48 × 48 sur les IconButton, `hitSlop` sur les SegmentedButtons.
- **Do** passer les scores en `fontVariant: ['tabular-nums']` et choisir le poids par famille Nunito.
- **Do** dire un résultat en une phrase simple, et toujours afficher de quand datent les données.
- **Do** doubler chaque couleur d'état d'un texte, d'une coche ou d'une forme.

### Don't:
- **Don't** utiliser le rouge pour une défaite, un score, un titre ou une décoration.
- **Don't** redessiner, déformer ou recolorer l'écusson.
- **Don't** nommer un joueur mineur ni inventer des photos ou partenaires.
- **Don't** poser un `fontWeight` explicite sur du texte Nunito.
- **Don't** laisser un nom d'équipe se couper en plein mot : `NOM_SANS_COUPURE` et les aides d'affichage.
- **Don't** empiler les niveaux d'élévation ni teinter les surfaces par élévation.
- **Don't** décrire une défaite avec un adjectif.
