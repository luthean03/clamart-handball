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
    : `Les résultats n'ont pas été mis à jour depuis le ${libelleJour(jourLocal(new Date(miseAJour)))}`;
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
