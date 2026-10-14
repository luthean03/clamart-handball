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
