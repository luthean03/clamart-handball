import { Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EcranErreur } from '../composants/EcranErreur';
import { brancherPremierPlan, creerClientRequetes, persisteur, UN_MOIS } from '../donnees/requetes';
import { GestionNotifications } from '../notifications/GestionNotifications';
import { idFicheMatch } from '../notifications/liens';
import { themeClair, themeSombre } from '../theme/theme';

SplashScreen.preventAutoHideAsync();

/** Une erreur d'affichage non rattrapée montre un écran de secours avec « Réessayer » au lieu de fermer l'app. */
export const ErrorBoundary = EcranErreur;

export default function Racine() {
  const [client] = useState(creerClientRequetes);
  const [polices, erreurPolices] = useFonts({ Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold });
  const sombre = useColorScheme() === 'dark';
  const pret = polices || erreurPolices !== null;

  useEffect(() => brancherPremierPlan(), []);
  useEffect(() => {
    if (pret) SplashScreen.hideAsync();
  }, [pret]);
  if (!pret) return null;

  const theme = sombre ? themeSombre : themeClair;
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={client} persistOptions={{ persister: persisteur, maxAge: UN_MOIS }}>
        <PaperProvider theme={theme}>
          <StatusBar style={sombre ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
            <Stack.Screen name="match/[id]" dangerouslySingular={idFicheMatch} />
          </Stack>
          <GestionNotifications />
        </PaperProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
