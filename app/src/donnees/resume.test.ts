import { club, MAR_SOIR, MER_MIDI } from '../../test/donnees';
import { jourLocal, weekendDeReference } from './dates';
import { resumeCarte } from './resume';

const pour = (id: string, maintenant: Date) => resumeCarte(club, id, weekendDeReference(jourLocal(maintenant)), maintenant);

test('résultat du week-end, avec la série', () => {
  const r = pour('seniors-f-1', MAR_SOIR);
  expect(r.type).toBe('resultat');
  if (r.type !== 'resultat') return;
  expect(r.match.id).toBe('2644292');
  expect(r.phrase).toEqual({ titre: 'Victoire contre Ent. Suresnes / Nanterre', sousTitre: '3e victoire de suite' });
});

test('défaite d’un but', () => {
  const r = pour('seniors-m', MAR_SOIR);
  expect(r.type === 'resultat' && r.phrase.titre).toBe("Défaite d'un but contre Levallois SC 1D");
});

test('score pas encore publié', () => {
  expect(pour('u11-mixte-3', MAR_SOIR).type).toBe('en-attente');
});

test('pas de match ce week-end : prochain match, ou rien', () => {
  const avecProchain = pour('u11-mixte-1', MAR_SOIR);
  expect(avecProchain.type === 'sans-match' && avecProchain.prochain?.id).toBe('2710070');
  const sansProchain = pour('u18-m', MER_MIDI); // aucun match les 16-18 oct., aucun match programmé ensuite
  expect(sansProchain).toEqual({ type: 'sans-match', prochain: undefined });
});

test('le mercredi, on montre le match à venir', () => {
  const r = pour('seniors-m', MER_MIDI);
  expect(r.type === 'a-venir' && r.match.id).toBe('2734038');
});

test('le jour du match, avant le coup d’envoi', () => {
  const r = pour('seniors-f-1', new Date('2026-10-11T15:00:00+02:00'));
  expect(r.type === 'a-venir' && r.match.id).toBe('2644292');
});

test('à venir : le dernier match joué est donné avec sa phrase', () => {
  const r = pour('seniors-f-1', MER_MIDI);
  expect(r.type).toBe('a-venir');
  if (r.type !== 'a-venir') return;
  expect(r.match.id).toBe('2729291');
  expect(r.dernier?.match.id).toBe('2644292');
  expect(r.dernier?.phrase.titre).toBe('Victoire contre Ent. Suresnes / Nanterre');
});

test('à venir : le dernier match joué précède le match à venir', () => {
  const r = pour('seniors-f-1', new Date('2026-10-11T15:00:00+02:00')); // avant le coup d'envoi du 11 oct.
  expect(r.type === 'a-venir' && r.match.id).toBe('2644292');
  expect(r.type === 'a-venir' && r.dernier?.match.id).toBe('2644286');
});

test('à venir : pas de dernier résultat en début de saison', () => {
  const debut = pour('seniors-f-1', new Date('2026-09-10T12:00:00+02:00'));
  expect(debut.type === 'a-venir' && debut.match.id).toBe('2644268');
  expect(debut.type === 'a-venir' && debut.dernier).toBeUndefined();
});
