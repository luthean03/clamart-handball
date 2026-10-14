import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ouvrirLien } from '../actions/actions';
import { EtatSansDonnees } from '../composants/EtatSansDonnees';
import { useMaintenant } from '../donnees/maintenant';
import { useClub } from '../donnees/requetes';
import { VueReglages } from '../ecrans/VueReglages';
import { useSuivi } from '../suivi/suivi';

/** L'ouverture du lien rend une promesse : un refus (pas de navigateur) ne doit jamais devenir une rejection non gérée. */
const sansRejet = (action: () => Promise<unknown>) => {
  action().catch(() => {});
};

export default function Reglages() {
  const { club, chargement, erreur, rafraichir } = useClub();
  const maintenant = useMaintenant();
  const suivis = useSuivi((s) => s.suivis);
  const retires = useSuivi((s) => s.retires);
  const { basculer, effacerRetires } = useSuivi.getState();
  const routeur = useRouter();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <VueReglages
      club={club}
      maintenant={maintenant}
      suivis={suivis}
      retires={retires}
      version={Constants.expoConfig?.version ?? ''}
      onRetirer={basculer}
      onGererEquipes={() => routeur.push('/equipes')}
      onEffacerRetires={effacerRetires}
      onOuvrirLien={(url) => sansRejet(() => ouvrirLien(url))}
      onRetour={() => (routeur.canGoBack() ? routeur.back() : routeur.replace('/'))}
    />
  );
}
