import type { TextProps, ViewStyle } from 'react-native';

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
