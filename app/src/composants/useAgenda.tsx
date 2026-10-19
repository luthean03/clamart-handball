import { useState, type ReactNode } from 'react';
import { Portal, Snackbar } from 'react-native-paper';
import { ouvrirExterne } from '../actions/actions';
import { competitionsDuCollectif, type Appli, type Competition } from '../actions/agenda';
import type { Club, MatchAvecEquipe } from '../donnees/types';
import { DECALAGE_BANDEAU } from './commun';
import { DialogueCompetitions } from './DialogueCompetitions';
import { PanneauAgenda } from './PanneauAgenda';

interface Cible {
  collectif: string;
  clubId: string;
  competitions: Competition[];
  match?: MatchAvecEquipe;
}

/**
 * Panneau « Ajouter à l'agenda » d'un écran : `ouvrir` l'affiche (avec un match : « Ce match » ou la saison ; sans :
 * la saison), `panneau` est à rendre dans l'écran. La saison abonne les calendriers officiels FFHB des compétitions du
 * collectif, au choix quand il y en a plusieurs. Si le téléphone ne peut pas ouvrir le lien, un message le dit.
 * `surOnglets` : l'écran est un onglet, le message se pose au-dessus de la barre d'onglets.
 */
export function useAgenda({ surOnglets = false }: { surOnglets?: boolean } = {}): { ouvrir: (club: Club, collectifId: string, match?: MatchAvecEquipe) => void; panneau: ReactNode } {
  // La cible reste en place à la fermeture : le panneau a besoin de son contenu pendant qu'il disparaît.
  const [cible, setCible] = useState<Cible>({ collectif: '', clubId: '', competitions: [] });
  const [visible, setVisible] = useState(false);
  const [appli, setAppli] = useState<Appli>('ics');
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  // Chaque ouverture du dialogue repart d'un état neuf (tout coché, rien d'ajouté).
  const [ouverture, setOuverture] = useState(0);
  const [echec, setEchec] = useState(false);

  /** Vaut `false` (et affiche le message) si le téléphone ne peut pas ouvrir le lien. */
  const ouvrirLien = (url: string) =>
    ouvrirExterne(url).then(
      () => true,
      () => {
        setEchec(true);
        return false;
      },
    );

  const panneau = (
    <>
      <PanneauAgenda
        visible={visible}
        competitions={cible.competitions}
        clubId={cible.clubId}
        match={cible.match}
        onFermer={() => setVisible(false)}
        onOuvrir={(url) => {
          setVisible(false);
          void ouvrirLien(url);
        }}
        onChoisir={(a) => {
          setVisible(false);
          setAppli(a);
          setOuverture((n) => n + 1);
          setDialogueOuvert(true);
        }}
      />
      <DialogueCompetitions
        key={ouverture}
        visible={dialogueOuvert}
        collectif={cible.collectif}
        appli={appli}
        competitions={cible.competitions}
        clubId={cible.clubId}
        onOuvrir={ouvrirLien}
        onFermer={() => setDialogueOuvert(false)}
      />
      <Portal>
        <Snackbar visible={echec} onDismiss={() => setEchec(false)} duration={4000} wrapperStyle={surOnglets ? DECALAGE_BANDEAU : undefined}>
          Impossible d'ouvrir l'agenda
        </Snackbar>
      </Portal>
    </>
  );
  return {
    ouvrir: (club, collectifId, match) => {
      setCible({
        collectif: club.collectifs.find((c) => c.id === collectifId)?.nom ?? '',
        clubId: club.club.id_ffhb,
        competitions: competitionsDuCollectif(club, collectifId),
        match,
      });
      setVisible(true);
    },
    panneau,
  };
}
