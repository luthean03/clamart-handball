import { Linking, StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';
import { URL_PLAY_STORE } from '../config';
import { donneesAnciennes, jourLocal, libelleJour, libelleMiseAJour } from '../donnees/dates';
import { useThemeClub } from '../theme/theme';
import { CONTENU_BOUTON } from './commun';

interface Props {
  majRequise: boolean;
  horsLigne: boolean;
  miseAJour: string;
  maintenant: Date;
}

/** Signale une mise à jour de l'app requise, des données hors ligne ou anciennes. Ne rend rien quand tout va bien. */
export function BandeauEtat({ majRequise, horsLigne, miseAJour, maintenant }: Props) {
  const t = useThemeClub();
  const ancien = donneesAnciennes(miseAJour, maintenant);
  if (majRequise) {
    return (
      <View style={[styles.bandeau, styles.colonne, { backgroundColor: t.colors.surfaceVariant }]} accessibilityRole="alert">
        <View style={styles.rangee}>
          <Icon source="update" size={20} color={t.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={[styles.texte, { color: t.colors.onSurfaceVariant }]}>
            Une nouvelle version de l'app est nécessaire pour voir les derniers résultats.
          </Text>
        </View>
        <Button mode="contained" contentStyle={CONTENU_BOUTON} style={styles.bouton} onPress={() => Linking.openURL(URL_PLAY_STORE).catch(() => {})}>
          Mettre à jour
        </Button>
      </View>
    );
  }
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
  colonne: { flexDirection: 'column', alignItems: 'stretch' },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bouton: { alignSelf: 'flex-start' },
  texte: { flex: 1 },
});
