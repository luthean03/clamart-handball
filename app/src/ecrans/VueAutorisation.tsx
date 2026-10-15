import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONTENU_BOUTON } from '../composants/commun';
import { ProtectionBarreEtat } from '../composants/ProtectionBarreEtat';
import { useThemeClub } from '../theme/theme';

export function VueAutorisation({ onActiver, onPlusTard }: { onActiver: () => void; onPlusTard: () => void }) {
  const t = useThemeClub();
  const encarts = useSafeAreaInsets();
  return (
    <View style={[styles.page, { backgroundColor: t.colors.background, paddingBottom: encarts.bottom + 16 }]}>
      <ProtectionBarreEtat />
      <View style={styles.contenu}>
        <Icon source="bell-ring-outline" size={64} color={t.club.titre} />
        <Text variant="headlineSmall" style={[styles.centrer, { color: t.club.titre }]} accessibilityRole="header">
          Recevoir les résultats de vos équipes ?
        </Text>
        <Text variant="bodyLarge" style={[styles.centrer, { color: t.colors.onSurfaceVariant }]}>
          Une notification dès que le score est publié. Le rappel la veille du match peut s’activer dans les réglages.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button mode="contained" contentStyle={CONTENU_BOUTON} onPress={onActiver}>Activer les notifications</Button>
        <Button mode="text" contentStyle={CONTENU_BOUTON} onPress={onPlusTard}>Plus tard</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16 },
  contenu: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  centrer: { textAlign: 'center' },
  actions: { gap: 4 },
});
