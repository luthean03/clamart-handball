import { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { contenuDuBouton } from '../../test/boutons';
import { rendu } from '../../test/rendu';
import { CLE_CLUB } from '../donnees/requetes';
import * as fcm from './fcm';
import { GestionNotifications } from './GestionNotifications';

const { __routeur } = jest.requireMock('expo-router');
const notif = { titre: 'Clamart 21 – 22 Levallois SC 1D', corps: 'Seniors M · D2 territoriale', donnees: { match_id: '2673792', equipe_id: '32546-clamart-handball' } };

beforeEach(() => jest.clearAllMocks());

function clientEspionne() {
  const client = new QueryClient();
  const invalider = jest.spyOn(client, 'invalidateQueries').mockResolvedValue();
  return { client, invalider };
}

test('au premier plan : snackbar avec « Voir »', () => {
  let recevoir: (n: typeof notif) => void = () => {};
  jest.mocked(fcm.ecouterPremierPlan).mockImplementation((cb) => { recevoir = cb; return () => {}; });
  rendu(<GestionNotifications />);
  act(() => recevoir(notif));
  expect(screen.getByText(/Clamart 21 – 22 Levallois SC 1D/)).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Voir'));
  expect(__routeur.push).toHaveBeenCalledWith('/match/2673792?equipe=32546-clamart-handball');
});

test('notification touchée : ouvre la fiche du match', () => {
  let ouvrir: (n: typeof notif) => void = () => {};
  jest.mocked(fcm.ecouterOuverture).mockImplementation((cb) => { ouvrir = cb; return () => {}; });
  rendu(<GestionNotifications />);
  act(() => ouvrir(notif));
  expect(__routeur.push).toHaveBeenCalledWith('/match/2673792?equipe=32546-clamart-handball');
});

test('app lancée par une notification', async () => {
  jest.mocked(fcm.notificationInitiale).mockResolvedValueOnce(notif);
  rendu(<GestionNotifications />);
  await act(async () => {});
  expect(__routeur.push).toHaveBeenCalledWith('/match/2673792?equipe=32546-clamart-handball');
});

test('« Voir » est une cible de 48 dp au moins', () => {
  let recevoir: (n: typeof notif) => void = () => {};
  jest.mocked(fcm.ecouterPremierPlan).mockImplementation((cb) => { recevoir = cb; return () => {}; });
  rendu(<GestionNotifications />);
  act(() => recevoir(notif));
  expect(contenuDuBouton(screen.getByText('Voir')).minHeight).toBeGreaterThanOrEqual(48);
});

test('sans titre, le snackbar affiche le corps', () => {
  let recevoir: (n: { corps: string; donnees: Record<string, string> }) => void = () => {};
  jest.mocked(fcm.ecouterPremierPlan).mockImplementation((cb) => { recevoir = cb; return () => {}; });
  rendu(<GestionNotifications />);
  act(() => recevoir({ corps: 'Seniors M · D2 territoriale', donnees: {} }));
  expect(screen.getByText('Seniors M · D2 territoriale')).toBeOnTheScreen();
});

test('titre et corps sont affichés ensemble (on sait de quelle équipe il s’agit)', () => {
  let recevoir: (n: typeof notif) => void = () => {};
  jest.mocked(fcm.ecouterPremierPlan).mockImplementation((cb) => { recevoir = cb; return () => {}; });
  rendu(<GestionNotifications />);
  act(() => recevoir(notif));
  expect(screen.getByText('Clamart 21 – 22 Levallois SC 1D\nSeniors M · D2 territoriale')).toBeOnTheScreen();
});

test('sans corps, le snackbar affiche le titre seul', () => {
  let recevoir: (n: { titre: string; donnees: Record<string, string> }) => void = () => {};
  jest.mocked(fcm.ecouterPremierPlan).mockImplementation((cb) => { recevoir = cb; return () => {}; });
  rendu(<GestionNotifications />);
  act(() => recevoir({ titre: 'Clamart 21 – 22 Levallois SC 1D', donnees: {} }));
  expect(screen.getByText('Clamart 21 – 22 Levallois SC 1D')).toBeOnTheScreen();
});

describe('rafraîchissement des données à la réception d’une notification', () => {
  test('au premier plan', () => {
    const { client, invalider } = clientEspionne();
    let recevoir: (n: typeof notif) => void = () => {};
    jest.mocked(fcm.ecouterPremierPlan).mockImplementation((cb) => { recevoir = cb; return () => {}; });
    rendu(<GestionNotifications />, undefined, client);
    expect(invalider).not.toHaveBeenCalled();
    act(() => recevoir(notif));
    expect(invalider).toHaveBeenCalledWith({ queryKey: CLE_CLUB });
  });

  test('quand on touche la notification', () => {
    const { client, invalider } = clientEspionne();
    let ouvrir: (n: typeof notif) => void = () => {};
    jest.mocked(fcm.ecouterOuverture).mockImplementation((cb) => { ouvrir = cb; return () => {}; });
    rendu(<GestionNotifications />, undefined, client);
    act(() => ouvrir(notif));
    expect(invalider).toHaveBeenCalledWith({ queryKey: CLE_CLUB });
  });

  test('quand l’app est lancée par la notification', async () => {
    const { client, invalider } = clientEspionne();
    jest.mocked(fcm.notificationInitiale).mockResolvedValueOnce(notif);
    rendu(<GestionNotifications />, undefined, client);
    await act(async () => {});
    expect(invalider).toHaveBeenCalledWith({ queryKey: CLE_CLUB });
  });
});
