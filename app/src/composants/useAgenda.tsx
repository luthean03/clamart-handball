import { useState, type ReactNode } from 'react';
import { Portal, Snackbar } from 'react-native-paper';
import { ouvrirExterne } from '../actions/actions';
import type { MatchAvecEquipe } from '../donnees/types';
import { DECALAGE_BANDEAU } from './commun';
import { PanneauAgenda } from './PanneauAgenda';

interface Cible {
  collectif: string;
  match?: MatchAvecEquipe;
}

/**
 * Panneau « Ajouter à l'agenda » d'un écran : `ouvrir` l'affiche (avec un match : « Ce match » ou la saison ; sans :
 * la saison), `panneau` est à rendre dans l'écran. Si le téléphone ne peut pas ouvrir le lien, un message le dit.
 * `surOnglets` : l'écran est un onglet, le message se pose au-dessus de la barre d'onglets.
 */
export function useAgenda({ surOnglets = false }: { surOnglets?: boolean } = {}): { ouvrir: (collectif: string, match?: MatchAvecEquipe) => void; panneau: ReactNode } {
  // La cible reste en place à la fermeture : le panneau a besoin de son contenu pendant qu'il disparaît.
  const [cible, setCible] = useState<Cible>({ collectif: '' });
  const [visible, setVisible] = useState(false);
  const [echec, setEchec] = useState(false);

  const panneau = (
    <>
      <PanneauAgenda
        visible={visible}
        collectif={cible.collectif}
        match={cible.match}
        onFermer={() => setVisible(false)}
        onOuvrir={(url) => {
          setVisible(false);
          ouvrirExterne(url).catch(() => setEchec(true));
        }}
      />
      <Portal>
        <Snackbar visible={echec} onDismiss={() => setEchec(false)} duration={4000} wrapperStyle={surOnglets ? DECALAGE_BANDEAU : undefined}>
          Impossible d'ouvrir l'agenda
        </Snackbar>
      </Portal>
    </>
  );
  return {
    ouvrir: (collectif, match) => {
      setCible({ collectif, match });
      setVisible(true);
    },
    panneau,
  };
}
