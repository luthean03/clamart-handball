import { useRouter } from 'expo-router';
import { ajouterAgenda } from '../../actions/actions';
import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { useMaintenant } from '../../donnees/maintenant';
import { useClub } from '../../donnees/requetes';
import { VueAccueil } from '../../ecrans/VueAccueil';
import { useSuivi } from '../../suivi/suivi';

export default function Accueil() {
  const { club, chargement, erreur, horsLigne, rafraichir, rafraichissement } = useClub();
  const maintenant = useMaintenant();
  const suivis = useSuivi((s) => s.suivis);
  const routeur = useRouter();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <VueAccueil
      club={club}
      maintenant={maintenant}
      suivis={suivis}
      horsLigne={horsLigne}
      rafraichissement={rafraichissement}
      rafraichir={rafraichir}
      onOuvrirEquipe={(id) => routeur.push(`/equipe/${id}`)}
      onOuvrirMatch={(id) => routeur.push(`/match/${id}`)}
      onAgenda={ajouterAgenda}
      onReglages={() => routeur.push('/reglages')}
      onChoisirEquipes={() => routeur.push('/gerer-equipes')}
    />
  );
}
