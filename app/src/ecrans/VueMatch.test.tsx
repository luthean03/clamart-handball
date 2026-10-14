import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { club, MAR_SOIR } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import type { Club } from '../donnees/types';
import { matchParId } from '../donnees/selecteurs';
import { VueMatch } from './VueMatch';

function vue(matchId: string, c: Club = club) {
  const p = { club: c, matchId, maintenant: MAR_SOIR, onRetour: jest.fn(), onItineraire: jest.fn(), onOuvrirLien: jest.fn(), onAgenda: jest.fn() };
  rendu(<VueMatch {...p} />);
  return p;
}

test('match joué : phrase, score, mi-temps, salle, feuille de match', () => {
  const p = vue('2644292');
  const m = matchParId(club, '2644292')!;
  expect(screen.getByText('Victoire contre Ent. Suresnes / Nanterre')).toBeOnTheScreen();
  expect(screen.getByText('Mi-temps 16–9')).toBeOnTheScreen();
  expect(screen.getByText('dimanche 11 oct. à 16:15')).toBeOnTheScreen();
  expect(screen.getByText('Gymnase du Petit Clamart')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Itinéraire'));
  expect(p.onItineraire).toHaveBeenCalledWith(m.salle);
  fireEvent.press(screen.getByText('Feuille de match'));
  expect(p.onOuvrirLien).toHaveBeenCalledWith(m.feuille_de_match);
  fireEvent.press(screen.getByText('Voir sur ffhandball.fr'));
  expect(p.onOuvrirLien).toHaveBeenCalledWith(m.url_ffhb);
});

test('match joué senior : les buteurs du club', () => {
  vue('2644292');
  const premier = matchParId(club, '2644292')!.buteurs!.find((b) => b.buts > 0)!;
  expect(screen.getByText('Buteurs')).toBeOnTheScreen();
  expect(screen.getByText(premier.joueur)).toBeOnTheScreen();
});

test('match de jeunes : aucun nom de joueur', () => {
  vue('2740456');
  expect(screen.getByText('Défaite contre Paris St-Germain HB 3')).toBeOnTheScreen();
  expect(screen.queryByText('Buteurs')).toBeNull();
});

test('les buteurs ne s’affichent que si les stats joueurs sont strictement activées', () => {
  const sansStats: Club = { ...club, equipes: club.equipes.map((e) => ({ ...e, stats_joueurs: undefined as unknown as boolean })) };
  vue('2644292', sansStats);
  expect(screen.queryByText('Buteurs')).toBeNull();
});

test('match à venir : ajouter à l’agenda', () => {
  const p = vue('2734038');
  expect(screen.getByText('Contre Association Sportive St-Cyr/Fontenay Handball 78')).toBeOnTheScreen();
  expect(screen.getByText('samedi 17 oct. à 18:00')).toBeOnTheScreen();
  fireEvent.press(screen.getByText("Ajouter à l'agenda"));
  expect(p.onAgenda).toHaveBeenCalledWith(expect.objectContaining({ id: '2734038' }));
  expect(screen.queryByText('Feuille de match')).toBeNull();
});

test('match sans date : pas d’ajout à l’agenda', () => {
  const sansDate: Club = {
    ...club,
    equipes: club.equipes.map((e) => ({ ...e, matchs: e.matchs.map((m) => (m.id === '2734038' ? { ...m, date: null } : m)) })),
  };
  vue('2734038', sansDate);
  expect(screen.getByText('Date à venir')).toBeOnTheScreen();
  expect(screen.queryByText("Ajouter à l'agenda")).toBeNull();
});

test('match introuvable', () => {
  const p = vue('0000000');
  expect(screen.getByText('Match introuvable')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Retour'));
  expect(p.onRetour).toHaveBeenCalled();
});

test('fiche match : retour et boutons ont une cible tactile d’au moins 48 dp', () => {
  vue('2644292');
  const retour = StyleSheet.flatten(screen.getByTestId('icon-button-container-outer-layer').props.style);
  expect(retour.width).toBeGreaterThanOrEqual(48);
  expect(retour.height).toBeGreaterThanOrEqual(48);
  const boutons = screen.getAllByTestId('button-container');
  expect(boutons).toHaveLength(3);
  for (const bouton of boutons) {
    expect(StyleSheet.flatten(bouton.props.style).minHeight).toBeGreaterThanOrEqual(48);
  }
});

test('fiche match à venir : le bouton agenda a une cible tactile d’au moins 48 dp', () => {
  vue('2734038');
  for (const bouton of screen.getAllByTestId('button-container')) {
    expect(StyleSheet.flatten(bouton.props.style).minHeight).toBeGreaterThanOrEqual(48);
  }
  expect(screen.getAllByTestId('button-container')).toHaveLength(3);
});

test('fiche match introuvable : le retour a une cible tactile d’au moins 48 dp', () => {
  vue('0000000');
  const style = StyleSheet.flatten(screen.getByTestId('icon-button-container-outer-layer').props.style);
  expect(style.width).toBeGreaterThanOrEqual(48);
  expect(style.height).toBeGreaterThanOrEqual(48);
});
