import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { useSuivi } from '../suivi/suivi';
import { themePour, type ThemeClub } from './theme';

/** Le thème choisi dans Réglages (ou celui du téléphone si « Automatique »). */
export function useThemeChoisi(): ThemeClub {
  const apparence = useSuivi((s) => s.apparence);
  return themePour(apparence, useColorScheme());
}

/** Navigation : même palette que l'app, pour que les fonds et la barre suivent le choix. */
function themeNavigation(t: ThemeClub): Theme {
  return {
    ...(t.dark ? DarkTheme : DefaultTheme),
    dark: t.dark,
    colors: {
      primary: t.club.action,
      background: t.club.fond,
      card: t.club.carte,
      text: t.club.texte,
      border: t.club.ligne,
      notification: t.club.action,
    },
  };
}

export function FournisseurTheme({ children }: { children: ReactNode }) {
  const theme = useThemeChoisi();
  return (
    <ThemeProvider value={themeNavigation(theme)}>
      <PaperProvider theme={theme}>
        <StatusBar style={theme.dark ? 'light' : 'dark'} />
        {children}
      </PaperProvider>
    </ThemeProvider>
  );
}
