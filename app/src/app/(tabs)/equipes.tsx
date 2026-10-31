import { useRouter } from 'expo-router';
import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { useOngletAffiche } from '../../composants/useOngletAffiche';
import { useClub } from '../../donnees/requetes';
import { VueEquipes } from '../../ecrans/VueEquipes';
import { useSuivi } from '../../suivi/suivi';

export default function Equipes() {
  const { club, chargement, erreur, rafraichir } = useClub();
  const suivis = useSuivi((s) => s.suivis);
  const basculer = useSuivi((s) => s.basculer);
  const routeur = useRouter();
  // Hors de l'onglet affiché, rien n'est rendu : au retour, la liste repart en haut.
  const affiche = useOngletAffiche();
  if (!affiche) return null;
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return <VueEquipes club={club} suivis={suivis} onBasculer={basculer} onOuvrirEquipe={(id) => routeur.push(`/equipe/${id}`)} />;
}
