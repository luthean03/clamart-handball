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
