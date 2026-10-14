import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { club, MAR_SOIR } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import { VueButeurs } from './VueButeurs';
import { VueReglages } from './VueReglages';

test('buteurs du club : seniors, meilleur en tête', () => {
  rendu(<VueButeurs club={club} />);
  expect(screen.getByText('Diara DORILAS')).toBeOnTheScreen();
  expect(screen.getByText('38')).toBeOnTheScreen();
  expect(screen.getByText('Seniors uniquement · 42 joueurs et joueuses')).toBeOnTheScreen();
});

test('buteurs : aucun en début de saison', () => {
  rendu(<VueButeurs club={{ ...club, buteurs_club: [] }} />);
  expect(screen.getByText('Pas encore de buteurs cette saison.')).toBeOnTheScreen();
});

test('buteurs : jamais un joueur d’une équipe sans statistiques de joueurs', () => {
  const mineur = { ...club.buteurs_club[0], joueur: 'Élève MINEUR', equipes: ['U18 F'] };
  rendu(<VueButeurs club={{ ...club, buteurs_club: [mineur, ...club.buteurs_club] }} />);
  expect(screen.queryByText('Élève MINEUR')).not.toBeOnTheScreen();
  expect(screen.getByText('Seniors uniquement · 42 joueurs et joueuses')).toBeOnTheScreen();
});

test('buteurs : légende au singulier pour un seul joueur', () => {
  rendu(<VueButeurs club={{ ...club, buteurs_club: [club.buteurs_club[0]] }} />);
  expect(screen.getByText('Seniors uniquement · 1 joueur ou joueuse')).toBeOnTheScreen();
});

function reglages(props: Partial<Parameters<typeof VueReglages>[0]> = {}) {
  const p = {
    club, maintenant: MAR_SOIR, suivis: ['seniors-m'], retires: [] as string[], version: '1.0.0',
    onRetirer: jest.fn(), onGererEquipes: jest.fn(), onEffacerRetires: jest.fn(), onOuvrirLien: jest.fn(), onRetour: jest.fn(),
    ...props,
  };
  rendu(<VueReglages {...p} />);
  return p;
}

test('réglages : équipes suivies, données, version', () => {
  const p = reglages();
  expect(screen.getByText('Seniors M')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Ne plus suivre Seniors M'));
  expect(p.onRetirer).toHaveBeenCalledWith('seniors-m');
  fireEvent.press(screen.getByText('Gérer mes équipes'));
  expect(p.onGererEquipes).toHaveBeenCalled();
  expect(screen.getByText('mis à jour à 16:41')).toBeOnTheScreen();
  expect(screen.getByText('Version 1.0.0')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Résultats issus de ffhandball.fr'));
  expect(p.onOuvrirLien).toHaveBeenCalledWith('https://www.ffhandball.fr');
  fireEvent.press(screen.getByLabelText('Retour'));
  expect(p.onRetour).toHaveBeenCalled();
});

test('réglages : signale les équipes retirées', () => {
  const p = reglages({ suivis: [], retires: ['u11-mixte-3'] });
  expect(screen.getByText('Aucune équipe suivie')).toBeOnTheScreen();
  expect(screen.getByText('1 équipe suivie ne figure plus dans les résultats de la saison et a été retirée.')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('OK'));
  expect(p.onEffacerRetires).toHaveBeenCalled();
});

test('réglages : plusieurs équipes retirées', () => {
  reglages({ suivis: [], retires: ['a', 'b'] });
  expect(screen.getByText('2 équipes suivies ne figurent plus dans les résultats de la saison et ont été retirées.')).toBeOnTheScreen();
});

test('réglages : retour et « Ne plus suivre » ont une cible tactile d’au moins 48 dp', () => {
  reglages({ suivis: ['seniors-m', 'seniors-f-1'] });
  const boutons = screen.getAllByTestId('icon-button-container-outer-layer');
  expect(boutons).toHaveLength(3);
  for (const bouton of boutons) {
    const style = StyleSheet.flatten(bouton.props.style);
    expect(style.width).toBeGreaterThanOrEqual(48);
    expect(style.height).toBeGreaterThanOrEqual(48);
  }
});

test('réglages : « Gérer mes équipes » et « OK » ont une cible tactile d’au moins 48 dp', () => {
  reglages({ retires: ['u11-mixte-3'] });
  const boutons = screen.getAllByTestId('button-container');
  expect(boutons).toHaveLength(2);
  for (const bouton of boutons) {
    expect(StyleSheet.flatten(bouton.props.style).minHeight).toBeGreaterThanOrEqual(48);
  }
});
