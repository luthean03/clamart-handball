import { useRouter } from 'expo-router';
import { EtatSansDonnees } from '../composants/EtatSansDonnees';
import { useClub } from '../donnees/requetes';
import { VueBienvenue } from '../ecrans/VueBienvenue';
import { useSuivi } from '../suivi/suivi';

export default function Bienvenue() {
  const { club, chargement, erreur, rafraichir } = useClub();
  const routeur = useRouter();
  const { definirSuivis, terminerBienvenue } = useSuivi.getState();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  const terminer = (ids: string[]) => {
    definirSuivis(ids);
    terminerBienvenue();
    routeur.replace('/');
  };
  return <VueBienvenue club={club} onTerminer={terminer} onPasser={() => terminer([])} />;
}
