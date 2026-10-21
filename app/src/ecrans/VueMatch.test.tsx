import { StyleSheet } from 'react-native';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { Button } from 'react-native-paper';
import type { ReactTestInstance } from 'react-test-renderer';
import { club, MAR_SOIR } from '../../test/donnees';
import { contenuDuBouton } from '../../test/boutons';
import { rendu } from '../../test/rendu';
import type { Buteur, Club } from '../donnees/types';
import { matchParId } from '../donnees/selecteurs';
import { VueMatch } from './VueMatch';

function vue(matchId: string, c: Club = club) {
  const p = { club: c, matchId, maintenant: MAR_SOIR, onRetour: jest.fn(), onItineraire: jest.fn(), onOuvrirLien: jest.fn(), onAgenda: jest.fn() };
  rendu(<VueMatch {...p} />);
  return p;
}

test('match joué : phrase, score, mi-temps, salle, feuille de match', () => {
  const p = vue('2644292');
  const m = matchParId(club, '2644292')!;
  expect(screen.getByText('Victoire contre Ent. Suresnes / Nanterre')).toBeOnTheScreen();
  expect(screen.getByText('Mi-temps 16–9')).toBeOnTheScreen();
  expect(screen.getByText('dimanche 11 oct. à 16:15')).toBeOnTheScreen();
  expect(screen.getByText('Gymnase du Petit Clamart · domicile')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Itinéraire'));
  expect(p.onItineraire).toHaveBeenCalledWith(m.salle);
  fireEvent.press(screen.getByText('Feuille de match'));
  expect(p.onOuvrirLien).toHaveBeenCalledWith(m.feuille_de_match);
  fireEvent.press(screen.getByText('Voir sur ffhandball.fr'));
  expect(p.onOuvrirLien).toHaveBeenCalledWith(m.url_ffhb);
});

test('match joué senior : les buteurs du club', () => {
  vue('2644292');
  const premier = matchParId(club, '2644292')!.buteurs!.find((b) => b.buts > 0)!;
  expect(screen.getByText('Match')).toBeOnTheScreen();
  expect(screen.queryByText('Buteurs')).toBeNull();
  expect(screen.getByText(premier.joueur)).toBeOnTheScreen();
});

test('le score est lu en une phrase par les lecteurs d’écran', () => {
  vue('2644292');
  expect(screen.getByLabelText('Clamart Seniors F 1 32, Ent. Suresnes / Nanterre 22, victoire')).toBeOnTheScreen();
});

test('match à venir : le score est lu « contre »', () => {
  vue('2734038');
  const m = matchParId(club, '2734038')!;
  expect(m.domicile).toBe(true);
  expect(screen.getByLabelText(`Clamart ${m.equipe.nom} contre Association Sportive St-Cyr/Fontenay Handball 78`)).toBeOnTheScreen();
});

test('match sans joueurs publiés : pas de section Match', () => {
  vue('2740456');
  expect(screen.getByText('Défaite contre Paris St-Germain HB 3')).toBeOnTheScreen();
  expect(screen.queryByText('Match')).toBeNull();
});

/** Le match 2644292 avec nos buteurs et ceux de l'adversaire (schéma 3). */
function clubAvecButeurs(nous: Buteur[], eux?: Buteur[]): Club {
  return {
    ...club,
    equipes: club.equipes.map((e) => ({
      ...e,
      matchs: e.matchs.map((m) => (m.id === '2644292' ? { ...m, buteurs: nous, buteurs_adverses: eux } : m)),
    })),
  };
}

test('fiche : compétition en tête des infos', () => {
  vue('2644292');
  expect(screen.getByText('D1 territoriale')).toBeOnTheScreen();
  expect(screen.getByText('dimanche 11 oct. à 16:15')).toBeOnTheScreen();
  expect(screen.getByText('Gymnase du Petit Clamart · domicile')).toBeOnTheScreen();
  expect(screen.getByText('56 rue de la bourcilliere 92140 CLAMART')).toBeOnTheScreen();
});

test('fiche : tous les joueurs des deux équipes, buts décroissants puis nom, même à 0 but', () => {
  const c = clubAvecButeurs(
    [
      { joueur: 'M. Kobzili', numero: 3, buts: 0 },
      { joueur: 'L. Ladjel', numero: 64, buts: 4 },
      { joueur: 'D. Dorilas', numero: 19, buts: 9 },
      { joueur: 'B. Abdi', numero: 8, buts: 0 },
      { joueur: 'A. Zidane', numero: 2, buts: 4 },
    ],
    [{ joueur: 'A. Kouadio', numero: 7, buts: 5 }, { joueur: 'S. Nguyen', numero: 12, buts: 0 }],
  );
  vue('2644292', c);
  expect(screen.getByText('Match')).toBeOnTheScreen();
  expect(screen.getByText('Clamart')).toBeOnTheScreen();
  // le nom de l'adversaire est dans le score et dans le titre de sa colonne
  expect(screen.getAllByText('Ent. Suresnes / Nanterre')).toHaveLength(2);
  const noms = screen.getAllByText(/^[A-Z]\. /).map((n) => n.props.children);
  expect(noms).toEqual(['D. Dorilas', 'A. Zidane', 'L. Ladjel', 'B. Abdi', 'M. Kobzili', 'A. Kouadio', 'S. Nguyen']);
  expect(screen.getByLabelText('numéro 19, D. Dorilas, 9 buts')).toBeOnTheScreen();
  expect(screen.getByLabelText('numéro 3, M. Kobzili, 0 but')).toBeOnTheScreen();
  expect(screen.getByLabelText('numéro 12, S. Nguyen, 0 but')).toBeOnTheScreen();
});

test('fiche : le nombre de buts est affiché, y compris 0', () => {
  vue('2644292', clubAvecButeurs([{ joueur: 'D. Dorilas', numero: 19, buts: 3 }, { joueur: 'M. Kobzili', numero: 3, buts: 0 }]));
  const ligne = (nom: string) => within(screen.getByLabelText(new RegExp(`^numéro \\d+, ${nom}, `)));
  expect(ligne('D. Dorilas').getByText('3')).toBeOnTheScreen();
  expect(ligne('M. Kobzili').getByText('0')).toBeOnTheScreen();
});

test('fiche : un but au singulier', () => {
  vue('2644292', clubAvecButeurs([{ joueur: 'D. Dorilas', numero: 19, buts: 1 }]));
  expect(screen.getByLabelText('numéro 19, D. Dorilas, 1 but')).toBeOnTheScreen();
});

test('fiche : des joueurs sans but suffisent pour afficher la section', () => {
  vue('2644292', clubAvecButeurs([{ joueur: 'M. Kobzili', numero: 3, buts: 0 }], []));
  expect(screen.getByText('Match')).toBeOnTheScreen();
  expect(screen.getByText('M. Kobzili')).toBeOnTheScreen();
  screen.unmount();
  vue('2644292', clubAvecButeurs([], [{ joueur: 'S. Nguyen', numero: 12, buts: 0 }]));
  expect(screen.getByText('Match')).toBeOnTheScreen();
  expect(screen.getByText('S. Nguyen')).toBeOnTheScreen();
});

test('fiche : aucune liste, pas de section', () => {
  vue('2644292', clubAvecButeurs([], []));
  expect(screen.queryByText('Match')).toBeNull();
});

test('fiche : un club.json v2 affiche les joueurs du club seuls', () => {
  vue('2644292');
  expect(matchParId(club, '2644292')!.buteurs_adverses).toBeUndefined();
  expect(screen.getByText('Match')).toBeOnTheScreen();
  // nom complet d'un fichier v2, affiché tel quel
  expect(screen.getByText('Diara DORILAS')).toBeOnTheScreen();
  expect(screen.getByText('Clamart')).toBeOnTheScreen();
  // pas de colonne adverse : le nom de l'adversaire n'apparaît que dans le score
  expect(screen.getAllByText('Ent. Suresnes / Nanterre')).toHaveLength(1);
});

test('fiche : Itinéraire, puis Feuille de match et Voir sur ffhandball.fr séparés en bas', () => {
  vue('2644292');
  const libelles = ['Itinéraire', 'Feuille de match', 'Voir sur ffhandball.fr'];
  const boutons = screen.getAllByTestId('button');
  expect(boutons.map((b) => libelles.find((l) => within(b).queryByText(l)))).toEqual(libelles);
  for (const bouton of boutons.slice(1)) {
    expect(contenuDuBouton(bouton).minHeight).toBeGreaterThanOrEqual(48);
  }
});

/** Le bouton Paper qui contient l'élément : ses props (mode, couleurs…). */
function propsDuBouton(element: ReactTestInstance) {
  for (let n: ReactTestInstance | null = element; n; n = n.parent) {
    if (n.type === Button) return n.props;
  }
  throw new Error("L'élément n'est pas dans un bouton Paper");
}

test('match à venir : ajouter à l’agenda', () => {
  const p = vue('2734038');
  expect(screen.getByText('Contre Association Sportive St-Cyr/Fontenay Handball 78')).toBeOnTheScreen();
  expect(screen.getByText('samedi 17 oct. à 18:00')).toBeOnTheScreen();
  fireEvent.press(screen.getByText("Ajouter à l'agenda"));
  expect(p.onAgenda).toHaveBeenCalledWith(expect.objectContaining({ id: '2734038' }));
  expect(screen.queryByText('Feuille de match')).toBeNull();
});

test('match à venir : ajouter à l’agenda en bas, avant Voir sur ffhandball.fr, sans bouton plein rouge', () => {
  vue('2734038');
  const libelles = ['Itinéraire', "Ajouter à l'agenda", 'Voir sur ffhandball.fr'];
  const boutons = screen.getAllByTestId('button');
  expect(boutons.map((b) => libelles.find((l) => within(b).queryByText(l)))).toEqual(libelles);
  const agenda = boutons[1];
  expect(propsDuBouton(agenda).mode).toBe('elevated');
  expect(contenuDuBouton(agenda).minHeight).toBeGreaterThanOrEqual(48);
});

test('match à venir avec feuille de match : agenda, feuille, puis lien', () => {
  const c: Club = {
    ...club,
    equipes: club.equipes.map((e) => ({
      ...e,
      matchs: e.matchs.map((m) => (m.id === '2734038' ? { ...m, feuille_de_match: 'https://example.test/feuille' } : m)),
    })),
  };
  vue('2734038', c);
  const libelles = ['Itinéraire', "Ajouter à l'agenda", 'Feuille de match', 'Voir sur ffhandball.fr'];
  const boutons = screen.getAllByTestId('button');
  expect(boutons.map((b) => libelles.find((l) => within(b).queryByText(l)))).toEqual(libelles);
});

test('match sans date : pas d’ajout à l’agenda', () => {
  const sansDate: Club = {
    ...club,
    equipes: club.equipes.map((e) => ({ ...e, matchs: e.matchs.map((m) => (m.id === '2734038' ? { ...m, date: null } : m)) })),
  };
  vue('2734038', sansDate);
  expect(screen.getByText('Date à venir')).toBeOnTheScreen();
  expect(screen.queryByText("Ajouter à l'agenda")).toBeNull();
});

test('match introuvable', () => {
  const p = vue('0000000');
  expect(screen.getByText('Match introuvable')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Retour'));
  expect(p.onRetour).toHaveBeenCalled();
});

test('fiche match : retour et boutons ont une cible tactile d’au moins 48 dp', () => {
  vue('2644292');
  const retour = StyleSheet.flatten(screen.getByTestId('icon-button-container-outer-layer').props.style);
  expect(retour.width).toBeGreaterThanOrEqual(48);
  expect(retour.height).toBeGreaterThanOrEqual(48);
  const boutons = screen.getAllByTestId('button');
  expect(boutons).toHaveLength(3);
  for (const bouton of boutons) {
    expect(contenuDuBouton(bouton).minHeight).toBeGreaterThanOrEqual(48);
  }
});

test('fiche match à venir : le bouton agenda a une cible tactile d’au moins 48 dp', () => {
  vue('2734038');
  for (const bouton of screen.getAllByTestId('button')) {
    expect(contenuDuBouton(bouton).minHeight).toBeGreaterThanOrEqual(48);
  }
  expect(screen.getAllByTestId('button')).toHaveLength(3);
});

test('fiche match introuvable : le retour a une cible tactile d’au moins 48 dp', () => {
  vue('0000000');
  const style = StyleSheet.flatten(screen.getByTestId('icon-button-container-outer-layer').props.style);
  expect(style.width).toBeGreaterThanOrEqual(48);
  expect(style.height).toBeGreaterThanOrEqual(48);
});

test('adversaire sans écusson : un monogramme décoratif', () => {
  vue('2644292');
  const monogramme = screen.getByTestId('monogramme', { includeHiddenElements: true });
  expect(monogramme.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(screen.getByText('Ent. Suresnes / Nanterre')).toHaveProp('android_hyphenationFrequency', 'none');
});

test('fiche : en-têtes de colonnes N°, Joueur, Buts pour chaque équipe', () => {
  vue('2644292', clubAvecButeurs([{ joueur: 'D. Dorilas', numero: 19, buts: 3 }], [{ joueur: 'S. Nguyen', numero: 12, buts: 0 }]));
  expect(screen.getAllByText('N°', { includeHiddenElements: true })).toHaveLength(2);
  expect(screen.getAllByText('Joueur', { includeHiddenElements: true })).toHaveLength(2);
  expect(screen.getAllByText('Buts', { includeHiddenElements: true })).toHaveLength(2);
  // masqués aux lecteurs d'écran : introuvables par défaut
  expect(screen.queryByText('N°')).toBeNull();
});

test('fiche : le numéro de maillot est affiché, vide s’il est inconnu', () => {
  vue('2644292', clubAvecButeurs([{ joueur: 'D. Dorilas', numero: 41, buts: 3 }, { joueur: 'M. Kobzili', numero: null, buts: 1 }]));
  expect(within(screen.getByLabelText('numéro 41, D. Dorilas, 3 buts')).getByText('41')).toBeOnTheScreen();
  expect(within(screen.getByLabelText('M. Kobzili, 1 but')).getAllByText(/^\d+$/)).toHaveLength(1);
});

test('fiche : libellé d’un joueur sans numéro', () => {
  vue('2644292', clubAvecButeurs([{ joueur: 'D. Dorilas', numero: null, buts: 3 }]));
  expect(screen.getByLabelText('D. Dorilas, 3 buts')).toBeOnTheScreen();
});

/** Le match 2644292 rejoué à domicile ou à l'extérieur, mi-temps 2–11 en notre faveur (nous–eux). */
function clubAvecMiTemps(domicile: boolean): Club {
  return {
    ...club,
    equipes: club.equipes.map((e) => ({
      ...e,
      matchs: e.matchs.map((m) => (m.id === '2644292' ? { ...m, domicile, mt_nous: 2, mt_eux: 11 } : m)),
    })),
  };
}

test('mi-temps à domicile : notre score d’abord, comme le tableau de score', () => {
  vue('2644292', clubAvecMiTemps(true));
  expect(screen.getByText('Mi-temps 2–11')).toBeOnTheScreen();
});

test('mi-temps à l’extérieur : l’adversaire d’abord, comme le tableau de score', () => {
  vue('2644292', clubAvecMiTemps(false));
  expect(screen.getByText('Mi-temps 11–2')).toBeOnTheScreen();
  expect(screen.queryByText('Mi-temps 2–11')).toBeNull();
});
