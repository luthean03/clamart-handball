import { act, fireEvent, screen } from '@testing-library/react-native';
import { contenuDuBouton } from '../../test/boutons';
import { rendu } from '../../test/rendu';
import * as fcm from './fcm';
import { GestionNotifications } from './GestionNotifications';

const { __routeur } = jest.requireMock('expo-router');
const notif = { titre: 'Clamart 21 – 22 Levallois SC 1D', corps: 'Seniors M · D2 territoriale', donnees: { match_id: '2673792', equipe_id: '32546-clamart-handball' } };

beforeEach(() => jest.clearAllMocks());

test('au premier plan : snackbar avec « Voir »', () => {
  let recevoir: (n: typeof notif) => void = () => {};
  jest.mocked(fcm.ecouterPremierPlan).mockImplementation((cb) => { recevoir = cb; return () => {}; });
  rendu(<GestionNotifications />);
  act(() => recevoir(notif));
  expect(screen.getByText('Clamart 21 – 22 Levallois SC 1D')).toBeOnTheScreen();
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
