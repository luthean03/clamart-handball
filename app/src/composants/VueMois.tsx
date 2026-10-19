import { useCallback, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import {
  FlatList, ScrollView, StyleSheet, useWindowDimensions, View,
  type NativeScrollEvent, type NativeSyntheticEvent, type RefreshControlProps,
} from 'react-native';
import { IconButton, Text, TouchableRipple } from 'react-native-paper';
import { jourDuMatch, jourLocal, jourLu, libelleMois, titreJour } from '../donnees/dates';
import { grilleMois, matchsParJour } from '../donnees/liste';
import type { MatchAvecEquipe } from '../donnees/types';
import { POLICES, useThemeClub } from '../theme/theme';
import { CIBLE } from './commun';
import { LigneMatch } from './LigneMatch';

interface Props {
  /** Matchs déjà filtrés (« Mes équipes » / « Tout le club ») ; les non datés sont ignorés. */
  matchs: MatchAvecEquipe[];
  /** Mois 'AAAA-MM' de la saison, dans l'ordre. */
  mois: string[];
  moisInitial: string;
  maintenant: Date;
  onOuvrirMatch: (id: string) => void;
  /** Affiché sous la grille à la place des matchs quand le filtre n'en laisse aucun de toute la saison. */
  vide?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
}

const INITIALES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const POINTS_MAX = 3;
const nbMatchs = (n: number) => `${n} match${n > 1 ? 's' : ''}`;

/** En-tête de jour des listes de matchs (« Sam. 17 octobre »), lu en toutes lettres. */
export function EnTeteJour({ jour, detail }: { jour: string; detail?: string }) {
  const t = useThemeClub();
  const suite = detail ? ` · ${detail}` : '';
  return (
    <View
      style={styles.enteteJour}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${jourLu(jour)}${detail ? `, ${detail}` : ''}`}
    >
      <Text variant="labelMedium" style={[styles.texteJour, { color: t.club.titre }]}>
        {`${titreJour(jour)}${suite}`}
      </Text>
    </View>
  );
}

/** Vue mois de l'onglet Matchs : grilles paginées par glissement, un point par match, les matchs du mois dessous. */
export function VueMois({ matchs, mois, moisInitial, maintenant, onOuvrirMatch, vide, refreshControl }: Props) {
  const t = useThemeClub();
  const { width: largeur } = useWindowDimensions();
  // On ne retient que le mois choisi par l'utilisateur ; sans choix (ou s'il disparaît des données), le mois d'ouverture.
  const [moisChoisi, setMoisChoisi] = useState<string>();
  const affiche = moisChoisi && mois.includes(moisChoisi) ? moisChoisi : moisInitial;
  const index = mois.indexOf(affiche);
  const aujourdhui = jourLocal(maintenant);
  const grilles = useRef<FlatList<string>>(null);
  const defilement = useRef<ScrollView>(null);
  const hautListe = useRef(0);
  const positions = useRef<Record<string, number>>({});

  const jours = useMemo(
    () => matchsParJour(matchs.filter((m) => m.date !== null && jourDuMatch(m.date).startsWith(affiche))),
    [matchs, affiche],
  );

  // Les grilles dépendent aussi du filtre, du mois affiché et du jour : la FlatList doit les redessiner.
  const rafraichirGrilles = useMemo(() => ({ affiche, aujourdhui, matchs }), [affiche, aujourdhui, matchs]);

  const aller = (i: number) => {
    if (i < 0 || i >= mois.length) return;
    setMoisChoisi(mois[i]);
    grilles.current?.scrollToIndex({ index: i, animated: true });
  };
  const finGlissement = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const choisi = mois[Math.round(e.nativeEvent.contentOffset.x / largeur)];
    if (choisi) setMoisChoisi(choisi);
  };
  const allerAuJour = useCallback((jour: string) => {
    const y = positions.current[jour];
    if (y !== undefined) defilement.current?.scrollTo({ y: Math.max(0, hautListe.current + y - 8), animated: true });
  }, []);

  return (
    <ScrollView ref={defilement} testID="mois-matchs" contentContainerStyle={styles.contenu} refreshControl={refreshControl}>
      <View style={styles.titreMois}>
        <IconButton
          icon="chevron-left"
          accessibilityLabel="Mois précédent"
          iconColor={t.club.titre}
          disabled={index <= 0}
          style={styles.icone}
          onPress={() => aller(index - 1)}
        />
        <Text variant="titleMedium" accessibilityRole="header" style={{ color: t.club.titre }}>
          {libelleMois(affiche)}
        </Text>
        <IconButton
          icon="chevron-right"
          accessibilityLabel="Mois suivant"
          iconColor={t.club.titre}
          disabled={index >= mois.length - 1}
          style={styles.icone}
          onPress={() => aller(index + 1)}
        />
      </View>
      <FlatList
        // Une saison qui change d'étendue (données reçues) repart sur le mois affiché.
        key={`${mois[0]}-${mois[mois.length - 1]}`}
        ref={grilles}
        testID="grilles-mois"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={mois}
        extraData={rafraichirGrilles}
        keyExtractor={(m) => m}
        getItemLayout={(_, i) => ({ length: largeur, offset: largeur * i, index: i })}
        initialScrollIndex={Math.max(0, index)}
        onMomentumScrollEnd={finGlissement}
        renderItem={({ item }) => (
          // Seule la grille affichée est lue par les lecteurs d'écran ; les autres mois restent à portée de glissement.
          <View
            style={[styles.page, { width: largeur }]}
            accessibilityElementsHidden={item !== affiche}
            importantForAccessibility={item === affiche ? 'auto' : 'no-hide-descendants'}
          >
            <Grille mois={item} matchs={matchs} aujourdhui={aujourdhui} onJour={allerAuJour} />
          </View>
        )}
      />
      <View
        style={styles.liste}
        testID="liste-du-mois"
        onLayout={(e) => {
          hautListe.current = e.nativeEvent.layout.y;
        }}
      >
        {vide ??
          (jours.length === 0 ? (
            <Text variant="bodyLarge" style={[styles.aucun, { color: t.colors.onSurfaceVariant }]}>
              Aucun match ce mois-ci.
            </Text>
          ) : (
            jours.map(({ jour, matchs: duJour }) => (
              <View
                key={jour}
                testID={`groupe-${jour}`}
                onLayout={(e) => {
                  positions.current[jour] = e.nativeEvent.layout.y;
                }}
              >
                <EnTeteJour jour={jour} detail={nbMatchs(duJour.length)} />
                <View style={[styles.carte, { backgroundColor: t.colors.surface, borderRadius: t.rayonCarte }]}>
                  {duJour.map((m) => (
                    <LigneMatch key={`${m.equipe.id}-${m.id}`} match={m} maintenant={maintenant} onPress={() => onOuvrirMatch(m.id)} />
                  ))}
                </View>
              </View>
            ))
          ))}
      </View>
    </ScrollView>
  );
}

function Grille({ mois, matchs, aujourdhui, onJour }: { mois: string; matchs: MatchAvecEquipe[]; aujourdhui: string; onJour: (jour: string) => void }) {
  const t = useThemeClub();
  const semaines = useMemo(() => grilleMois(mois, matchs), [mois, matchs]);
  return (
    <View style={[styles.grille, { backgroundColor: t.colors.surface, borderRadius: t.rayonCarte }]}>
      <View style={styles.semaine} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {INITIALES.map((l, i) => (
          <Text key={i} variant="labelSmall" style={[styles.initiale, { color: t.colors.onSurfaceVariant }]}>
            {l}
          </Text>
        ))}
      </View>
      {semaines.map((semaine, i) => (
        <View key={i} style={styles.semaine}>
          {semaine.map((c, j) =>
            c.jour ? <Case key={j} jour={c.jour} nb={c.nb} aujourdhui={c.jour === aujourdhui} onJour={onJour} /> : <View key={j} style={styles.case} />,
          )}
        </View>
      ))}
    </View>
  );
}

/** Un jour de la grille : bouton s'il a des matchs (on défile jusqu'à eux), simple texte sinon. */
function Case({ jour, nb, aujourdhui, onJour }: { jour: string; nb: number; aujourdhui: boolean; onJour: (jour: string) => void }) {
  const t = useThemeClub();
  const lu = `${jourLu(jour)}${nb ? `, ${nbMatchs(nb)}` : ''}${aujourdhui ? ', aujourd’hui' : ''}`;
  const style = [styles.case, aujourdhui && { borderWidth: 2, borderColor: t.club.titre }];
  const contenu = (
    <View style={styles.interieur}>
      <Text
        variant="bodyMedium"
        style={[{ color: t.colors.onSurface }, aujourdhui && { color: t.club.titre, fontFamily: POLICES.titre }]}
      >
        {Number(jour.slice(8))}
      </Text>
      <View style={styles.points} testID={`points-${jour}`}>
        {Array.from({ length: Math.min(nb, POINTS_MAX) }, (_, i) => (
          <View key={i} style={[styles.point, { backgroundColor: t.club.action }]} />
        ))}
      </View>
    </View>
  );
  if (nb === 0) {
    return (
      <View style={style} accessible accessibilityLabel={lu}>
        {contenu}
      </View>
    );
  }
  return (
    <TouchableRipple borderless style={style} accessibilityRole="button" accessibilityLabel={lu} onPress={() => onJour(jour)}>
      {contenu}
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingBottom: 32 },
  titreMois: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  icone: { width: CIBLE, height: CIBLE, margin: 0, borderRadius: CIBLE / 2 },
  // 8 dp de marge + 4 dp de rembourrage : sur un écran de 360 dp, chaque case fait 48 dp de large.
  page: { paddingHorizontal: 8 },
  grille: { padding: 4 },
  semaine: { flexDirection: 'row' },
  initiale: { flex: 1, textAlign: 'center', paddingVertical: 4 },
  case: { flex: 1, height: CIBLE, borderRadius: 10 },
  interieur: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  points: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
  point: { width: 6, height: 6, borderRadius: 3 },
  liste: { paddingHorizontal: 16, paddingTop: 8 },
  carte: { overflow: 'hidden', marginBottom: 8 },
  aucun: { textAlign: 'center', paddingTop: 24 },
  enteteJour: { marginTop: 12, marginBottom: 6, marginHorizontal: 4 },
  texteJour: { fontFamily: POLICES.titre, textTransform: 'uppercase', letterSpacing: 0.5 },
});
