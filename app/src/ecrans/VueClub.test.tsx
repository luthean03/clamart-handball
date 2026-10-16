import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { rendu } from '../../test/rendu';
import { INFOS_CLUB } from '../club/infos';
import { VueClub } from './VueClub';

function club() {
  const p = { onOuvrirExterne: jest.fn(), onItineraire: jest.fn() };
  rendu(<VueClub {...p} />);
  return p;
}

test('le club : réseaux, gymnase, contact et horaires', () => {
  const p = club();
  expect(screen.getByText('Clamart Handball')).toBeOnTheScreen();
  expect(screen.getByText('Éducation · Plaisir · Compétition · depuis 2006')).toBeOnTheScreen();
  for (const texte of [
    'Nous suivre', 'Instagram', '@clamart_handball', 'Facebook', 'ClamartHandball', 'Site du club', 'clamart-handball.clubeo.com',
    'Nous trouver', 'Gymnase du Petit Clamart', '56 rue de la Bourcillière, 92140 Clamart',
    'Adresse du club', '1 place Jules Hunebelle, 92140 Clamart',
    'Nous écrire', 'Formulaire de contact', 'Horaires d’entraînement',
  ]) {
    expect(screen.getByText(texte)).toBeOnTheScreen();
  }

  fireEvent.press(screen.getByText('Instagram'));
  expect(p.onOuvrirExterne).toHaveBeenLastCalledWith('https://www.instagram.com/clamart_handball/');
  fireEvent.press(screen.getByText('Facebook'));
  expect(p.onOuvrirExterne).toHaveBeenLastCalledWith('https://www.facebook.com/ClamartHandball/');
  fireEvent.press(screen.getByText('Site du club'));
  expect(p.onOuvrirExterne).toHaveBeenLastCalledWith('https://clamart-handball.clubeo.com/');
  fireEvent.press(screen.getByText('Formulaire de contact'));
  expect(p.onOuvrirExterne).toHaveBeenLastCalledWith('https://clamart-handball.clubeo.com/contact.html');
  fireEvent.press(screen.getByText('Horaires d’entraînement'));
  expect(p.onOuvrirExterne).toHaveBeenLastCalledWith('https://clamart-handball.clubeo.com/page/horaires-et-categories.html');
  expect(p.onOuvrirExterne).toHaveBeenCalledTimes(5);

  fireEvent.press(screen.getByText('Gymnase du Petit Clamart'));
  expect(p.onItineraire).toHaveBeenCalledWith({ nom: 'Gymnase du Petit Clamart', adresse: '56 rue de la Bourcillière, 92140 Clamart' });
});

test('le club : l’adresse du club n’est pas cliquable', () => {
  const p = club();
  fireEvent.press(screen.getByText('1 place Jules Hunebelle, 92140 Clamart'));
  expect(p.onOuvrirExterne).not.toHaveBeenCalled();
  expect(p.onItineraire).not.toHaveBeenCalled();
});

test('le club : pas de numéro de téléphone', () => {
  club();
  expect(screen.queryByText(/06\s?58/)).toBeNull();
  expect(JSON.stringify(INFOS_CLUB)).not.toMatch(/\d{2}[\s.]?\d{2}[\s.]?\d{2}[\s.]?\d{2}[\s.]?\d{2}/);
});

test('le club : chaque ligne ouvrable est un bouton d’au moins 48 dp', () => {
  club();
  const lignes = screen.getAllByRole('button');
  expect(lignes).toHaveLength(6);
  for (const ligne of lignes) expect(StyleSheet.flatten(ligne.props.style).minHeight).toBeGreaterThanOrEqual(48);
});
