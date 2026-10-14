import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { useClub } from '../../donnees/requetes';
import { VueButeurs } from '../../ecrans/VueButeurs';

export default function Buteurs() {
  const { club, chargement, erreur, rafraichir } = useClub();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return <VueButeurs club={club} />;
}
