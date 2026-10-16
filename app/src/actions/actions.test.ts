import { Linking } from 'react-native';
import { club } from '../../test/donnees';
import { matchParId } from '../donnees/selecteurs';
import { evenementAgenda, ouvrirExterne, sansRejet, urlItineraire } from './actions';

const salle = { nom: 'GYMNASE DU PETIT CLAMART', adresse: '1 RUE DE L’EXEMPLE 92140 CLAMART' };

test('itinéraire : géo sur Android, Plans sur iOS', () => {
  const q = encodeURIComponent('GYMNASE DU PETIT CLAMART, 1 RUE DE L’EXEMPLE 92140 CLAMART');
  expect(urlItineraire(salle, 'android')).toBe(`geo:0,0?q=${q}`);
  expect(urlItineraire(salle, 'ios')).toBe(`maps:?q=${q}`);
  expect(urlItineraire({ nom: 'VICTOR HUGO', adresse: null }, 'android')).toBe(`geo:0,0?q=${encodeURIComponent('VICTOR HUGO')}`);
});

test('événement d’agenda : match à domicile', () => {
  const m = matchParId(club, '2734038')!;
  const e = evenementAgenda(m);
  expect(e.title).toBe('Clamart Seniors M – Association Sportive St-Cyr/Fontenay Handball 78');
  expect(e.startDate.getTime()).toBe(Date.parse('2026-10-17T18:00:00+02:00'));
  expect(e.endDate.getTime() - e.startDate.getTime()).toBe(90 * 60 * 1000);
  expect(e.location?.startsWith('Gymnase du Petit Clamart')).toBe(true);
  expect(e.notes).toBe(m.url_ffhb);
});

test('événement d’agenda : match à l’extérieur', () => {
  expect(evenementAgenda(matchParId(club, '2729291')!).title).toBe('Cellois HB – Clamart Seniors F 1');
});

test('ouvrirExterne confie l’adresse au système', async () => {
  const ouvrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await ouvrirExterne('webcal://exemple.fr/agenda/seniors-f-1.ics');
  expect(ouvrir).toHaveBeenCalledWith('webcal://exemple.fr/agenda/seniors-f-1.ics');
  ouvrir.mockRestore();
});

test('sansRejet : lance l’action et avale son refus (jamais de rejection non gérée)', async () => {
  const action = jest.fn(() => Promise.reject(new Error('pas d’agenda')));
  expect(() => sansRejet(action)).not.toThrow();
  expect(action).toHaveBeenCalledTimes(1);
  await new Promise<void>((resoudre) => setImmediate(() => resoudre())); // une rejection non gérée ferait échouer ce test
});
