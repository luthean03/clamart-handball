import { Linking, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { URL_PLAY_STORE } from '../config';
import { useThemeClub } from '../theme/theme';
import { CONTENU_BOUTON } from './commun';

interface Props {
  chargement: boolean;
  erreur: Error | null;
  reessayer: () => void;
}

/** Premier chargement sans aucune donnée en cache : squelettes, ou erreur avec une action. */
export function EtatSansDonnees({ chargement, erreur, reessayer }: Props) {
  const t = useThemeClub();
  const haut = useSafeAreaInsets().top;
  if (chargement) {
    return (
      <View style={[styles.page, { paddingTop: haut + 24, backgroundColor: t.colors.background }]} accessible accessibilityLabel="Chargement des résultats">
        {[120, 160, 160].map((hauteur, i) => (
          <View key={i} style={{ height: hauteur, borderRadius: t.rayonCarte, backgroundColor: t.colors.surfaceVariant }} />
        ))}
      </View>
    );
  }
  const majRequise = erreur?.name === 'SchemaInconnu';
  return (
    <View style={[styles.page, styles.centre, { backgroundColor: t.colors.background }]}>
      <Text variant="titleLarge" style={[styles.centrer, { color: t.club.titre }]}>
        {majRequise ? "Une nouvelle version de l'app est nécessaire" : 'Impossible de charger les résultats'}
      </Text>
      <Text variant="bodyMedium" style={[styles.centrer, { color: t.colors.onSurfaceVariant }]}>
        {majRequise
          ? 'Le format des résultats a changé. Mettez l’app à jour depuis le Play Store.'
          : 'Vérifiez votre connexion internet, puis réessayez.'}
      </Text>
      {majRequise ? (
        <Button mode="contained" contentStyle={CONTENU_BOUTON} onPress={() => Linking.openURL(URL_PLAY_STORE).catch(() => {})}>
          Mettre à jour
        </Button>
      ) : (
        <Button mode="contained" contentStyle={CONTENU_BOUTON} onPress={reessayer}>
          Réessayer
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, gap: 12 },
  centre: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  centrer: { textAlign: 'center' },
});
