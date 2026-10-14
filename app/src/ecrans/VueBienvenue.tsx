import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, Text, TouchableRipple } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collectifsParCategorie } from '../donnees/selecteurs';
import type { Club } from '../donnees/types';
import { useThemeClub } from '../theme/theme';

const LOGO = require('../../assets/logo-clamart.png');

interface Props {
  club: Club;
  onTerminer: (ids: string[]) => void;
  onPasser: () => void;
}

/** Puce de choix : pastille de 32 dp au minimum, dans une cible tactile de 48 dp. L'état choisi est aussi marqué par une coche. */
function ChoixEquipe({ nom, choisie, onPress }: { nom: string; choisie: boolean; onPress: () => void }) {
  const t = useThemeClub();
  const couleur = choisie ? t.colors.onSecondaryContainer : t.colors.onSurface;
  return (
    <TouchableRipple
      borderless
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: choisie }}
      style={styles.cible}
    >
      <View
        style={[
          styles.pastille,
          { borderColor: choisie ? t.colors.secondaryContainer : t.colors.outline },
          choisie && { backgroundColor: t.colors.secondaryContainer },
        ]}
      >
        {choisie ? <Icon source="check" size={18} color={couleur} /> : null}
        <Text variant="labelLarge" style={{ color: couleur }}>
          {nom}
        </Text>
      </View>
    </TouchableRipple>
  );
}

export function VueBienvenue({ club, onTerminer, onPasser }: Props) {
  const t = useThemeClub();
  const encarts = useSafeAreaInsets();
  const [choisis, setChoisis] = useState<string[]>([]);
  const basculer = (id: string) => setChoisis((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <View style={[styles.page, { backgroundColor: t.colors.background, paddingTop: encarts.top + 24, paddingBottom: encarts.bottom + 16 }]}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Image source={LOGO} style={styles.logo} accessible accessibilityLabel="Écusson du Clamart Handball" accessibilityIgnoresInvertColors />
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
                <ChoixEquipe key={c.id} nom={c.nom} choisie={choisis.includes(c.id)} onPress={() => basculer(c.id)} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.actions}>
        <Button mode="contained" onPress={() => onTerminer(choisis)}>
          {choisis.length ? `Continuer (${choisis.length})` : 'Continuer'}
        </Button>
        <Button mode="text" onPress={onPasser}>
          Passer
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16 },
  contenu: { gap: 16, paddingBottom: 16 },
  logo: { width: 96, height: 96, borderRadius: 48, alignSelf: 'center' },
  centrer: { textAlign: 'center' },
  groupe: { gap: 8 },
  puces: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8 },
  cible: { minHeight: 48, minWidth: 48, justifyContent: 'center', borderRadius: 24 },
  pastille: { minHeight: 32, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
  actions: { gap: 4 },
});
