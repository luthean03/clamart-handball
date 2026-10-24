import { useRouter } from 'expo-router';
import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { useMaintenant } from '../../donnees/maintenant';
import { useClub } from '../../donnees/requetes';
import { VueMatchs } from '../../ecrans/VueMatchs';
import { routeMatch } from '../../notifications/liens';
import { useSuivi } from '../../suivi/suivi';

export default function Matchs() {
  const { club, chargement, erreur, rafraichir, rafraichissement } = useClub();
  const maintenant = useMaintenant();
  const suivis = useSuivi((s) => s.suivis);
  const routeur = useRouter();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <VueMatchs
      club={club}
      maintenant={maintenant}
      suivis={suivis}
      onOuvrirMatch={(id, equipe) => routeur.push(routeMatch(id, equipe) as never)}
      rafraichir={rafraichir}
      rafraichissement={rafraichissement}
    />
  );
}
