import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { club, MAR_SOIR } from '../../test/donnees';
import { contenuDuBouton } from '../../test/boutons';
import { rendu } from '../../test/rendu';
import { matchsDuCollectif } from '../donnees/selecteurs';
import { VueEquipe } from './VueEquipe';
import { VueEquipes } from './VueEquipes';

test('liste des équipes par catégorie, avec l’étoile suivre', () => {
  const onBasculer = jest.fn();
  const onOuvrirEquipe = jest.fn();
  rendu(<VueEquipes club={club} suivis={['seniors-f-1']} onBasculer={onBasculer} onOuvrirEquipe={onOuvrirEquipe} />);
  expect(screen.getByText('U18')).toBeOnTheScreen();
  expect(screen.getByText(/D2 territoriale · .*Coupe de France départementale/)).toBeOnTheScreen();
  expect(screen.getByLabelText('Ne plus suivre Seniors F 1')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Suivre Seniors M'));
  expect(onBasculer).toHaveBeenCalledWith('seniors-m');
  fireEvent.press(screen.getByText('U15 M'));
  expect(onOuvrirEquipe).toHaveBeenCalledWith('u15-m');
});

test('chaque cloche de la liste a une cible tactile d’au moins 48 dp', () => {
  rendu(<VueEquipes club={club} suivis={[]} onBasculer={jest.fn()} onOuvrirEquipe={jest.fn()} />);
  const cloches = screen.getAllByTestId('icon-button-container-outer-layer');
  expect(cloches.length).toBe(club.collectifs.length);
  for (const cloche of cloches) {
    const style = StyleSheet.flatten(cloche.props.style);
    expect(style.width).toBeGreaterThanOrEqual(48);
    expect(style.height).toBeGreaterThanOrEqual(48);
  }
});

test('le suivi est une étoile, jamais une cloche (pas de notifications avant le Plan 3)', () => {
  rendu(<VueEquipes club={club} suivis={['seniors-f-1']} onBasculer={jest.fn()} onOuvrirEquipe={jest.fn()} />);
  const icones = { includeHiddenElements: true };
  expect(screen.getAllByText('star', icones)).toHaveLength(1);
  expect(screen.getAllByText('star-outline', icones)).toHaveLength(club.collectifs.length - 1);
  expect(screen.queryByText(/bell/, icones)).toBeNull();
});

test('liste des équipes : noms sans coupure en plein mot, rang en espaces insécables', () => {
  rendu(<VueEquipes club={club} suivis={[]} onBasculer={jest.fn()} onOuvrirEquipe={jest.fn()} />);
  const nom = screen.getByText('Seniors F 1');
  expect(nom).toHaveProp('android_hyphenationFrequency', 'none');
  expect(nom).toHaveProp('textBreakStrategy', 'simple');
  expect(nom.props.children).toBe('Seniors F\u00A01');
  expect(screen.getByText(/3e sur 11/).props.children).toContain('3e\u00A0sur\u00A011');
});

test('liste ouverte depuis Réglages ou l’Accueil : bouton retour et titre « Mes équipes »', () => {
  const onRetour = jest.fn();
  rendu(<VueEquipes club={club} suivis={[]} onBasculer={jest.fn()} onOuvrirEquipe={jest.fn()} onRetour={onRetour} />);
  expect(screen.getByText('Mes équipes')).toBeOnTheScreen();
  expect(screen.queryByText('Équipes')).toBeNull();
  fireEvent.press(screen.getByLabelText('Retour'));
  expect(onRetour).toHaveBeenCalled();
  const retour = screen.getAllByTestId('icon-button-container-outer-layer');
  const style = StyleSheet.flatten(retour[0].props.style);
  expect(style.width).toBeGreaterThanOrEqual(48);
  expect(style.height).toBeGreaterThanOrEqual(48);
});

test('liste dans l’onglet Équipes : pas de bouton retour', () => {
  rendu(<VueEquipes club={club} suivis={[]} onBasculer={jest.fn()} onOuvrirEquipe={jest.fn()} />);
  expect(screen.getByText('Équipes')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Retour')).toBeNull();
});

function fiche(collectifId: string, props: Partial<Parameters<typeof VueEquipe>[0]> = {}) {
  const p = {
    club, collectifId, maintenant: MAR_SOIR, suivi: false, onBasculer: jest.fn(), onOuvrirMatch: jest.fn(),
    onRetour: jest.fn(), onCopierAgenda: jest.fn(() => Promise.resolve(true)), ...props,
  };
  rendu(<VueEquipe {...p} />);
  return p;
}

test('fiche équipe : tous les matchs de la saison', () => {
  fiche('seniors-f-1');
  expect(screen.getByText('Seniors F 1')).toBeOnTheScreen();
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(matchsDuCollectif(club, 'seniors-f-1').length);
});

test('fiche équipe : classement avec la ligne du club', () => {
  fiche('seniors-f-1');
  fireEvent.press(screen.getByText('Classement'));
  expect(screen.getByText('Martigua SCL')).toBeOnTheScreen();
  expect(screen.getByLabelText(/^3e, Clamart Handball 1, 13 points/)).toBeOnTheScreen();
});

test('fiche équipe : buteurs pour les seniors, jamais pour les jeunes', () => {
  fiche('seniors-f-1');
  fireEvent.press(screen.getByText('Buteurs'));
  expect(screen.getByText('Diara DORILAS')).toBeOnTheScreen();
  expect(screen.getByText('38')).toBeOnTheScreen();
  screen.unmount();
  fiche('u18-f');
  expect(screen.queryByText('Buteurs')).toBeNull();
});

test('fiche équipe : suivre, copier l’agenda, retour', async () => {
  const p = fiche('seniors-m', { suivi: true });
  fireEvent.press(screen.getByLabelText('Ne plus suivre Seniors M'));
  expect(p.onBasculer).toHaveBeenCalled();
  fireEvent.press(screen.getAllByText('Copier le lien')[0]);
  expect(p.onCopierAgenda).toHaveBeenCalledWith(expect.objectContaining({ id: '32546-clamart-handball' }));
  await waitFor(() => expect(screen.getByText("Lien de l'agenda copié")).toBeOnTheScreen());
  fireEvent.press(screen.getByLabelText('Retour'));
  expect(p.onRetour).toHaveBeenCalled();
});

test('fiche équipe : le suivi est une étoile et le rang ne se coupe pas', () => {
  fiche('seniors-f-1', { suivi: true });
  const icones = { includeHiddenElements: true };
  expect(screen.getByText('star', icones)).toBeOnTheScreen();
  expect(screen.queryByText(/bell/, icones)).toBeNull();
  expect(screen.getByText(/· 3e sur 11$/).props.children.join('')).toMatch(/· 3e\u00A0sur\u00A011$/);
  screen.unmount();
  fiche('seniors-f-1', { suivi: false });
  expect(screen.getByText('star-outline', { includeHiddenElements: true })).toBeOnTheScreen();
});

test('fiche équipe : si la copie échoue, on ne dit pas que le lien est copié', async () => {
  fiche('seniors-m', { onCopierAgenda: jest.fn(() => Promise.reject(new Error('presse-papiers'))) });
  fireEvent.press(screen.getAllByText('Copier le lien')[0]);
  await waitFor(() => expect(screen.getByText('Impossible de copier le lien')).toBeOnTheScreen());
  expect(screen.queryByText("Lien de l'agenda copié")).toBeNull();
});

test('fiche équipe : retour et cloche ont une cible tactile d’au moins 48 dp', () => {
  fiche('seniors-m');
  const boutons = screen.getAllByTestId('icon-button-container-outer-layer');
  expect(boutons).toHaveLength(2);
  for (const bouton of boutons) {
    const style = StyleSheet.flatten(bouton.props.style);
    expect(style.width).toBeGreaterThanOrEqual(48);
    expect(style.height).toBeGreaterThanOrEqual(48);
  }
});

test('fiche équipe : onglets et « Copier le lien » ont une cible tactile d’au moins 48 dp', () => {
  fiche('seniors-m');
  // Les segments de Paper mesurent 40 dp : la marge de toucher complète à 48 dp.
  const segment = screen.getByRole('button', { name: 'Classement' }).props.hitSlop;
  expect(40 + segment.top + segment.bottom).toBeGreaterThanOrEqual(48);
  // Le bouton texte de Paper mesure 40 dp : la hauteur minimale est sur son contenu, qui porte la zone tactile.
  const copier = screen.getAllByRole('button', { name: 'Copier le lien' })[0];
  expect(contenuDuBouton(copier).minHeight).toBeGreaterThanOrEqual(48);
  expect(copier.props.hitSlop).toBeUndefined();
});

test('fiche équipe introuvable', () => {
  fiche('equipe-disparue');
  expect(screen.getByText('Équipe introuvable')).toBeOnTheScreen();
});

test('fiche équipe introuvable : le retour a une cible tactile d’au moins 48 dp', () => {
  fiche('equipe-disparue');
  const style = StyleSheet.flatten(screen.getByTestId('icon-button-container-outer-layer').props.style);
  expect(style.width).toBeGreaterThanOrEqual(48);
  expect(style.height).toBeGreaterThanOrEqual(48);
});
