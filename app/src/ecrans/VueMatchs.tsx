import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, SegmentedButtons, Surface, Text } from 'react-native-paper';
import { EnTeteSection } from '../composants/EnTeteSection';
import { LigneMatch } from '../composants/LigneMatch';
import { PastilleChoix } from '../composants/PastilleChoix';
import { jourLocal, libelleJour } from '../donnees/dates';
import { grouperParCategorie, jourParDefaut, joursAvecMatchs, matchsDuJour } from '../donnees/selecteurs';
import type { Club } from '../donnees/types';
import { useThemeClub } from '../theme/theme';

interface Props {
  club: Club;
  maintenant: Date;
  suivis: string[];
  onOuvrirMatch: (id: string) => void;
  rafraichir?: () => void;
  rafraichissement?: boolean;
}

type Filtre = 'mes' | 'tous';

/** Les segments de Paper mesurent 40 dp : 6 dp de marge de toucher de chaque côté portent la cible à 52 dp. */
const MARGE_TOUCHER = { top: 6, bottom: 6 };
const SEGMENTS = [
  { value: 'mes', label: 'Mes équipes', hitSlop: MARGE_TOUCHER },
  { value: 'tous', label: 'Tout le club', hitSlop: MARGE_TOUCHER },
];

export function VueMatchs({ club, maintenant, suivis, onOuvrirMatch, rafraichir, rafraichissement = false }: Props) {
  const t = useThemeClub();
  const jours = useMemo(() => joursAvecMatchs(club), [club]);
  // On ne retient que le choix de l'utilisateur : le jour affiché suit toujours les données.
  const [jourChoisi, setJourChoisi] = useState<string>();
  const jour = jourChoisi && jours.includes(jourChoisi) ? jourChoisi : jourParDefaut(jours, jourLocal(maintenant));
  const barreJours = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const amener = useCallback((j: string | undefined) => {
    const x = j === undefined ? undefined : positions.current[j];
    if (x !== undefined) barreJours.current?.scrollTo({ x: Math.max(0, x - 16), animated: false });
  }, []);
  useEffect(() => amener(jour), [jour, amener]);
  const [filtre, setFiltre] = useState<Filtre>(suivis.length ? 'mes' : 'tous');
  const matchs = jour
    ? matchsDuJour(club, jour).filter((m) => filtre === 'tous' || suivis.includes(m.equipe.collectif))
    : [];
  const groupes = grouperParCategorie(matchs);

  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: t.colors.background }}>
        <Appbar.Content title="Matchs" titleStyle={{ color: t.club.titre }} />
      </Appbar.Header>
      {jours.length > 0 ? (
        <>
          <ScrollView
            ref={barreJours}
            horizontal
            showsHorizontalScrollIndicator={false}
            accessibilityRole="radiogroup"
            accessibilityLabel="Jour du match"
            style={styles.barreJours}
            contentContainerStyle={styles.jours}
          >
            {jours.map((j) => (
              <View
                key={j}
                testID={`jour-${j}`}
                onLayout={(e) => {
                  positions.current[j] = e.nativeEvent.layout.x;
                  if (j === jour) amener(j);
                }}
              >
                <PastilleChoix role="radio" libelle={libelleJour(j)} choisie={j === jour} onPress={() => setJourChoisi(j)} />
              </View>
            ))}
          </ScrollView>
          <SegmentedButtons
            style={styles.filtre}
            value={filtre}
            onValueChange={(v) => setFiltre(v as Filtre)}
            buttons={SEGMENTS}
          />
        </>
      ) : null}
      <ScrollView
        testID="liste-matchs"
        contentContainerStyle={styles.contenu}
        refreshControl={rafraichir ? <RefreshControl refreshing={rafraichissement} onRefresh={rafraichir} colors={[t.colors.primary]} /> : undefined}
      >
        {groupes.length === 0 ? (
          <View style={styles.vide}>
            <Text variant="bodyLarge" style={[styles.centrer, { color: t.colors.onSurfaceVariant }]}>
              {jours.length === 0 ? 'Aucun match programmé pour le moment.' : 'Aucun match de vos équipes ce jour-là.'}
            </Text>
            {jours.length > 0 && filtre === 'mes' ? (
              <Button mode="text" onPress={() => setFiltre('tous')}>
                Voir tout le club
              </Button>
            ) : null}
          </View>
        ) : (
          groupes.map((g) => (
            <View key={g.categorie}>
              <EnTeteSection titre={g.titre} />
              <Surface style={{ borderRadius: t.rayonCarte }} elevation={1}>
                <View style={[styles.liste, { borderRadius: t.rayonCarte }]}>
                  {g.matchs.map((m) => (
                    <LigneMatch key={`${m.equipe.id}-${m.id}`} match={m} maintenant={maintenant} afficherCompetition onPress={() => onOuvrirMatch(m.id)} />
                  ))}
                </View>
              </Surface>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  barreJours: { flexGrow: 0 },
  jours: { gap: 8, paddingHorizontal: 16 },
  filtre: { marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  liste: { overflow: 'hidden' },
  vide: { paddingTop: 48, alignItems: 'center', gap: 8 },
  centrer: { textAlign: 'center' },
});
