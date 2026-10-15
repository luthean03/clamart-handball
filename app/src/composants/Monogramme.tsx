import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { initiales } from '../donnees/phrase';
import { POLICES, useThemeClub } from '../theme/theme';

/** Écusson de remplacement d'un adversaire : ses deux initiales. Décoratif, jamais lu par les lecteurs d'écran. */
export function Monogramme({ nom, taille }: { nom: string; taille: number }) {
  const t = useThemeClub();
  return (
    <View
      testID="monogramme"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.disque, { width: taille, height: taille, borderRadius: taille / 2, backgroundColor: t.colors.outlineVariant }]}
    >
      <Text variant="labelSmall" style={[styles.initiales, { color: t.colors.onSurfaceVariant }]}>
        {initiales(nom)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disque: { alignItems: 'center', justifyContent: 'center' },
  initiales: { fontFamily: POLICES.gras, textAlign: 'center' },
});
