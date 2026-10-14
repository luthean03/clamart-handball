import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
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
