import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { club } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import { competitionsDuCollectif, lienCompetitionFfhb, lienMatch } from '../actions/agenda';
import { matchParId } from '../donnees/selecteurs';
import { PanneauAgenda } from './PanneauAgenda';

jest.mock('../config', () => ({ URL_AGENDAS: 'https://luthean03.github.io/clamart-handball/data/agenda/' }));

const base = 'https://luthean03.github.io/clamart-handball/data/agenda/';
const m = matchParId(club, '2729291')!;

const unique = [{ competitionId: '33458', detail: 'Championnat' }];
const plusieurs = competitionsDuCollectif(club, 'seniors-m');

function panneau(avecMatch: boolean, competitions = unique) {
  const p = { onFermer: jest.fn(), onOuvrir: jest.fn(), onChoisir: jest.fn() };
  rendu(<PanneauAgenda visible competitions={competitions} clubId="3309" match={avecMatch ? m : undefined} {...p} />);
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

test('panneau : toute la saison d’un collectif à une compétition ouvre directement le calendrier FFHB', () => {
  const p = panneau(true);
  fireEvent.press(screen.getByText('Toute la saison'));
  fireEvent.press(screen.getByText('Apple Calendrier'));
  expect(p.onOuvrir).toHaveBeenCalledWith(lienCompetitionFfhb('apple', '33458', '3309'));
  fireEvent.press(screen.getByText('Google Agenda'));
  expect(p.onOuvrir).toHaveBeenLastCalledWith(lienCompetitionFfhb('google', '33458', '3309'));
  expect(p.onChoisir).not.toHaveBeenCalled();
});

test('panneau : toute la saison d’un collectif à plusieurs compétitions passe au choix des compétitions', () => {
  const p = panneau(true, plusieurs);
  fireEvent.press(screen.getByText('Toute la saison'));
  fireEvent.press(screen.getByText('Fichier .ics'));
  expect(p.onChoisir).toHaveBeenCalledWith('ics');
  expect(p.onOuvrir).not.toHaveBeenCalled();
});

test('panneau : ce match reste le fichier du club même pour un collectif à plusieurs compétitions', () => {
  const p = panneau(true, plusieurs);
  fireEvent.press(screen.getByText('Fichier .ics'));
  expect(p.onOuvrir).toHaveBeenCalledWith(lienMatch('ics', m, base));
  expect(p.onChoisir).not.toHaveBeenCalled();
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
  expect(p.onOuvrir).toHaveBeenCalledWith(lienCompetitionFfhb('ics', '33458', '3309'));
});

test('panneau fermé : rien à l’écran', () => {
  rendu(<PanneauAgenda visible={false} competitions={unique} clubId="3309" match={m} onFermer={jest.fn()} onOuvrir={jest.fn()} onChoisir={jest.fn()} />);
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
