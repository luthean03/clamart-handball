import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { club, MAR_SOIR } from '../../test/donnees';
import { contenuDuBouton } from '../../test/boutons';
import { rendu } from '../../test/rendu';
import type { Autorisation } from '../notifications/sujets';
import { VueReglages } from './VueReglages';

function reglages(props: Partial<Parameters<typeof VueReglages>[0]> = {}) {
  const p = {
    club, maintenant: MAR_SOIR, suivis: ['seniors-m'], retires: [] as string[], version: '1.0.0',
    onRetirer: jest.fn(), onGererEquipes: jest.fn(), onEffacerRetires: jest.fn(), onOuvrirLien: jest.fn(), onRetour: jest.fn(),
    notifResultats: true, rappels: false, autorisation: 'accordee' as Autorisation,
    onNotifResultats: jest.fn(), onRappels: jest.fn(), onOuvrirReglagesSysteme: jest.fn(), onDemanderAutorisation: jest.fn(),
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
  const boutons = screen.getAllByTestId('button');
  expect(boutons).toHaveLength(2);
  for (const bouton of boutons) {
    expect(contenuDuBouton(bouton).minHeight).toBeGreaterThanOrEqual(48);
  }
});

test('notifications : résultats et rappel la veille (désactivé par défaut)', () => {
  const p = reglages();
  const rappel = screen.getByRole('switch', { name: 'Rappel la veille du match' });
  expect(rappel.props.accessibilityState?.checked ?? rappel.props.value).toBe(false);
  fireEvent(rappel, 'valueChange', true);
  expect(p.onRappels).toHaveBeenCalledWith(true);
  fireEvent(screen.getByRole('switch', { name: 'Résultats de mes équipes' }), 'valueChange', false);
  expect(p.onNotifResultats).toHaveBeenCalledWith(false);
});

test('notifications bloquées dans Android', () => {
  const p = reglages({ autorisation: 'refusee' });
  expect(screen.getByText('Les notifications sont bloquées dans les réglages d’Android.')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Ouvrir les réglages'));
  expect(p.onOuvrirReglagesSysteme).toHaveBeenCalled();
});

test('notifications pas encore autorisées : bouton pour demander l’autorisation', () => {
  const p = reglages({ autorisation: 'inconnue' });
  expect(screen.getByText('Autorisez les notifications pour recevoir les résultats de vos équipes.')).toBeOnTheScreen();
  expect(screen.queryByText('Les notifications sont bloquées dans les réglages d’Android.')).not.toBeOnTheScreen();
  fireEvent.press(screen.getByText('Activer les notifications'));
  expect(p.onDemanderAutorisation).toHaveBeenCalled();
});

test('notifications autorisées : aucun message d’autorisation', () => {
  reglages({ autorisation: 'accordee' });
  expect(screen.queryByText('Autorisez les notifications pour recevoir les résultats de vos équipes.')).not.toBeOnTheScreen();
  expect(screen.queryByText('Les notifications sont bloquées dans les réglages d’Android.')).not.toBeOnTheScreen();
});
