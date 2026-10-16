import { act, fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { club, DIM_SOIR } from '../../test/donnees';
import { contenuDuBouton } from '../../test/boutons';
import { rendu } from '../../test/rendu';
import type { ElementListe } from '../donnees/liste';
import type { Club } from '../donnees/types';
import { VueMatchs } from './VueMatchs';

const matchs = (props: Partial<Parameters<typeof VueMatchs>[0]> = {}) =>
  rendu(<VueMatchs club={club} maintenant={DIM_SOIR} suivis={[]} onOuvrirMatch={jest.fn()} {...props} />);

/** La liste de la saison (en vue liste, c'est la seule FlatList de l'écran). */
const liste = () => screen.UNSAFE_getByType(FlatList<ElementListe>).props;
const collectifsListes = () =>
  liste().data!.flatMap((e: ElementListe) => (e.type === 'match' ? [e.match.equipe.collectif] : []));

test('matchs : plus de sélecteur de jour, trait « Aujourd’hui » dans la liste', () => {
  matchs();
  expect(screen.queryByLabelText('Jour du match')).toBeNull();
  expect(screen.queryAllByRole('radio')).toHaveLength(0);
  expect(screen.getByText('Aujourd’hui')).toBeOnTheScreen();
  // La liste s'ouvre sur le trait, placé juste avant le premier jour ≥ aujourd'hui, qui garde son en-tête.
  const { data, initialScrollIndex } = liste();
  expect(data![initialScrollIndex!]).toEqual({ type: 'aujourdhui' });
  expect(data![initialScrollIndex! + 1]).toEqual({ type: 'jour', jour: '2026-10-11' });
  expect(screen.getByText('Dim. 11 octobre')).toBeOnTheScreen();
});

test('matchs : toute la saison, sans les matchs non datés', () => {
  matchs();
  const { data } = liste();
  const lignes = data!.filter((e: ElementListe) => e.type === 'match');
  expect(lignes).toHaveLength(41);
  expect(lignes.every((e: ElementListe) => e.type === 'match' && e.match.date !== null)).toBe(true);
  expect(data![0]).toEqual({ type: 'jour', jour: '2026-09-12' });
});

test('les en-têtes de jour sont des titres lus en toutes lettres', () => {
  matchs();
  expect(screen.getByRole('header', { name: 'dimanche 11 octobre' })).toBeOnTheScreen();
});

test('mes équipes par défaut quand on en suit, tout le club sur demande', () => {
  matchs({ suivis: ['seniors-f-1'] });
  expect(new Set(collectifsListes())).toEqual(new Set(['seniors-f-1']));
  fireEvent.press(screen.getByText('Tout le club'));
  expect(new Set(collectifsListes()).size).toBeGreaterThan(1);
});

test('matchs : mes équipes vide propose tout le club', () => {
  matchs({ suivis: [] });
  fireEvent.press(screen.getByText('Mes équipes'));
  expect(screen.getByText('Aucun match de vos équipes.')).toBeOnTheScreen();
  expect(contenuDuBouton(screen.getByText('Voir tout le club')).minHeight).toBeGreaterThanOrEqual(48);
  fireEvent.press(screen.getByText('Voir tout le club'));
  expect(screen.getByText('Aujourd’hui')).toBeOnTheScreen();
});

test('aucun match daté : message, ni filtre ni calendrier', () => {
  const horsSaison: Club = { ...club, equipes: club.equipes.map((e) => ({ ...e, matchs: e.matchs.map((m) => ({ ...m, date: null })) })) };
  matchs({ club: horsSaison });
  expect(screen.getByText('Aucun match programmé pour le moment.')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Vue calendrier')).toBeNull();
  expect(screen.queryByText('Tout le club')).toBeNull();
});

test('ouvrir un match', () => {
  const onOuvrirMatch = jest.fn();
  matchs({ onOuvrirMatch });
  fireEvent.press(screen.getAllByTestId('ligne-match')[0]);
  expect(onOuvrirMatch).toHaveBeenCalledWith(expect.any(String));
});

test('le filtre a une cible tactile d’au moins 48 dp', () => {
  matchs();
  const { hitSlop } = screen.getByRole('button', { name: 'Tout le club' }).props;
  // Les segments de Paper mesurent 40 dp (9 + 20 + 9 + 2 de bordure) : la marge de toucher complète à 48 dp.
  expect(40 + hitSlop.top + hitSlop.bottom).toBeGreaterThanOrEqual(48);
});

test('tirer pour rafraîchir', () => {
  const rafraichir = jest.fn();
  matchs({ rafraichir });
  screen.getByTestId('liste-matchs').props.refreshControl.props.onRefresh();
  expect(rafraichir).toHaveBeenCalled();
});

test('repli si le trait n’est pas encore mesuré : défilement estimé, puis nouvel essai', () => {
  jest.useFakeTimers();
  const versDecalage = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {});
  const versIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => {});
  try {
    matchs();
    act(() => liste().onScrollToIndexFailed!({ index: 30, averageItemLength: 80, highestMeasuredFrameIndex: 10 }));
    expect(versDecalage).toHaveBeenCalledWith({ offset: 2400, animated: false });
    act(() => jest.runOnlyPendingTimers());
    expect(versIndex).toHaveBeenCalledWith({ index: 30, animated: false });
  } finally {
    versDecalage.mockRestore();
    versIndex.mockRestore();
    jest.useRealTimers();
  }
});

const sansMatch = (c: Club): Club => ({ ...c, equipes: c.equipes.map((e) => ({ ...e, matchs: [] })) });

/** Rend la vue avec un premier club, puis bascule sur le second quand on appuie sur « Données reçues ». */
function Hote({ avant, apres }: { avant: Club; apres: Club }) {
  const [recu, setRecu] = useState(false);
  return (
    <>
      <VueMatchs club={recu ? apres : avant} maintenant={DIM_SOIR} suivis={[]} onOuvrirMatch={jest.fn()} />
      <Pressable onPress={() => setRecu(true)}>
        <Text>Données reçues</Text>
      </Pressable>
    </>
  );
}

test('quand les données arrivent, la liste s’ouvre sur aujourd’hui', () => {
  rendu(<Hote avant={sansMatch(club)} apres={club} />);
  expect(screen.getByText('Aucun match programmé pour le moment.')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Données reçues'));
  const { data, initialScrollIndex } = liste();
  expect(data![initialScrollIndex!]).toEqual({ type: 'aujourdhui' });
});

// Vue mois

const ouvrirMois = (props: Partial<Parameters<typeof VueMatchs>[0]> = {}) => {
  const r = matchs(props);
  fireEvent.press(screen.getByLabelText('Vue calendrier'));
  return r;
};

test('matchs : icône calendrier → vue mois, icône liste → retour', () => {
  ouvrirMois();
  expect(screen.getByRole('header', { name: 'Octobre 2026' })).toBeOnTheScreen();
  expect(screen.queryByText('Aujourd’hui')).toBeNull();
  fireEvent.press(screen.getByLabelText('Vue liste'));
  expect(screen.getByText('Aujourd’hui')).toBeOnTheScreen();
});

test('les icônes de vue et de mois ont une cible tactile de 48 dp', () => {
  ouvrirMois();
  const cibles = screen.getAllByTestId('icon-button-container-outer-layer');
  expect(cibles).toHaveLength(3); // Vue liste, Mois précédent, Mois suivant
  for (const c of cibles) {
    const style = StyleSheet.flatten(c.props.style);
    expect(style.width).toBeGreaterThanOrEqual(48);
    expect(style.height).toBeGreaterThanOrEqual(48);
  }
});

test('vue mois : un bouton par jour de match, nommé avec le nombre de matchs ; les autres jours ne sont pas des boutons', () => {
  ouvrirMois();
  expect(screen.getByRole('button', { name: 'samedi 10 octobre, 7 matchs' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'samedi 17 octobre, 1 match' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /lundi 12 octobre/ })).toBeNull();
  expect(screen.getByLabelText('lundi 12 octobre')).toBeOnTheScreen();
});

test('vue mois : aujourd’hui est encadré et annoncé', () => {
  ouvrirMois();
  const jour = screen.getByRole('button', { name: 'dimanche 11 octobre, 4 matchs, aujourd’hui' });
  expect(StyleSheet.flatten(jour.props.style).borderWidth).toBe(2);
  expect(screen.getByLabelText('lundi 12 octobre')).toBeOnTheScreen();
});

test('vue mois : au plus 3 points dessinés par jour', () => {
  ouvrirMois();
  expect(screen.getByTestId('points-2026-10-10').children).toHaveLength(3); // 7 matchs
  expect(screen.getByTestId('points-2026-10-04').children).toHaveLength(2);
  expect(screen.getByTestId('points-2026-10-12').children).toHaveLength(0);
});

test('vue mois : les matchs du mois sous la grille, regroupés par jour', () => {
  ouvrirMois();
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(21);
  expect(screen.getByText('Sam. 10 octobre · 7 matchs')).toBeOnTheScreen();
  expect(screen.getByText('Sam. 17 octobre · 1 match')).toBeOnTheScreen();
});

test('vue mois : toucher un jour fait défiler jusqu’à ses matchs', () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
  try {
    ouvrirMois();
    fireEvent(screen.getByTestId('liste-du-mois'), 'layout', { nativeEvent: { layout: { x: 0, y: 400, width: 750, height: 2000 } } });
    fireEvent(screen.getByTestId('groupe-2026-10-17'), 'layout', { nativeEvent: { layout: { x: 0, y: 900, width: 700, height: 32 } } });
    fireEvent.press(screen.getByRole('button', { name: 'samedi 17 octobre, 1 match' }));
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 1292, animated: true });
  } finally {
    scrollTo.mockRestore();
  }
});

test('vue mois : glisser change de mois', () => {
  ouvrirMois();
  // Largeur de l'écran en test : 750 ; la 3e page est novembre.
  fireEvent(screen.getByTestId('grilles-mois'), 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 1500, y: 0 } } });
  expect(screen.getByRole('header', { name: 'Novembre 2026' })).toBeOnTheScreen();
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(4);
  expect(screen.getByRole('button', { name: 'samedi 7 novembre, 2 matchs' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /octobre/ })).toBeNull();
});

test('vue mois : flèches de mois, désactivées aux bornes de la saison', () => {
  ouvrirMois();
  fireEvent.press(screen.getByLabelText('Mois précédent'));
  expect(screen.getByRole('header', { name: 'Septembre 2026' })).toBeOnTheScreen();
  expect(screen.getByLabelText('Mois précédent')).toBeDisabled();
  fireEvent.press(screen.getByLabelText('Mois suivant'));
  expect(screen.getByRole('header', { name: 'Octobre 2026' })).toBeOnTheScreen();
});

test('vue mois : ouvre sur le mois de la saison le plus proche quand aujourd’hui est hors saison', () => {
  ouvrirMois({ maintenant: new Date('2027-06-01T12:00:00+02:00') });
  expect(screen.getByRole('header', { name: 'Février 2027' })).toBeOnTheScreen();
  expect(screen.getByLabelText('Mois suivant')).toBeDisabled();
  screen.unmount();
  ouvrirMois({ maintenant: new Date('2026-08-01T12:00:00+02:00') });
  expect(screen.getByRole('header', { name: 'Septembre 2026' })).toBeOnTheScreen();
});

test('vue mois : le filtre s’applique aussi', () => {
  ouvrirMois({ suivis: ['seniors-f-1'] });
  expect(screen.getByRole('button', { name: 'dimanche 11 octobre, 1 match, aujourd’hui' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /samedi 10 octobre/ })).toBeNull();
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(3);
  fireEvent.press(screen.getByText('Tout le club'));
  expect(screen.getByRole('button', { name: 'dimanche 11 octobre, 4 matchs, aujourd’hui' })).toBeOnTheScreen();
});

test('vue mois : mes équipes vide propose tout le club', () => {
  ouvrirMois({ suivis: [] });
  fireEvent.press(screen.getByText('Mes équipes'));
  expect(screen.getByRole('header', { name: 'Octobre 2026' })).toBeOnTheScreen();
  expect(screen.getByText('Aucun match de vos équipes.')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Voir tout le club'));
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(21);
});

test('vue mois : mois sans match', () => {
  ouvrirMois({ suivis: ['seniors-f-1'] });
  fireEvent.press(screen.getByLabelText('Mois suivant'));
  fireEvent.press(screen.getByLabelText('Mois suivant'));
  expect(screen.getByRole('header', { name: 'Décembre 2026' })).toBeOnTheScreen();
  expect(screen.getByText('Aucun match ce mois-ci.')).toBeOnTheScreen();
});

test('vue mois : ouvrir un match', () => {
  const onOuvrirMatch = jest.fn();
  ouvrirMois({ onOuvrirMatch });
  fireEvent.press(screen.getAllByTestId('ligne-match')[0]);
  expect(onOuvrirMatch).toHaveBeenCalledWith(expect.any(String));
});
