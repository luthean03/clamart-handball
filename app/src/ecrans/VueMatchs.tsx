import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View, type ListRenderItem, type RefreshControlProps } from 'react-native';
import { Appbar, Button, IconButton, SegmentedButtons, Text } from 'react-native-paper';
import { CIBLE, CONTENU_BOUTON, MARGE_SEGMENT } from '../composants/commun';
import { LigneMatch } from '../composants/LigneMatch';
import { EnTeteJour, VueMois } from '../composants/VueMois';
import { jourLocal } from '../donnees/dates';
import { elementsListeMatchs, indexAujourdhui, moisDeLaSaison, moisInitial, type ElementListe } from '../donnees/liste';
import { tousLesMatchs } from '../donnees/selecteurs';
import type { Club } from '../donnees/types';
import { POLICES, useThemeClub } from '../theme/theme';

interface Props {
  club: Club;
  maintenant: Date;
  suivis: string[];
  onOuvrirMatch: (id: string) => void;
  rafraichir?: () => void;
  rafraichissement?: boolean;
}

type Filtre = 'mes' | 'tous';
type Vue = 'liste' | 'mois';

const SEGMENTS = [
  { value: 'mes', label: 'Mes équipes', hitSlop: MARGE_SEGMENT },
  { value: 'tous', label: 'Tout le club', hitSlop: MARGE_SEGMENT },
];

const cle = (e: ElementListe) =>
  e.type === 'jour' ? `jour-${e.jour}` : e.type === 'match' ? `${e.match.equipe.id}-${e.match.id}` : 'aujourdhui';

export function VueMatchs({ club, maintenant, suivis, onOuvrirMatch, rafraichir, rafraichissement = false }: Props) {
  const t = useThemeClub();
  // On ne retient que les choix de l'utilisateur (filtre, vue) ; tout le reste se déduit des données.
  const [filtre, setFiltre] = useState<Filtre>(suivis.length ? 'mes' : 'tous');
  const [vue, setVue] = useState<Vue>('liste');
  const aujourdhui = jourLocal(maintenant);
  const tous = useMemo(() => tousLesMatchs(club), [club]);
  const mois = useMemo(() => moisDeLaSaison(tous), [tous]);
  const matchs = useMemo(
    () => (filtre === 'tous' ? tous : tous.filter((m) => suivis.includes(m.equipe.collectif))),
    [tous, filtre, suivis],
  );
  const elements = useMemo(() => elementsListeMatchs(matchs, aujourdhui), [matchs, aujourdhui]);
  const saisonVide = mois.length === 0;

  const controle = rafraichir ? (
    <RefreshControl refreshing={rafraichissement} onRefresh={rafraichir} colors={[t.colors.primary]} />
  ) : undefined;
  const aucunDeMesEquipes = (
    <View style={styles.vide}>
      <Text variant="bodyLarge" style={[styles.centrer, { color: t.colors.onSurfaceVariant }]}>
        Aucun match de vos équipes.
      </Text>
      <Button mode="text" contentStyle={CONTENU_BOUTON} onPress={() => setFiltre('tous')}>
        Voir tout le club
      </Button>
    </View>
  );

  return (
    <View style={[styles.page, { backgroundColor: t.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: t.colors.background }}>
        <Appbar.Content title="Matchs" titleStyle={{ color: t.club.titre }} />
        {saisonVide ? null : (
          <IconButton
            icon={vue === 'liste' ? 'calendar-month-outline' : 'format-list-bulleted'}
            accessibilityLabel={vue === 'liste' ? 'Vue calendrier' : 'Vue liste'}
            mode="contained"
            containerColor={vue === 'mois' ? t.colors.secondaryContainer : t.colors.surface}
            iconColor={vue === 'mois' ? t.colors.onSecondaryContainer : t.club.titre}
            style={styles.icone}
            onPress={() => setVue(vue === 'liste' ? 'mois' : 'liste')}
          />
        )}
      </Appbar.Header>
      {saisonVide ? null : (
        <SegmentedButtons style={styles.filtre} value={filtre} onValueChange={(v) => setFiltre(v as Filtre)} buttons={SEGMENTS} />
      )}
      {saisonVide ? (
        <ScrollView testID="liste-matchs" contentContainerStyle={styles.contenu} refreshControl={controle}>
          <View style={styles.vide}>
            <Text variant="bodyLarge" style={[styles.centrer, { color: t.colors.onSurfaceVariant }]}>
              Aucun match programmé pour le moment.
            </Text>
          </View>
        </ScrollView>
      ) : vue === 'mois' ? (
        <VueMois
          matchs={matchs}
          mois={mois}
          moisInitial={moisInitial(mois, aujourdhui)!}
          maintenant={maintenant}
          onOuvrirMatch={onOuvrirMatch}
          vide={elements.length === 0 ? aucunDeMesEquipes : undefined}
          refreshControl={controle}
        />
      ) : elements.length === 0 ? (
        <ScrollView testID="liste-matchs" contentContainerStyle={styles.contenu} refreshControl={controle}>
          {aucunDeMesEquipes}
        </ScrollView>
      ) : (
        // Remontée à chaque changement de filtre : la liste se rouvre sur le trait « Aujourd'hui ».
        <ListeSaison key={filtre} elements={elements} maintenant={maintenant} onOuvrirMatch={onOuvrirMatch} refreshControl={controle} />
      )}
    </View>
  );
}

interface PropsListe {
  elements: ElementListe[];
  maintenant: Date;
  onOuvrirMatch: (id: string) => void;
  refreshControl?: ReactElement<RefreshControlProps>;
}

const NOUVEAUX_ESSAIS_MAX = 3;

/** Toute la saison, jour par jour, ouverte au niveau du trait « Aujourd'hui ». */
function ListeSaison({ elements, maintenant, onOuvrirMatch, refreshControl }: PropsListe) {
  const t = useThemeClub();
  const liste = useRef<FlatList<ElementListe>>(null);
  const nouvelEssai = useRef<ReturnType<typeof setTimeout>>(undefined);
  const essais = useRef(0);
  // Lue au moment du nouvel essai, pour ne pas viser une ligne qui n'existe plus après un rétrécissement.
  const nombre = useRef(elements.length);
  useEffect(() => {
    nombre.current = elements.length;
  }, [elements.length]);
  useEffect(() => () => clearTimeout(nouvelEssai.current), []);

  // Sans hauteur fixe des lignes, le trait peut être hors des cellules déjà mesurées : on défile d'abord à une
  // position estimée (les cellules voisines se dessinent et se mesurent), puis on vise à nouveau le trait.
  const echec = useCallback((info: { index: number; averageItemLength: number }) => {
    liste.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
    if (essais.current >= NOUVEAUX_ESSAIS_MAX) return;
    essais.current += 1;
    clearTimeout(nouvelEssai.current);
    nouvelEssai.current = setTimeout(() => {
      if (info.index < nombre.current) liste.current?.scrollToIndex({ index: info.index, animated: false });
    }, 100);
  }, []);

  const rendre: ListRenderItem<ElementListe> = useCallback(
    ({ item, index }) => {
      if (item.type === 'aujourdhui') {
        return (
          <View style={styles.trait}>
            <Text variant="labelSmall" style={{ color: t.colors.onSurfaceVariant, fontFamily: POLICES.gras }}>
              Aujourd’hui
            </Text>
            <View style={[styles.filet, { backgroundColor: t.club.trait }]} />
          </View>
        );
      }
      if (item.type === 'jour') return <EnTeteJour jour={item.jour} />;
      // Les matchs d'un même jour forment une carte : coins arrondis en tête et en fin de groupe.
      const premier = elements[index - 1]?.type !== 'match';
      const dernier = elements[index + 1]?.type !== 'match';
      const r = t.rayonCarte;
      return (
        <View
          style={[
            styles.carte,
            { backgroundColor: t.colors.surface },
            premier && { borderTopLeftRadius: r, borderTopRightRadius: r },
            dernier && { borderBottomLeftRadius: r, borderBottomRightRadius: r, marginBottom: 8 },
          ]}
        >
          <LigneMatch match={item.match} maintenant={maintenant} afficherCompetition onPress={() => onOuvrirMatch(item.match.id)} />
        </View>
      );
    },
    [elements, maintenant, onOuvrirMatch, t],
  );

  return (
    <FlatList
      ref={liste}
      testID="liste-matchs"
      data={elements}
      keyExtractor={cle}
      renderItem={rendre}
      initialScrollIndex={Math.max(0, indexAujourdhui(elements))}
      onScrollToIndexFailed={echec}
      // Les jours passés se dessinent au-dessus du trait après l'ouverture : la position affichée ne doit pas sauter.
      maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      contentContainerStyle={styles.contenu}
      refreshControl={refreshControl}
    />
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  icone: { width: CIBLE, height: CIBLE, margin: 0, marginRight: 8, borderRadius: CIBLE / 2 },
  filtre: { marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  contenu: { paddingHorizontal: 16, paddingBottom: 32 },
  carte: { overflow: 'hidden' },
  trait: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 2, marginHorizontal: 4 },
  filet: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  vide: { paddingTop: 48, alignItems: 'center', gap: 8 },
  centrer: { textAlign: 'center' },
});
