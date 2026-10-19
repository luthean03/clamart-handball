import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONTENU_BOUTON } from '../composants/commun';
import { EcussonClub } from '../composants/Ecusson';
import { PastilleChoix } from '../composants/PastilleChoix';
import { ProtectionBarreEtat } from '../composants/ProtectionBarreEtat';
import { collectifsParCategorie } from '../donnees/selecteurs';
import type { Club } from '../donnees/types';
import { useThemeClub } from '../theme/theme';

interface Props {
  club: Club;
  onTerminer: (ids: string[]) => void;
  onPasser: () => void;
}

export function VueBienvenue({ club, onTerminer, onPasser }: Props) {
  const t = useThemeClub();
  const encarts = useSafeAreaInsets();
  const [choisis, setChoisis] = useState<string[]>([]);
  const basculer = (id: string) => setChoisis((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <View style={[styles.page, { backgroundColor: t.colors.background, paddingBottom: encarts.bottom + 16 }]}>
      <ProtectionBarreEtat />
      <ScrollView contentContainerStyle={styles.contenu}>
        <View style={styles.logo}>
          <EcussonClub taille={96} libelle="Écusson du Clamart Handball" />
        </View>
        <Text variant="headlineSmall" style={[styles.centrer, { color: t.club.titre }]} accessibilityRole="header">
          Bienvenue au Clamart Handball
        </Text>
        <Text variant="bodyLarge" style={[styles.centrer, { color: t.colors.onSurfaceVariant }]}>
          Quelles équipes suivez-vous ? Leurs résultats s'afficheront en premier.
        </Text>
        {collectifsParCategorie(club).map((g) => (
          <View key={g.categorie} style={styles.groupe}>
            <Text variant="titleMedium" style={{ color: t.club.titre }}>
              {g.titre}
            </Text>
            <View style={styles.puces}>
              {g.collectifs.map((c) => (
                <PastilleChoix key={c.id} role="checkbox" libelle={c.nom} choisie={choisis.includes(c.id)} onPress={() => basculer(c.id)} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.actions}>
        <Button mode="contained" contentStyle={CONTENU_BOUTON} onPress={() => onTerminer(choisis)}>
          {choisis.length ? `Continuer (${choisis.length})` : 'Continuer'}
        </Button>
        <Button mode="text" contentStyle={CONTENU_BOUTON} onPress={onPasser}>
          Passer
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { alignSelf: 'center' },
  page: { flex: 1, paddingHorizontal: 16 },
  contenu: { gap: 16, paddingTop: 24, paddingBottom: 16 },
  centrer: { textAlign: 'center' },
  groupe: { gap: 8 },
  puces: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8 },
  actions: { gap: 4 },
});
