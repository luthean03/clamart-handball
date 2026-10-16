import { act, fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { club } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import { ouvrirExterne, ouvrirItineraire } from '../actions/actions';
import { lienMatch, lienSaison } from '../actions/agenda';
import { URL_AGENDAS } from '../config';
import { matchParId } from '../donnees/selecteurs';
import Onglets from '../app/(tabs)/_layout';
import ClubOnglet from '../app/(tabs)/club';
import Accueil from '../app/(tabs)/index';
import { useSuivi } from '../suivi/suivi';
import Equipe from '../app/equipe/[collectif]';
import Match from '../app/match/[id]';

let accueil: { onAgenda: (m: unknown) => void } | undefined;
let fiche: { onAgenda: (m: unknown) => void } | undefined;
let equipe: { onAgenda: () => void } | undefined;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({ collectif: 'seniors-f-1' }),
  Redirect: () => null,
  // Les onglets se réduisent à leurs titres, dans l'ordre de la barre.
  Tabs: Object.assign(({ children }: { children: unknown }) => children, {
    Screen: ({ options }: { options: { title: string } }) =>
      require('react').createElement(require('react-native').Text, null, options.title),
  }),
}));
jest.mock('../actions/actions', () => ({
  ...jest.requireActual('../actions/actions'),
  ouvrirExterne: jest.fn(() => Promise.resolve()),
  ouvrirItineraire: jest.fn(() => Promise.resolve()),
}));
jest.mock('../notifications/synchro', () => ({ useSynchroAbonnements: jest.fn() }));
jest.mock('../donnees/maintenant', () => ({ useMaintenant: () => new Date('2026-10-13T19:05:00+02:00') }));
jest.mock('../donnees/requetes', () => ({
  useClub: () => ({
    club: require('../../test/donnees').club, chargement: false, erreur: null, horsLigne: false, majRequise: false,
    rafraichir: jest.fn(), rafraichissement: false,
  }),
}));
jest.mock('./VueAccueil', () => ({
  VueAccueil: (p: typeof accueil) => {
    accueil = p;
    return null;
  },
}));
jest.mock('./VueMatch', () => ({
  VueMatch: (p: typeof fiche) => {
    fiche = p;
    return null;
  },
}));
jest.mock('./VueEquipe', () => ({
  VueEquipe: (p: typeof equipe) => {
    equipe = p;
    return null;
  },
}));

const m = matchParId(club, '2734038')!;

/** Les panneaux s'ouvrent et se ferment en fondu : on laisse finir l'animation (dans act) avant de continuer. */
const attendre = (ms: number) =>
  act(async () => {
    await new Promise<void>((fini) => setTimeout(fini, ms));
  });
const ouvrir = async (action: () => void) => {
  act(action);
  await attendre(50);
};
const panneauFerme = async () => {
  await attendre(300);
  expect(screen.queryByText('Fichier .ics')).toBeNull();
};

beforeEach(() => {
  jest.mocked(ouvrirExterne).mockClear();
  jest.mocked(ouvrirItineraire).mockClear();
});

test('Accueil : transmet majRequise à la vue', () => {
  rendu(<Accueil />);
  expect(accueil).toHaveProperty('majRequise', false);
});

test('Accueil : « Ajouter à l’agenda » ouvre le panneau du match, puis le lien choisi', async () => {
  rendu(<Accueil />);
  expect(screen.queryByText('Google Agenda')).toBeNull();
  await ouvrir(() => accueil!.onAgenda(m));
  fireEvent.press(screen.getByText('Google Agenda'));
  expect(ouvrirExterne).toHaveBeenCalledWith(lienMatch('google', m, URL_AGENDAS));
  await panneauFerme();
});

test('Accueil : « Toute la saison » abonne le collectif du match', async () => {
  rendu(<Accueil />);
  await ouvrir(() => accueil!.onAgenda(m));
  fireEvent.press(screen.getByText('Toute la saison'));
  fireEvent.press(screen.getByText('Apple Calendrier'));
  expect(ouvrirExterne).toHaveBeenCalledWith(lienSaison('apple', m.equipe.collectif, URL_AGENDAS));
  await panneauFerme();
});

test('Accueil : si le téléphone ne peut pas ouvrir le lien, un message le dit', async () => {
  jest.mocked(ouvrirExterne).mockRejectedValueOnce(new Error('pas d’application'));
  rendu(<Accueil />);
  await ouvrir(() => accueil!.onAgenda(m));
  expect(screen.queryByText("Impossible d'ouvrir l'agenda")).toBeNull();
  fireEvent.press(screen.getByText('Fichier .ics'));
  expect(await screen.findByText("Impossible d'ouvrir l'agenda")).toBeOnTheScreen();
  await panneauFerme();
});

test('Fiche match : le panneau s’ouvre pour ce match', async () => {
  rendu(<Match />);
  await ouvrir(() => fiche!.onAgenda(m));
  fireEvent.press(screen.getByText('Fichier .ics'));
  expect(ouvrirExterne).toHaveBeenCalledWith(lienMatch('ics', m, URL_AGENDAS));
  await panneauFerme();
});

test('Page équipe : « S’abonner au calendrier » ouvre le panneau en mode saison, sans sélecteur', async () => {
  rendu(<Equipe />);
  await ouvrir(() => equipe!.onAgenda());
  expect(screen.queryByText('Ce match')).toBeNull();
  fireEvent.press(screen.getByText('Google Agenda'));
  expect(ouvrirExterne).toHaveBeenCalledWith(lienSaison('google', 'seniors-f-1', URL_AGENDAS));
  await panneauFerme();
});

test('onglets : Accueil, Matchs, Équipes, Le club — plus de Buteurs', () => {
  useSuivi.setState({ pret: true, bienvenueFaite: true });
  rendu(<Onglets />);
  const titres = screen.UNSAFE_getAllByType(Text).map((t) => t.props.children);
  expect(titres).toEqual(['Accueil', 'Matchs', 'Équipes', 'Le club']);
});

test('Le club : un réseau s’ouvre dans son application', () => {
  rendu(<ClubOnglet />);
  fireEvent.press(screen.getByText('Instagram'));
  expect(ouvrirExterne).toHaveBeenCalledWith('https://www.instagram.com/clamart_handball/');
});

test('Le club : le gymnase ouvre l’itinéraire', () => {
  rendu(<ClubOnglet />);
  fireEvent.press(screen.getByText('Gymnase du Petit Clamart'));
  expect(ouvrirItineraire).toHaveBeenCalledWith({ nom: 'Gymnase du Petit Clamart', adresse: '56 rue de la Bourcillière, 92140 Clamart' });
});

test('Le club : si le téléphone ne peut pas ouvrir le lien, un message le dit', async () => {
  jest.mocked(ouvrirExterne).mockRejectedValueOnce(new Error('pas d’application'));
  rendu(<ClubOnglet />);
  expect(screen.queryByText("Impossible d'ouvrir le lien")).toBeNull();
  fireEvent.press(screen.getByText('Facebook'));
  expect(await screen.findByText("Impossible d'ouvrir le lien")).toBeOnTheScreen();
});

test('Le club : si l’itinéraire ne s’ouvre pas, un message le dit', async () => {
  jest.mocked(ouvrirItineraire).mockRejectedValueOnce(new Error('pas de carte'));
  rendu(<ClubOnglet />);
  fireEvent.press(screen.getByText('Gymnase du Petit Clamart'));
  expect(await screen.findByText("Impossible d'ouvrir l'itinéraire")).toBeOnTheScreen();
});
