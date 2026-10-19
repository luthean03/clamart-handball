import { act, fireEvent, screen } from '@testing-library/react-native';
import { AppState, StyleSheet } from 'react-native';
import { rendu } from '../../test/rendu';
import { lienCompetitionFfhb, type Competition } from '../actions/agenda';
import { DialogueCompetitions } from './DialogueCompetitions';

const competitions: Competition[] = [
  { competitionId: '32546', detail: 'D2 territoriale' },
  { competitionId: '33403', detail: 'Coupe de Ligue' },
  { competitionId: '33244', detail: 'Coupe de France départementale' },
];
const lien = (i: number) => lienCompetitionFfhb('apple', competitions[i].competitionId, '3309');

let retours: ((etat: string) => void)[] = [];
beforeEach(() => {
  retours = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, f: (etat: string) => void) => {
    retours.push(f);
    return { remove: () => { retours = retours.filter((r) => r !== f); } };
  }) as never);
});
afterEach(() => jest.restoreAllMocks());

function dialogue(ouvre: (url: string) => Promise<boolean> = () => Promise.resolve(true)) {
  const p = { onFermer: jest.fn(), onOuvrir: jest.fn(ouvre) };
  rendu(<DialogueCompetitions visible collectif="Seniors M" appli="apple" competitions={competitions} clubId="3309" {...p} />);
  return p;
}
const retourDansLApp = () => act(() => retours.forEach((r) => r('active')));
const coche = (nom: string) => screen.getByRole('checkbox', { name: new RegExp(nom) });

test('dialogue : titre, sous-titre et une pastille cochée par compétition', () => {
  dialogue();
  expect(screen.getByText('Compétitions à ajouter')).toBeOnTheScreen();
  expect(screen.getByText('Seniors M · calendriers officiels ffhandball.fr')).toBeOnTheScreen();
  for (const c of competitions) expect(screen.getByRole('checkbox', { name: c.detail })).toBeChecked();
  expect(screen.getByText('Annuler')).toBeOnTheScreen();
  expect(StyleSheet.flatten(coche('D2 territoriale').props.style).minHeight).toBeGreaterThanOrEqual(48);
});

test('dialogue : toucher une pastille la décoche ; sans rien de coché, « S’abonner » est inactif', () => {
  const p = dialogue();
  fireEvent.press(coche('Coupe de Ligue'));
  expect(coche('Coupe de Ligue')).not.toBeChecked();
  for (const nom of ['D2 territoriale', 'Coupe de France départementale']) fireEvent.press(coche(nom));
  fireEvent.press(screen.getByText("S'abonner"));
  expect(p.onOuvrir).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: "S'abonner" })).toBeDisabled();
});

test('« S’abonner » ouvre la première compétition cochée', () => {
  const p = dialogue();
  fireEvent.press(coche('D2 territoriale'));
  fireEvent.press(screen.getByText("S'abonner"));
  expect(p.onOuvrir).toHaveBeenCalledTimes(1);
  expect(p.onOuvrir).toHaveBeenCalledWith(lien(1));
});

test('retour dans l’app : la compétition est « Ajouté », la suivante s’ouvre', async () => {
  const p = dialogue();
  await act(async () => fireEvent.press(screen.getByText("S'abonner")));
  expect(p.onOuvrir).toHaveBeenLastCalledWith(lien(0));
  expect(screen.queryByText('✓ Ajouté')).toBeNull();
  retourDansLApp();
  expect(screen.getByText('✓ Ajouté')).toBeOnTheScreen();
  expect(screen.getByText('1 sur 3 ajouté')).toBeOnTheScreen();
  expect(screen.queryByText('Annuler')).toBeNull();
  fireEvent.press(coche('D2 territoriale'));            // déjà ajoutée : pas touchable
  expect(coche('D2 territoriale')).toBeChecked();
  await act(async () => fireEvent.press(screen.getByText("S'abonner à la suivante")));
  expect(p.onOuvrir).toHaveBeenLastCalledWith(lien(1));
  retourDansLApp();
  expect(screen.getByText('2 sur 3 ajouté')).toBeOnTheScreen();
  await act(async () => fireEvent.press(screen.getByText("S'abonner à la suivante")));
  expect(p.onOuvrir).toHaveBeenLastCalledWith(lien(2));
  retourDansLApp();
  expect(screen.getByText('3 sur 3 ajouté')).toBeOnTheScreen();
  expect(screen.queryByText("S'abonner à la suivante")).toBeNull();
  fireEvent.press(screen.getByText('Terminer'));
  expect(p.onFermer).toHaveBeenCalled();
});

test('un retour dans l’app sans lien ouvert ne marque rien', () => {
  dialogue();
  retourDansLApp();
  expect(screen.queryByText('✓ Ajouté')).toBeNull();
});

test('lien impossible à ouvrir : rien n’est marqué ajouté, le dialogue reste', async () => {
  const p = dialogue(() => Promise.resolve(false));
  await act(async () => fireEvent.press(screen.getByText("S'abonner")));
  retourDansLApp();
  expect(screen.queryByText('✓ Ajouté')).toBeNull();
  expect(screen.getByText('Compétitions à ajouter')).toBeOnTheScreen();
  expect(p.onFermer).not.toHaveBeenCalled();
});

test('« Annuler » ferme le dialogue', () => {
  const p = dialogue();
  fireEvent.press(screen.getByText('Annuler'));
  expect(p.onFermer).toHaveBeenCalled();
});
