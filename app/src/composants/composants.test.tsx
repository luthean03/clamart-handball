import { fireEvent, screen, within } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';
import { club, MAR_SOIR } from '../../test/donnees';
import { contenuDuBouton } from '../../test/boutons';
import { rendu } from '../../test/rendu';
import { matchParId } from '../donnees/selecteurs';
import { themeSombre } from '../theme/theme';
import { BandeauEtat } from './BandeauEtat';
import { EtatSansDonnees } from './EtatSansDonnees';
import { LigneMatch } from './LigneMatch';
import { Forme } from './PastilleResultat';

const m = (id: string) => matchParId(club, id)!;

test('ligne d’un match joué à domicile', () => {
  const onPress = jest.fn();
  rendu(<LigneMatch match={m('2644292')} maintenant={MAR_SOIR} onPress={onPress} />);
  expect(screen.getByText('Clamart Seniors F 1')).toBeOnTheScreen();
  expect(screen.getByText('Ent. Suresnes / Nanterre')).toBeOnTheScreen();
  expect(screen.getByText('Fin')).toBeOnTheScreen();
  expect(screen.getByText('16:15')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Clamart Seniors F 1 32, Ent. Suresnes / Nanterre 22, victoire'));
  expect(onPress).toHaveBeenCalled();
});

test('ligne d’un match à l’extérieur : l’équipe qui reçoit en premier', () => {
  rendu(<LigneMatch match={m('2644473')} maintenant={MAR_SOIR} onPress={jest.fn()} />);
  expect(screen.getByLabelText('Paris SC 1D 17, Clamart Seniors F 1B 20, victoire')).toBeOnTheScreen();
});

test('ligne : score pas encore publié, puis match à venir', () => {
  const enAttente = club.equipes.find((e) => e.collectif === 'u11-mixte-3')!.matchs.find((x) => x.date?.startsWith('2026-10-10'))!;
  rendu(<LigneMatch match={m(enAttente.id)} maintenant={MAR_SOIR} onPress={jest.fn()} />);
  expect(screen.getByText('Attente')).toBeOnTheScreen();
  screen.unmount();
  rendu(<LigneMatch match={m('2734038')} maintenant={MAR_SOIR} onPress={jest.fn()} afficherCompetition />);
  expect(screen.getByText('18:00')).toBeOnTheScreen();
  expect(screen.getByText(/Coupe de France départementale/)).toBeOnTheScreen();
});

test('un nom long peut tenir sur trois lignes : le nom de l’équipe ne se perd jamais', () => {
  rendu(<LigneMatch match={m('2734038')} maintenant={MAR_SOIR} onPress={jest.fn()} />);
  expect(screen.getByText(/^Association Sportive St-.?Cyr\/Fontenay Handball 78$/)).toHaveProp('numberOfLines', 3);
});

test('adversaire sans écusson : un monogramme décoratif, pas un disque vide', () => {
  rendu(<LigneMatch match={m('2644473')} maintenant={MAR_SOIR} onPress={jest.fn()} />);
  const monogramme = screen.getByTestId('monogramme', { includeHiddenElements: true });
  expect(within(monogramme).getByText('PS', { includeHiddenElements: true })).toBeOnTheScreen();
  expect(monogramme.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(monogramme.props.accessibilityElementsHidden).toBe(true);
  // décoratif : ni lu ni exposé par la ligne
  expect(screen.queryByText('PS')).toBeNull();
  expect(screen.getAllByTestId('monogramme', { includeHiddenElements: true })).toHaveLength(1);
});

test('les scores sont alignés à droite sur une colonne de largeur minimale fixe', () => {
  rendu(<LigneMatch match={m('2644292')} maintenant={MAR_SOIR} onPress={jest.fn()} />);
  for (const score of [screen.getByTestId('score-dom'), screen.getByTestId('score-ext')]) {
    const style = StyleSheet.flatten(score.props.style);
    expect(style.textAlign).toBe('right');
    expect(style.minWidth).toBeGreaterThanOrEqual(32);
    expect(style.fontVariant).toEqual(['tabular-nums']);
  }
});

test('police agrandie : la colonne de statut grandit et ne coupe jamais « Attente »', () => {
  const enAttente = club.equipes.find((e) => e.collectif === 'u11-mixte-3')!.matchs.find((x) => x.date?.startsWith('2026-10-10'))!;
  rendu(<LigneMatch match={m(enAttente.id)} maintenant={MAR_SOIR} onPress={jest.fn()} />);
  const statut = screen.getByTestId('statut');
  const style = StyleSheet.flatten(statut.props.style);
  expect(style.width).toBeUndefined();
  expect(style.minWidth).toBeGreaterThanOrEqual(56);
  expect(screen.getByText('Attente')).toHaveProp('numberOfLines', 1);
  expect(screen.getByText('Attente')).not.toHaveProp('adjustsFontSizeToFit', true);
});

test('noms d’équipes : pas de coupure en plein mot, numéro final lié au mot précédent', () => {
  rendu(<LigneMatch match={m('2644473')} maintenant={MAR_SOIR} onPress={jest.fn()} />);
  const nom = screen.getByText('Paris SC 1D');
  expect(nom).toHaveProp('android_hyphenationFrequency', 'none');
  expect(nom).toHaveProp('textBreakStrategy', 'simple');
  expect(nom.props.children).toBe('Paris SC\u00A01D');
  expect(screen.getByText('Clamart Seniors F 1B').props.children).toBe('Clamart Seniors F\u00A01B');
});

test('un nom à trait d’union peut se couper après le trait d’union, sans changer le libellé lu', () => {
  rendu(<LigneMatch match={m('2644274')} maintenant={MAR_SOIR} onPress={jest.fn()} />);
  const nom = screen.getByText(/^AC Boulogne-.?Billancourt 1B$/);
  expect(nom.props.children).toBe('AC Boulogne-\u200BBillancourt\u00A01B');
  expect(nom).toHaveProp('numberOfLines', 3);
  expect(nom).toHaveProp('android_hyphenationFrequency', 'none');
  expect(screen.getByLabelText('Clamart Seniors F 1 22, AC Boulogne-Billancourt 1B 25, défaite')).toBeOnTheScreen();
});

test('forme : lettres et libellé lu', () => {
  rendu(<Forme resultats={['V', 'D', 'V']} />);
  expect(screen.getAllByText('V')).toHaveLength(2);
  expect(screen.getByLabelText('Forme : victoire, défaite, victoire')).toBeOnTheScreen();
});

test('bandeau : rien si les données sont fraîches', () => {
  rendu(<BandeauEtat horsLigne={false} miseAJour={club.mis_a_jour} maintenant={MAR_SOIR} />);
  expect(screen.queryByRole('alert')).toBeNull();
});

test('bandeau hors ligne et bandeau données anciennes', () => {
  rendu(<BandeauEtat horsLigne miseAJour={club.mis_a_jour} maintenant={MAR_SOIR} />);
  expect(screen.getByText('Hors ligne · résultats mis à jour à 16:41')).toBeOnTheScreen();
  screen.unmount();
  rendu(<BandeauEtat horsLigne={false} miseAJour={club.mis_a_jour} maintenant={new Date('2026-10-16T09:00:00+02:00')} />);
  expect(screen.getByText("Les résultats n'ont pas été mis à jour depuis le mar. 13 oct.")).toBeOnTheScreen();
});

test('état sans données : chargement, erreur réseau, nouvelle version', () => {
  rendu(<EtatSansDonnees chargement erreur={null} reessayer={jest.fn()} />);
  expect(screen.getByLabelText('Chargement des résultats')).toBeOnTheScreen();
  screen.unmount();

  const reessayer = jest.fn();
  const reseau = Object.assign(new Error('Pas de connexion'), { name: 'ErreurReseau' });
  rendu(<EtatSansDonnees chargement={false} erreur={reseau} reessayer={reessayer} />);
  fireEvent.press(screen.getByText('Réessayer'));
  expect(reessayer).toHaveBeenCalled();
  screen.unmount();

  const ouvrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const schema = Object.assign(new Error('x'), { name: 'SchemaInconnu' });
  rendu(<EtatSansDonnees chargement={false} erreur={schema} reessayer={jest.fn()} />, themeSombre);
  expect(screen.getByText("Une nouvelle version de l'app est nécessaire")).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Mettre à jour'));
  expect(ouvrir).toHaveBeenCalledWith('market://details?id=fr.clamarthandball.app');
});

test('les boutons de l’état sans données ont une zone tactile d’au moins 48 dp', () => {
  rendu(<EtatSansDonnees chargement={false} erreur={null} reessayer={jest.fn()} />);
  expect(contenuDuBouton(screen.getByText('Réessayer')).minHeight).toBeGreaterThanOrEqual(48);
  screen.unmount();
  rendu(<EtatSansDonnees chargement={false} erreur={Object.assign(new Error('x'), { name: 'SchemaInconnu' })} reessayer={jest.fn()} />);
  expect(contenuDuBouton(screen.getByText('Mettre à jour')).minHeight).toBeGreaterThanOrEqual(48);
});
