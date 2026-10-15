import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeClub } from '../theme/theme';

/**
 * Écran bord à bord sans barre d'application : une bande fixe de la hauteur de la barre d'état, de la couleur du fond,
 * placée au-dessus du contenu défilant pour que celui-ci ne passe jamais sous l'heure et les icônes du téléphone.
 */
export function ProtectionBarreEtat() {
  const t = useThemeClub();
  const haut = useSafeAreaInsets().top;
  return <View testID="protection-barre-etat" style={{ height: haut, backgroundColor: t.colors.background }} />;
}
