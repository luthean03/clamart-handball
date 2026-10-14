import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { club, MAR_SOIR } from '../../test/donnees';
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

test('limite un nom long à deux lignes', () => {
  rendu(<LigneMatch match={m('2734038')} maintenant={MAR_SOIR} onPress={jest.fn()} />);
  expect(screen.getByText('Association Sportive St-Cyr/Fontenay Handball 78')).toHaveProp('numberOfLines', 2);
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
