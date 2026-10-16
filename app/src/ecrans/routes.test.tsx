import { act, fireEvent, screen } from '@testing-library/react-native';
import { club } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import { ouvrirExterne } from '../actions/actions';
import { lienMatch, lienSaison } from '../actions/agenda';
import { URL_AGENDAS } from '../config';
import { matchParId } from '../donnees/selecteurs';
import Accueil from '../app/(tabs)/index';
import Equipe from '../app/equipe/[collectif]';
import Match from '../app/match/[id]';

let accueil: { onAgenda: (m: unknown) => void } | undefined;
let fiche: { onAgenda: (m: unknown) => void } | undefined;
let equipe: { onAgenda: () => void } | undefined;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({ collectif: 'seniors-f-1' }),
}));
jest.mock('../actions/actions', () => ({ ...jest.requireActual('../actions/actions'), ouvrirExterne: jest.fn(() => Promise.resolve()) }));
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

beforeEach(() => jest.mocked(ouvrirExterne).mockClear());

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
