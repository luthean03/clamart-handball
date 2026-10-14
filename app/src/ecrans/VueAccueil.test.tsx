import { fireEvent, screen } from '@testing-library/react-native';
import { club, MAR_SOIR } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import { VueAccueil, type PropsAccueil } from './VueAccueil';

function accueil(props: Partial<PropsAccueil> = {}) {
  const p: PropsAccueil = {
    club, maintenant: MAR_SOIR, suivis: ['seniors-f-1', 'seniors-m'], horsLigne: false, rafraichissement: false,
    rafraichir: jest.fn(), onOuvrirEquipe: jest.fn(), onOuvrirMatch: jest.fn(), onAgenda: jest.fn(),
    onReglages: jest.fn(), onChoisirEquipes: jest.fn(), ...props,
  };
  rendu(<VueAccueil {...p} />);
  return p;
}

test('en-tête : salutation, week-end et heure de mise à jour', () => {
  accueil();
  expect(screen.getByText('Bonsoir !')).toBeOnTheScreen();
  expect(screen.getByText('Week-end du 10–11 oct. · mis à jour à 16:41')).toBeOnTheScreen();
});

test('mes équipes : le résultat raconté en une phrase', () => {
  const p = accueil();
  expect(screen.getByText('Victoire contre Ent. Suresnes / Nanterre')).toBeOnTheScreen();
  expect(screen.getByText('3e victoire de suite')).toBeOnTheScreen();
  expect(screen.getByText("Défaite d'un but contre Levallois SC 1D")).toBeOnTheScreen();
  expect(screen.getByText('32–22')).toBeOnTheScreen();
  expect(screen.getByText('3e sur 11')).toBeOnTheScreen();
  fireEvent.press(screen.getAllByText('Voir le match')[0]);
  expect(p.onOuvrirMatch).toHaveBeenCalledWith('2644292');
  fireEvent.press(screen.getByText('Victoire contre Ent. Suresnes / Nanterre'));
  expect(p.onOuvrirEquipe).toHaveBeenCalledWith('seniors-f-1');
});

test('tout le club ce week-end : 11 matchs', () => {
  accueil();
  expect(screen.getByText('11 matchs')).toBeOnTheScreen();
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(11);
});

test('aucune équipe suivie : invitation à choisir', () => {
  const p = accueil({ suivis: [] });
  fireEvent.press(screen.getByText('Choisir mes équipes'));
  expect(p.onChoisirEquipes).toHaveBeenCalled();
});

test('ignore une équipe suivie absente des données', () => {
  accueil({ suivis: ['equipe-disparue', 'seniors-m'] });
  expect(screen.getByText("Défaite d'un but contre Levallois SC 1D")).toBeOnTheScreen();
});

test('match à venir : ajouter à l’agenda', () => {
  const p = accueil({ maintenant: new Date('2026-10-14T12:00:00+02:00'), suivis: ['seniors-m'] });
  expect(screen.getByText('Contre Association Sportive St-Cyr/Fontenay Handball 78')).toBeOnTheScreen();
  expect(screen.getAllByText('18:00').length).toBeGreaterThan(0); // carte + liste du club
  fireEvent.press(screen.getByText("Ajouter à l'agenda"));
  expect(p.onAgenda).toHaveBeenCalledWith(expect.objectContaining({ id: '2734038' }));
});

test('hors saison : pas de match', () => {
  accueil({ maintenant: new Date('2027-07-01T12:00:00+02:00'), suivis: ['seniors-f-1'] });
  expect(screen.getByText('Pas de match ce week-end')).toBeOnTheScreen();
  expect(screen.getByText('Aucun match programmé pour le moment')).toBeOnTheScreen();
  expect(screen.getByText('Aucun match au club ce week-end.')).toBeOnTheScreen();
});

test('hors ligne et réglages', () => {
  const p = accueil({ horsLigne: true });
  expect(screen.getByText('Hors ligne · résultats mis à jour à 16:41')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Réglages'));
  expect(p.onReglages).toHaveBeenCalled();
});
