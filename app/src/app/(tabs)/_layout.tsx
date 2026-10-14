import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import type { ColorValue } from 'react-native';
import { Icon } from 'react-native-paper';
import { BarreOnglets } from '../../composants/BarreOnglets';
import { useClub } from '../../donnees/requetes';
import { useSuivi, useSuiviPret } from '../../suivi/suivi';

const icone = (plein: string, vide: string) =>
  ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Icon source={focused ? plein : vide} color={typeof color === 'string' ? color : undefined} size={size} />
  );

export default function Onglets() {
  const pret = useSuiviPret();
  const bienvenueFaite = useSuivi((s) => s.bienvenueFaite);
  const { club } = useClub();

  useEffect(() => {
    // Collecte partielle (une compétition en échec) : ne pas désabonner les équipes absentes.
    if (club && club.erreurs.length === 0) useSuivi.getState().retirerInconnus(club.collectifs.map((c) => c.id));
  }, [club]);

  if (!pret) return null;
  if (!bienvenueFaite) return <Redirect href="/bienvenue" />;
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BarreOnglets {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: icone('home-variant', 'home-variant-outline') }} />
      <Tabs.Screen name="matchs" options={{ title: 'Matchs', tabBarIcon: icone('calendar-month', 'calendar-month-outline') }} />
    </Tabs>
  );
}
