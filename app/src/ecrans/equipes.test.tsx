import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { club, MAR_SOIR } from '../../test/donnees';
import { rendu } from '../../test/rendu';
import { matchsDuCollectif } from '../donnees/selecteurs';
import { VueEquipe } from './VueEquipe';
import { VueEquipes } from './VueEquipes';

test('liste des équipes par catégorie, avec la cloche suivre', () => {
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
  // Le bouton texte de Paper mesure 40 dp.
  const copier = screen.getAllByRole('button', { name: 'Copier le lien' })[0].props.hitSlop;
  expect(40 + copier.top + copier.bottom).toBeGreaterThanOrEqual(48);
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
