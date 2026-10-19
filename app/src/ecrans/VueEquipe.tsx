import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, SegmentedButtons, Surface, Text } from 'react-native-paper';
import { CONTENU_BOUTON, MARGE_SEGMENT, NOM_SANS_COUPURE } from '../composants/commun';
import { EnTeteSection } from '../composants/EnTeteSection';
import { LigneMatch } from '../composants/LigneMatch';
import { lierNumero, nomLisible, ordinal, permettreCesure, rangAffiche } from '../donnees/phrase';
import { equipePrincipale, equipesDuCollectif, matchsDuCollectif } from '../donnees/selecteurs';
import type { Club } from '../donnees/types';
import { POLICES, useThemeClub } from '../theme/theme';

interface Props {
  club: Club;
  collectifId: string;
  maintenant: Date;
  suivi: boolean;
  onBasculer: () => void;
  onOuvrirMatch: (id: string) => void;
  onRetour: () => void;
  /** « S'abonner au calendrier » : ouvre le panneau d'agenda, en mode saison. */
  onAgenda: () => void;
}

type Onglet = 'matchs' | 'classement';

function Carte({ children }: { children: ReactNode }) {
  const t = useThemeClub();
  return (
    <Surface style={{ borderRadius: t.rayonCarte }} elevation={1}>
      <View style={[styles.liste, { borderRadius: t.rayonCarte }]}>{children}</View>
    </Surface>
  );
}

export function VueEquipe({ club, collectifId, maintenant, suivi, onBasculer, onOuvrirMatch, onRetour, onAgenda }: Props) {
  const t = useThemeClub();
  // On ne retient que le choix de l'utilisateur : l'onglet affiché est recalculé depuis les données.
  const [ongletChoisi, setOngletChoisi] = useState<Onglet>('matchs');
  const collectif = club.collectifs.find((c) => c.id === collectifId);

  if (!collectif) {
    return (
      <View style={[styles.page, { backgroundColor: t.colors.background }]}>
        <Appbar.Header style={{ backgroundColor: t.colors.background }}>
          <Appbar.BackAction onPress={onRetour} accessibilityLabel="Retour" style={styles.action} />
        </Appbar.Header>
        <View style={styles.vide}>
          <Text variant="titleLarge" style={{ color: t.club.titre }}>Équipe introuvable</Text>
          <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>Elle ne figure plus dans les résultats de la saison.</Text>
        </View>
      </View>
    );
  }

  const equipes = equipesDuCollectif(club, collectifId);
  const principale = equipePrincipale(club, collectifId);
  const classements = equipes.filter((e) => (e.classement?.length ?? 0) > 0);
  const avecClassement = classements.length > 0;
  const onglets = [
    { value: 'matchs', label: 'Matchs', hitSlop: MARGE_SEGMENT },
    ...(avecClassement ? [{ value: 'classement', label: 'Classement', hitSlop: MARGE_SEGMENT }] : []),
  ];
  const onglet = ongletChoisi === 'classement' && !avecClassement ? 'matchs' : ongletChoisi;

  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: t.colors.background }}>
        <Appbar.BackAction onPress={onRetour} accessibilityLabel="Retour" style={styles.action} />
        <Appbar.Content title={lierNumero(collectif.nom)} titleStyle={{ color: t.club.titre }} />
        <Appbar.Action
          icon={suivi ? 'star' : 'star-outline'}
          color={suivi ? t.colors.primary : t.colors.onSurfaceVariant}
          accessibilityLabel={suivi ? `Ne plus suivre ${collectif.nom}` : `Suivre ${collectif.nom}`}
          style={styles.action}
          onPress={onBasculer}
        />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>
          {[...new Set(equipes.map((e) => e.detail))].join(' · ')}
          {principale?.place && principale.nb_equipes ? ` · ${rangAffiche(principale.place, principale.nb_equipes)}` : ''}
        </Text>
        <SegmentedButtons style={styles.onglets} value={onglet} onValueChange={(v) => setOngletChoisi(v as Onglet)} buttons={onglets} />

        {onglet === 'matchs' ? (
          <>
            <Carte>
              {matchsDuCollectif(club, collectifId).map((m) => (
                <LigneMatch key={`${m.equipe.id}-${m.id}`} match={m} maintenant={maintenant} afficherCompetition onPress={() => onOuvrirMatch(m.id)} />
              ))}
            </Carte>
            <Button mode="contained-tonal" icon="calendar-sync" contentStyle={CONTENU_BOUTON} style={styles.abonner} onPress={onAgenda}>
              S'abonner au calendrier
            </Button>
          </>
        ) : null}

        {onglet === 'classement'
          ? classements.map((e) => (
              <View key={e.id}>
                <EnTeteSection titre={e.poule ? `${e.detail} · ${nomLisible(e.poule)}` : e.detail} />
                <Carte>
                  <View style={[styles.rangee, { borderBottomColor: t.colors.outlineVariant }]}>
                    <Text variant="labelMedium" style={[styles.place, { color: t.colors.onSurfaceVariant }]}>#</Text>
                    <Text variant="labelMedium" style={[styles.nomClassement, { color: t.colors.onSurfaceVariant }]}>Équipe</Text>
                    <Text variant="labelMedium" style={[styles.nombre, { color: t.colors.onSurfaceVariant }]}>Pts</Text>
                    <Text variant="labelMedium" style={[styles.nombre, { color: t.colors.onSurfaceVariant }]}>J</Text>
                    <Text variant="labelMedium" style={[styles.nombre, { color: t.colors.onSurfaceVariant }]}>Diff</Text>
                  </View>
                  {e.classement!.map((l) => {
                    const gras = l.nous ? { fontFamily: POLICES.gras, color: t.club.titre } : { color: t.colors.onSurface };
                    return (
                      <View
                        key={`${l.place}-${l.equipe}`}
                        style={[styles.rangee, { borderBottomColor: t.colors.outlineVariant }, l.nous && { backgroundColor: t.colors.surfaceVariant }]}
                        accessible
                        accessibilityLabel={`${ordinal(l.place ?? 0)}, ${nomLisible(l.equipe)}, ${l.points} points, ${l.joues} matchs joués, différence ${l.diff}`}
                      >
                        <Text variant="bodyMedium" style={[styles.place, gras]}>{l.place}</Text>
                        <Text variant="bodyMedium" numberOfLines={3} {...NOM_SANS_COUPURE} style={[styles.nomClassement, gras]}>
                          {lierNumero(permettreCesure(nomLisible(l.equipe)))}
                        </Text>
                        <Text variant="bodyMedium" style={[styles.nombre, gras]}>{l.points}</Text>
                        <Text variant="bodyMedium" style={[styles.nombre, gras]}>{l.joues}</Text>
                        <Text variant="bodyMedium" style={[styles.nombre, gras]}>{l.diff}</Text>
                      </View>
                    );
                  })}
                </Carte>
              </View>
            ))
          : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  onglets: { marginVertical: 12 },
  liste: { overflow: 'hidden' },
  action: { width: 48, height: 48, margin: 0, borderRadius: 24 },
  abonner: { marginTop: 16 },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  place: { minWidth: 24, fontVariant: ['tabular-nums'] },
  nomClassement: { flex: 1 },
  nombre: { minWidth: 36, textAlign: 'right', fontVariant: ['tabular-nums'] },
  vide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
});
