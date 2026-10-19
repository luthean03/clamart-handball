import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { club } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import { lienMatch, lienSaison } from '../actions/agenda';
import { matchParId } from '../donnees/selecteurs';
import { PanneauAgenda } from './PanneauAgenda';

jest.mock('../config', () => ({ URL_AGENDAS: 'https://luthean03.github.io/clamart-handball/data/agenda/' }));

const base = 'https://luthean03.github.io/clamart-handball/data/agenda/';
const m = matchParId(club, '2729291')!;

function panneau(avecMatch: boolean) {
  const p = { onFermer: jest.fn(), onOuvrir: jest.fn() };
  rendu(<PanneauAgenda visible collectif="seniors-f-1" match={avecMatch ? m : undefined} {...p} />);
  return p;
}

test('panneau : ce match par défaut, trois choix, ouvre le lien', () => {
  const p = panneau(true);
  expect(screen.getByText('Ce match')).toBeOnTheScreen();
  expect(screen.getByText('Toute la saison')).toBeOnTheScreen();
  expect(screen.getByText('Android, Samsung…')).toBeOnTheScreen();
  expect(screen.getByText('iPhone, iPad, Mac')).toBeOnTheScreen();
  expect(screen.getByText('Outlook et autres agendas')).toBeOnTheScreen();
  expect(screen.getByText('Fichier .ics')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Google Agenda'));
  expect(p.onOuvrir).toHaveBeenCalledWith(lienMatch('google', m, base));
  fireEvent.press(screen.getByText('Apple Calendrier'));
  expect(p.onOuvrir).toHaveBeenLastCalledWith(lienMatch('apple', m, base));
  fireEvent.press(screen.getByText('Fichier .ics'));
  expect(p.onOuvrir).toHaveBeenLastCalledWith(lienMatch('ics', m, base));
});

test('panneau : toute la saison', () => {
  const p = panneau(true);
  fireEvent.press(screen.getByText('Toute la saison'));
  fireEvent.press(screen.getByText('Apple Calendrier'));
  expect(p.onOuvrir).toHaveBeenCalledWith(lienSaison('apple', 'seniors-f-1', base));
  fireEvent.press(screen.getByText('Google Agenda'));
  expect(p.onOuvrir).toHaveBeenLastCalledWith(lienSaison('google', 'seniors-f-1', base));
});

test('panneau : on peut revenir à ce match après avoir choisi la saison', () => {
  const p = panneau(true);
  fireEvent.press(screen.getByText('Toute la saison'));
  fireEvent.press(screen.getByText('Ce match'));
  fireEvent.press(screen.getByText('Fichier .ics'));
  expect(p.onOuvrir).toHaveBeenCalledWith(lienMatch('ics', m, base));
});

test('panneau sans match : saison seule, pas de sélecteur', () => {
  const p = panneau(false);
  expect(screen.queryByText('Ce match')).toBeNull();
  expect(screen.queryByText('Toute la saison')).toBeNull();
  fireEvent.press(screen.getByText('Fichier .ics'));
  expect(p.onOuvrir).toHaveBeenCalledWith(lienSaison('ics', 'seniors-f-1', base));
});

test('panneau fermé : rien à l’écran', () => {
  rendu(<PanneauAgenda visible={false} collectif="seniors-f-1" match={m} onFermer={jest.fn()} onOuvrir={jest.fn()} />);
  expect(screen.queryByText('Google Agenda')).toBeNull();
});

test('panneau : se ferme en touchant le fond', () => {
  const p = panneau(true);
  fireEvent.press(screen.getByTestId('modal-backdrop'));
  expect(p.onFermer).toHaveBeenCalled();
});

test('panneau : chaque choix a une cible tactile d’au moins 48 dp', () => {
  panneau(true);
  for (const titre of ['Google Agenda', 'Apple Calendrier', 'Fichier .ics']) {
    let n = screen.getByText(titre);
    while (n.parent && !n.props.accessibilityRole) n = n.parent;
    expect(StyleSheet.flatten(n.props.style).minHeight).toBeGreaterThanOrEqual(48);
  }
});
