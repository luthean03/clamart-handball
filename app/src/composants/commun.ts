import type { TextProps, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Cible tactile minimale (dp). */
export const CIBLE = 48;

/**
 * Hauteur minimale d'un `Button` de Paper : elle va sur `contentStyle`, qui porte la zone tactile
 * (le `style` ne s'applique qu'à la Surface extérieure et laisse le bouton à 40 dp).
 */
export const CONTENU_BOUTON: ViewStyle = { minHeight: CIBLE };

/** Noms d'équipes : jamais de césure ni de coupure en plein mot (« Boulogne-Billanc / ourt »). */
export const NOM_SANS_COUPURE: Pick<TextProps, 'android_hyphenationFrequency' | 'textBreakStrategy'> = {
  android_hyphenationFrequency: 'none',
  textBreakStrategy: 'simple',
};

/** Les segments de Paper (40 dp) gagnent 6 dp de marge de toucher de chaque côté : 52 dp. */
export const MARGE_SEGMENT = { top: 6, bottom: 6 };

/** Hauteur de la barre de navigation Material 3 (dp), hors zone de la barre de gestes. */
export const HAUTEUR_BARRE_ONGLETS = 80;

/** `wrapperStyle` d'un Snackbar affiché dans un onglet : posé au-dessus de la barre d'onglets, pas par-dessus. */
export function useDecalageBandeau(): ViewStyle {
  return { bottom: HAUTEUR_BARRE_ONGLETS + useSafeAreaInsets().bottom };
}
