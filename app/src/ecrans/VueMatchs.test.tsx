import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { club, DIM_SOIR } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import type { Club } from '../donnees/types';
import { VueMatchs } from './VueMatchs';

const matchs = (props: Partial<Parameters<typeof VueMatchs>[0]> = {}) =>
  rendu(<VueMatchs club={club} maintenant={DIM_SOIR} suivis={[]} onOuvrirMatch={jest.fn()} {...props} />);

test('jour par défaut : aujourd’hui, tout le club', () => {
  matchs();
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(4);
  expect(screen.getByText('Seniors')).toBeOnTheScreen();
  expect(screen.getByText('U13')).toBeOnTheScreen();
  expect(screen.getByText('U11')).toBeOnTheScreen();
});

test('changer de jour', () => {
  matchs();
  fireEvent.press(screen.getByText('sam. 10 oct.'));
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(7);
});

test('mes équipes par défaut quand on en suit', () => {
  matchs({ suivis: ['seniors-f-1'] });
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(1);
});

test('aucun match de mes équipes ce jour-là', () => {
  matchs({ suivis: ['u18-m'] });
  expect(screen.getByText('Aucun match de vos équipes ce jour-là.')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Voir tout le club'));
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(4);
});

test('aucun match daté', () => {
  const horsSaison: Club = { ...club, equipes: club.equipes.map((e) => ({ ...e, matchs: [] })) };
  matchs({ club: horsSaison });
  expect(screen.getByText('Aucun match programmé pour le moment.')).toBeOnTheScreen();
});

test('ouvrir un match', () => {
  const onOuvrirMatch = jest.fn();
  matchs({ onOuvrirMatch });
  fireEvent.press(screen.getAllByTestId('ligne-match')[0]);
  expect(onOuvrirMatch).toHaveBeenCalled();
});

test('les jours forment un choix unique, avec le jour affiché marqué', () => {
  matchs();
  expect(screen.getByRole('radio', { name: 'dim. 11 oct.' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'sam. 10 oct.' })).not.toBeChecked();
  fireEvent.press(screen.getByRole('radio', { name: 'sam. 10 oct.' }));
  expect(screen.getByRole('radio', { name: 'sam. 10 oct.' })).toBeChecked();
});

test('chaque jour a une cible tactile d’au moins 48 dp', () => {
  matchs();
  const style = StyleSheet.flatten(screen.getByRole('radio', { name: 'sam. 10 oct.' }).props.style);
  expect(style.minHeight ?? style.height).toBeGreaterThanOrEqual(48);
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

test('le jour par défaut est recalculé quand les données arrivent', () => {
  rendu(<Hote avant={sansMatch(club)} apres={club} />);
  expect(screen.getByText('Aucun match programmé pour le moment.')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Données reçues'));
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(4);
  expect(screen.getByRole('radio', { name: 'dim. 11 oct.' })).toBeChecked();
});

test('le jour choisi qui disparaît des données laisse place au jour par défaut', () => {
  const sansSamedi: Club = {
    ...club,
    equipes: club.equipes.map((e) => ({ ...e, matchs: e.matchs.filter((m) => !m.date?.startsWith('2026-10-10')) })),
  };
  rendu(<Hote avant={club} apres={sansSamedi} />);
  fireEvent.press(screen.getByRole('radio', { name: 'sam. 10 oct.' }));
  fireEvent.press(screen.getByText('Données reçues'));
  expect(screen.getByRole('radio', { name: 'dim. 11 oct.' })).toBeChecked();
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(4);
});

test('le jour affiché est amené dans la zone visible', () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
  matchs();
  fireEvent(screen.getByTestId('jour-2026-10-11'), 'layout', { nativeEvent: { layout: { x: 900, y: 0, width: 110, height: 48 } } });
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 884, animated: false });
  scrollTo.mockClear();
  fireEvent(screen.getByTestId('jour-2026-10-10'), 'layout', { nativeEvent: { layout: { x: 780, y: 0, width: 110, height: 48 } } });
  expect(scrollTo).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('radio', { name: 'sam. 10 oct.' }));
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 764, animated: false });
});

test('la liste des jours est nommée pour les lecteurs d’écran', () => {
  matchs();
  expect(screen.getByLabelText('Jour du match')).toBeOnTheScreen();
});
