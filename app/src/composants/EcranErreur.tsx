import { StyleSheet, useColorScheme, View } from 'react-native';
import { Button, PaperProvider, Text } from 'react-native-paper';
import { reessayerApresErreur } from '../donnees/requetes';
import { themeClair, themeSombre } from '../theme/theme';
import { CONTENU_BOUTON } from './commun';

interface Props {
  error: Error;
  retry: () => Promise<void>;
}

/**
 * Écran de dernier recours (ErrorBoundary d'expo-router). Il remplace la racine, donc hors du fournisseur de thème :
 * il choisit lui-même le thème clair ou sombre et ne montre jamais le message technique.
 */
export function EcranErreur({ retry }: Props) {
  const theme = useColorScheme() === 'dark' ? themeSombre : themeClair;
  return (
    <PaperProvider theme={theme}>
      <View testID="ecran-erreur" style={[styles.page, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleLarge" accessibilityRole="header" style={[styles.centrer, { color: theme.club.titre }]}>
          Un problème est survenu
        </Text>
        <Text variant="bodyMedium" style={[styles.centrer, { color: theme.colors.onSurfaceVariant }]}>
          L'application n'a pas pu afficher cet écran. Vos équipes suivies sont conservées.
        </Text>
        <Button mode="contained" contentStyle={CONTENU_BOUTON} onPress={() => void reessayerApresErreur(retry)}>
          Réessayer
        </Button>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, gap: 16, justifyContent: 'center', alignItems: 'center' },
  centrer: { textAlign: 'center' },
});
